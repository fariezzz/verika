// packages/service-nilai/src/server.js
// Service Nilai & Kelas (Port 3001) - Resource Service dalam arsitektur Zero Trust

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
const PORT = parseInt(process.env.NILAI_PORT || '3001', 10);
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const CLIENT_ID = process.env.SERVICE_NILAI_CLIENT_ID || 'service-nilai-unsil';
const CLIENT_SECRET = process.env.SERVICE_NILAI_CLIENT_SECRET || 'svc_nilai_secret_key_9876543210';

app.use(cors());
app.use(express.json());

// Terapkan perlindungan Defense-in-Depth (X-Gateway-Secret + JWT verification) pada seluruh rute
app.use(verifyServiceGuard);

/**
 * Konversi nilai angka ke huruf mutu dan bobot akademik standar UNSIL
 */
function calculateGrade(score) {
  const num = Number(score);
  if (num >= 85) return { huruf: 'A', bobot: 4.00 };
  if (num >= 80) return { huruf: 'A-', bobot: 3.75 };
  if (num >= 75) return { huruf: 'B+', bobot: 3.50 };
  if (num >= 70) return { huruf: 'B', bobot: 3.00 };
  if (num >= 65) return { huruf: 'B-', bobot: 2.75 };
  if (num >= 60) return { huruf: 'C+', bobot: 2.50 };
  if (num >= 55) return { huruf: 'C', bobot: 2.00 };
  if (num >= 40) return { huruf: 'D', bobot: 1.00 };
  return { huruf: 'E', bobot: 0.00 };
}

/**
 * GET /nilai
 * Mahasiswa: Hanya melihat nilai miliknya sendiri
 * Dosen: Hanya melihat nilai kelas yang diampunya
 */
app.get('/nilai', async (req, res) => {
  const user = req.user;

  try {
    if (user.role === 'mahasiswa') {
      const studentGrades = await query(
        `SELECT n.id, n.class_id, n.nilai_angka, n.nilai_huruf, n.bobot, n.is_final, n.updated_at,
                c.kode_mk, c.nama_mk, c.sks, c.semester, c.kelas,
                u.nama AS dosen_pengampu
         FROM nilai n
         JOIN classes c ON n.class_id = c.id
         JOIN users u ON c.dosen_id = u.id
         WHERE n.student_id = ?
         ORDER BY c.semester DESC, c.kode_mk ASC`,
        [user.sub]
      );
      return res.json({ data: studentGrades });
    }

    if (user.role === 'dosen') {
      // Ambil daftar kelas yang diampu dosen
      const classes = await query(
        `SELECT id, kode_mk, nama_mk, sks, semester, kelas, is_finalized, finalized_at, sync_status, sync_message
         FROM classes
         WHERE dosen_id = ?
         ORDER BY semester DESC, kode_mk ASC`,
        [user.sub]
      );

      // Ambil detail nilai mahasiswa untuk setiap kelas
      const classIds = classes.map((c) => c.id);
      let gradesByClass = [];
      if (classIds.length > 0) {
        gradesByClass = await query(
          `SELECT n.id, n.class_id, n.student_id, n.nilai_angka, n.nilai_huruf, n.bobot, n.is_final, n.updated_at,
                  u.nama AS nama_mahasiswa, u.identifier AS nim, u.email
           FROM nilai n
           JOIN users u ON n.student_id = u.id
           WHERE n.class_id IN (?)
           ORDER BY u.identifier ASC`,
          [classIds]
        );
      }

      const structuredClasses = classes.map((cls) => ({
        ...cls,
        peserta: gradesByClass.filter((g) => g.class_id === cls.id)
      }));

      return res.json({ data: structuredClasses });
    }

    return res.status(403).json({ error: 'Role tidak diizinkan mengakses data nilai' });
  } catch (err) {
    console.error('[SERVICE NILAI ERROR] Gagal mengambil data nilai:', err);
    return res.status(500).json({ error: 'Gagal mengambil data nilai dari basis data' });
  }
});

/**
 * PUT /nilai/:id
 * Dosen mengubah nilai mahasiswa pada kelas yang diampunya (belum final)
 */
app.put('/nilai/:id', async (req, res) => {
  const nilaiId = req.params.id;
  const { nilai_angka } = req.body;

  if (nilai_angka === undefined || nilai_angka === null || isNaN(Number(nilai_angka))) {
    return res.status(400).json({ error: 'Nilai angka valid (0-100) wajib disertakan' });
  }

  const numScore = parseFloat(nilai_angka);
  if (numScore < 0 || numScore > 100) {
    return res.status(400).json({ error: 'Nilai angka harus berada dalam rentang 0 sampai 100' });
  }

  const { huruf, bobot } = calculateGrade(numScore);

  try {
    // Verifikasi kembali status finalitas di basis data (defense in depth)
    const checkRows = await query(
      `SELECT n.id, n.is_final, c.dosen_id, c.is_finalized
       FROM nilai n
       JOIN classes c ON n.class_id = c.id
       WHERE n.id = ?`,
      [nilaiId]
    );

    if (!checkRows || checkRows.length === 0) {
      return res.status(404).json({ error: 'Data nilai tidak ditemukan' });
    }

    const row = checkRows[0];
    if (row.is_final || row.is_finalized) {
      return res.status(403).json({ error: 'Nilai ini telah berstatus final dan tidak dapat diperbarui' });
    }

    if (row.dosen_id !== req.user.sub) {
      return res.status(403).json({ error: 'Anda bukan dosen pengampu untuk kelas mata kuliah ini' });
    }

    await execute(
      `UPDATE nilai SET nilai_angka = ?, nilai_huruf = ?, bobot = ? WHERE id = ?`,
      [numScore, huruf, bobot, nilaiId]
    );

    const [updatedRow] = await query(`SELECT * FROM nilai WHERE id = ?`, [nilaiId]);

    return res.json({
      message: 'Nilai mahasiswa berhasil diperbarui',
      data: updatedRow
    });
  } catch (err) {
    console.error('[SERVICE NILAI ERROR] Gagal memperbarui nilai:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan sistem saat memperbarui nilai' });
  }
});

/**
 * POST /kelas/:id/finalisasi
 * Dosen memfinalisasi seluruh nilai pada kelas, lalu memicu sinkronisasi transkrip melalui Gateway
 */
app.post('/kelas/:id/finalisasi', async (req, res) => {
  const classId = req.params.id;

  try {
    const classRows = await query(
      `SELECT id, kode_mk, nama_mk, sks, semester, dosen_id, is_finalized FROM classes WHERE id = ?`,
      [classId]
    );

    if (!classRows || classRows.length === 0) {
      return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    }

    const cls = classRows[0];
    if (cls.dosen_id !== req.user.sub) {
      return res.status(403).json({ error: 'Hanya dosen pengampu yang berhak memfinalisasi kelas ini' });
    }

    if (cls.is_finalized) {
      return res.status(400).json({ error: 'Kelas ini sudah difinalisasi sebelumnya' });
    }

    // 1. Kunci nilai menjadi status final di basis data
    await execute(
      `UPDATE classes SET is_finalized = 1, finalized_at = NOW(), sync_status = 'pending' WHERE id = ?`,
      [classId]
    );
    await execute(`UPDATE nilai SET is_final = 1 WHERE class_id = ?`, [classId]);

    // 2. Ambil data nilai yang telah final untuk disinkronkan ke Service Transkrip
    const gradeItems = await query(
      `SELECT n.student_id, u.identifier AS nim, c.kode_mk, c.nama_mk, c.sks,
              n.nilai_huruf, n.bobot, (c.sks * n.bobot) AS mutu, c.semester
       FROM nilai n
       JOIN classes c ON n.class_id = c.id
       JOIN users u ON n.student_id = u.id
       WHERE c.id = ?`,
      [classId]
    );

    console.log(`[FINALISASI NILAI] Mengumpulkan ${gradeItems.length} item nilai final untuk disinkronkan...`);

    // 3. Alur Zero Trust: Meminta Service Token ke Gateway (bukan token user)
    let serviceToken;
    try {
      const authServiceResp = await fetch(`${GATEWAY_URL}/auth/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET
        })
      });

      if (!authServiceResp.ok) {
        const errBody = await authServiceResp.text();
        throw new Error(`Gateway menolak penerbitan service token (${authServiceResp.status}): ${errBody}`);
      }

      const authData = await authServiceResp.json();
      serviceToken = authData.accessToken;
      console.log(`[SERVICE NILAI] Berhasil memperoleh service token dari Gateway.`);
    } catch (authErr) {
      await execute(
        `UPDATE classes SET sync_status = 'failed', sync_message = ? WHERE id = ?`,
        [`Gagal memperoleh service token: ${authErr.message}`, classId]
      );
      return res.status(500).json({
        error: 'Finalisasi berhasil namun sinkronisasi gagal karena tidak dapat memperoleh service token',
        details: authErr.message
      });
    }

    // 4. Panggil endpoint sinkronisasi transkrip melalui Gateway
    try {
      const syncResp = await fetch(`${GATEWAY_URL}/transkrip/sinkron`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceToken}`
        },
        body: JSON.stringify({
          class_id: classId,
          items: gradeItems
        })
      });

      if (!syncResp.ok) {
        const syncErr = await syncResp.text();
        throw new Error(`Sinkronisasi ditolak oleh Service Transkrip (${syncResp.status}): ${syncErr}`);
      }

      const syncResult = await syncResp.json();

      // Catat status sinkronisasi sukses
      await execute(
        `UPDATE classes SET sync_status = 'synced', sync_message = ? WHERE id = ?`,
        [`Sinkronisasi berhasil: ${syncResult.syncedCount || gradeItems.length} record disinkronkan`, classId]
      );

      console.log(`[SERVICE NILAI] Sinkronisasi kelas ID ${classId} ke Service Transkrip selesai.`);

      return res.json({
        message: 'Kelas berhasil difinalisasi dan seluruh nilai telah disinkronkan ke transkrip mahasiswa',
        class_id: classId,
        sync_status: 'synced',
        synced_count: gradeItems.length
      });
    } catch (syncErr) {
      console.error('[SERVICE NILAI] Gagal saat sinkronisasi transkrip:', syncErr);
      await execute(
        `UPDATE classes SET sync_status = 'failed', sync_message = ? WHERE id = ?`,
        [syncErr.message, classId]
      );

      return res.status(502).json({
        message: 'Kelas difinalisasi tetapi sinkronisasi ke Service Transkrip mengalami kegagalan',
        sync_status: 'failed',
        error: syncErr.message
      });
    }
  } catch (err) {
    console.error('[SERVICE NILAI ERROR] Gagal memfinalisasi kelas:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan sistem saat finalisasi kelas' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SERVICE NILAI] Aktif di http://localhost:${PORT}`);
  });
}

export default app;
