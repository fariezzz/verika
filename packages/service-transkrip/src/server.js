// packages/service-transkrip/src/server.js
// Service Transkrip Mahasiswa (Port 3002) - Resource Service dalam arsitektur Zero Trust

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, execute } from '@zero-trust/shared';
import { verifyServiceGuard } from './middleware/verify-service-guard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = parseInt(process.env.TRANSKRIP_PORT || '3002', 10);

app.use(cors());
app.use(express.json());

// Terapkan perlindungan Defense-in-Depth (X-Gateway-Secret + JWT verification) pada seluruh rute
app.use(verifyServiceGuard);

/**
 * GET /transkrip/:nim
 * Mahasiswa: Hanya dapat melihat transkrip dengan NIM miliknya
 * Admin: Dapat melihat transkrip seluruh mahasiswa
 */
app.get('/transkrip/:nim', async (req, res) => {
  const user = req.user;
  const requestedNim = req.params.nim;

  // Verifikasi otorisasi di level service (Defense in Depth)
  if (user.role === 'mahasiswa' && user.identifier !== requestedNim) {
    return res.status(403).json({
      error: 'Akses ditolak: Mahasiswa tidak diizinkan mengakses transkrip mahasiswa lain'
    });
  }

  if (user.role !== 'admin' && user.role !== 'mahasiswa') {
    return res.status(403).json({
      error: 'Role Anda tidak memiliki izin mengakses data transkrip'
    });
  }

  try {
    // Ambil data profil mahasiswa
    const studentRows = await query(
      `SELECT id, username, nama, identifier AS nim, email FROM users WHERE identifier = ? AND role = 'mahasiswa'`,
      [requestedNim]
    );

    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({ error: `Mahasiswa dengan NIM '${requestedNim}' tidak ditemukan` });
    }

    const student = studentRows[0];

    // Ambil seluruh mata kuliah transkrip
    const items = await query(
      `SELECT id, kode_mk, nama_mk, sks, nilai_huruf, bobot, mutu, semester, synced_at
       FROM transkrip
       WHERE student_id = ?
       ORDER BY semester DESC, kode_mk ASC`,
      [student.id]
    );

    // Hitung ringkasan akademik kumulatif
    let totalSks = 0;
    let totalMutu = 0;
    const semestersMap = {};

    for (const item of items) {
      totalSks += item.sks;
      totalMutu += parseFloat(item.mutu);

      if (!semestersMap[item.semester]) {
        semestersMap[item.semester] = {
          semester: item.semester,
          sks: 0,
          mutu: 0,
          mata_kuliah: []
        };
      }
      semestersMap[item.semester].sks += item.sks;
      semestersMap[item.semester].mutu += parseFloat(item.mutu);
      semestersMap[item.semester].mata_kuliah.push(item);
    }

    const ipk = totalSks > 0 ? (totalMutu / totalSks).toFixed(2) : '0.00';

    const semesterList = Object.values(semestersMap).map((sem) => ({
      ...sem,
      ips: sem.sks > 0 ? (sem.mutu / sem.sks).toFixed(2) : '0.00'
    }));

    return res.json({
      mahasiswa: student,
      ringkasan: {
        total_sks: totalSks,
        total_mutu: totalMutu.toFixed(2),
        ipk: ipk,
        total_semester: semesterList.length
      },
      semesters: semesterList,
      raw_items: items
    });
  } catch (err) {
    console.error('[SERVICE TRANSKRIP ERROR] Gagal mengambil transkrip:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan sistem saat mengambil data transkrip' });
  }
});

/**
 * POST /transkrip/sinkron
 * Endpoint sinkronisasi antarlayanan khusus dipanggil oleh Service Nilai menggunakan token service.
 * Menolak keras segala jenis token pengguna (mahasiswa, dosen, admin).
 */
app.post('/transkrip/sinkron', async (req, res) => {
  const user = req.user;

  // Zero Trust Assume Breach: Verifikasi tipe dan role token secara ketat
  if (!user || user.role !== 'service' || user.token_type !== 'service') {
    console.warn(`[UNAUTHORIZED SYNC ATTEMPT] Request sinkronisasi ditolak: caller memiliki role '${user?.role}'`);
    return res.status(403).json({
      error: 'Akses ditolak: Endpoint sinkronisasi transkrip HANYA dapat diakses menggunakan Service Token yang sah.'
    });
  }

  const { class_id, items } = req.body || {};

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Payload sinkronisasi harus menyertakan array data items' });
  }

  console.log(`[SERVICE TRANSKRIP] Menerima request sinkronisasi untuk Kelas ID ${class_id} (${items.length} record)...`);

  try {
    let syncedCount = 0;
    for (const item of items) {
      const studentId = item.student_id;
      const nim = item.nim;
      const kodeMk = item.kode_mk;
      const namaMk = item.nama_mk;
      const sks = parseInt(item.sks, 10);
      const nilaiHuruf = item.nilai_huruf;
      const bobot = parseFloat(item.bobot);
      const mutu = parseFloat(item.mutu || (sks * bobot));
      const semester = item.semester;

      await execute(
        `INSERT INTO transkrip (student_id, nim, kode_mk, nama_mk, sks, nilai_huruf, bobot, mutu, semester, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           nilai_huruf = VALUES(nilai_huruf),
           bobot = VALUES(bobot),
           mutu = VALUES(mutu),
           semester = VALUES(semester),
           synced_at = NOW()`,
        [studentId, nim, kodeMk, namaMk, sks, nilaiHuruf, bobot, mutu, semester]
      );
      syncedCount++;
    }

    console.log(`[SERVICE TRANSKRIP] Berhasil menyinkronkan ${syncedCount} record nilai ke transkrip.`);

    return res.json({
      message: 'Sinkronisasi nilai ke transkrip akademik berhasil diproses',
      class_id,
      syncedCount
    });
  } catch (err) {
    console.error('[SERVICE TRANSKRIP ERROR] Gagal menyinkronkan data transkrip:', err);
    return res.status(500).json({
      error: 'Gagal melakukan pembaruan transkrip di basis data',
      details: err.message
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SERVICE TRANSKRIP] Aktif di http://localhost:${PORT}`);
  });
}

export default app;
