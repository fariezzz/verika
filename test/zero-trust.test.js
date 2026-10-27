// test/zero-trust.test.js
// Automated Test Suite Sistem Nilai Akademik Berbasis Zero Trust (NIST SP 800-207)
// Menguji 17 Skenario Wajib Menggunakan node:test

process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import gatewayApp from '../packages/gateway/src/server.js';
import nilaiApp from '../packages/service-nilai/src/server.js';
import transkripApp from '../packages/service-transkrip/src/server.js';
import { setMockTime, clearMockTime, closePool, query } from '@zero-trust/shared';

const GATEWAY_PORT = 3000;
const NILAI_PORT = 3001;
const TRANSKRIP_PORT = 3002;
const BASE_URL = `http://127.0.0.1:${GATEWAY_PORT}`;
const NILAI_URL = `http://127.0.0.1:${NILAI_PORT}`;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'gw_secret_internal_zero_trust_verika_2026';

let serverGateway;
let serverNilai;
let serverTranskrip;

// Token dan sesi yang akan digunakan pada berbagai skenario
let tokenMahasiswa1 = '';
let tokenMahasiswa2 = '';
let tokenDosenAlam = '';
let tokenDosenAradea = '';
let tokenDosenRandi = '';
let tokenAdmin = '';
let tokenService = '';
let refreshTokenMahasiswa1 = '';

before(async () => {
  // Periksa apakah service backend sudah berjalan di port masing-masing
  const isPortInUse = (port) => {
    return new Promise((resolve) => {
      const tester = http.createServer()
        .once('error', () => resolve(true))
        .once('listening', () => {
          tester.close(() => resolve(false));
        })
        .listen(port, '127.0.0.1');
    });
  };

  const nilaiBusy = await isPortInUse(NILAI_PORT);
  if (!nilaiBusy) {
    serverNilai = http.createServer(nilaiApp);
    await new Promise((resolve) => serverNilai.listen(NILAI_PORT, '127.0.0.1', resolve));
  }

  const transkripBusy = await isPortInUse(TRANSKRIP_PORT);
  if (!transkripBusy) {
    serverTranskrip = http.createServer(transkripApp);
    await new Promise((resolve) => serverTranskrip.listen(TRANSKRIP_PORT, '127.0.0.1', resolve));
  }

  const gatewayBusy = await isPortInUse(GATEWAY_PORT);
  if (!gatewayBusy) {
    serverGateway = http.createServer(gatewayApp);
    await new Promise((resolve) => serverGateway.listen(GATEWAY_PORT, '127.0.0.1', resolve));
  }

  // Pastikan jam akses dalam rentang yang diizinkan untuk setup awal (10:00 WIB)
  setMockTime('2026-10-22T10:00:00+07:00');
});

after(async () => {
  clearMockTime();
  if (serverGateway) await new Promise((resolve) => serverGateway.close(resolve));
  if (serverNilai) await new Promise((resolve) => serverNilai.close(resolve));
  if (serverTranskrip) await new Promise((resolve) => serverTranskrip.close(resolve));
  await closePool();
  process.exit(0);
});

describe('Zero Trust Security - 17 Skenario Pengujian Wajib', () => {

  // Skenario 1: Login dengan kredensial valid dan device terdaftar berhasil
  test('1. Login dengan kredensial valid dan Device ID terdaftar berhasil', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': 'DEV-MHS-001'
      },
      body: JSON.stringify({
        username: '247006111146',
        password: 'password123'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.accessToken, 'Harus menerbitkan access token');
    assert.ok(data.refreshToken, 'Harus menerbitkan refresh token');
    assert.equal(data.user.role, 'mahasiswa');
    assert.equal(data.user.identifier, '247006111146');

    tokenMahasiswa1 = data.accessToken;
    refreshTokenMahasiswa1 = data.refreshToken;

    // Login user lain untuk pengujian skenario selanjutnya
    const resMhs2 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-MHS-002' },
      body: JSON.stringify({ username: '247006111147', password: 'password123' })
    });
    tokenMahasiswa2 = (await resMhs2.json()).accessToken;

    // Dosen Alam (Keamanan Informasi)
    const resDsnAlam = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-DSN-001' },
      body: JSON.stringify({ username: 'dosen_alam', password: 'password123' })
    });
    tokenDosenAlam = (await resDsnAlam.json()).accessToken;

    // Dosen Aradea (Inteligensi Artifisial)
    const resDsnAradea = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-DSN-002' },
      body: JSON.stringify({ username: 'dosen_aradea', password: 'password123' })
    });
    tokenDosenAradea = (await resDsnAradea.json()).accessToken;

    // Dosen Randi (Komputasi Paralel dan Terdistribusi)
    const resDsnRandi = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-DSN-003' },
      body: JSON.stringify({ username: 'dosen_randi', password: 'password123' })
    });
    tokenDosenRandi = (await resDsnRandi.json()).accessToken;

    // Admin
    const resAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-ADM-001' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    tokenAdmin = (await resAdmin.json()).accessToken;
  });

  // Skenario 2: Login dengan password salah ditolak
  test('2. Login dengan password salah ditolak (401 Unauthorized)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-MHS-001' },
      body: JSON.stringify({
        username: '247006111146',
        password: 'password_salah_123'
      })
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /tidak valid/i);
  });

  // Skenario 3: Login dengan Device ID yang tidak terdaftar ditolak
  test('3. Login dengan Device ID yang tidak terdaftar ditolak (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-UNKNOWN-999' },
      body: JSON.stringify({
        username: '247006111146',
        password: 'password123'
      })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /tidak terdaftar/i);
  });

  // Skenario 4: Access token kedaluwarsa atau tidak valid ditolak
  test('4. Access token kedaluwarsa atau signature palsu ditolak (401 Unauthorized)', async () => {
    // Buat token palsu dengan secret yang salah
    const fakeToken = jwt.sign({ sub: 1, role: 'admin' }, 'secret_palsu_bukan_verika');

    const res = await fetch(`${BASE_URL}/nilai`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${fakeToken}`,
        'X-Device-ID': 'DEV-MHS-001'
      }
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /token/i);
  });

  // Skenario 5: Refresh token yang dicabut ditolak
  test('5. Refresh token yang dicabut saat logout ditolak (401 Unauthorized)', async () => {
    // Lakukan logout untuk mencabut refresh token
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenMahasiswa1}`,
        'X-Device-ID': 'DEV-MHS-001'
      },
      body: JSON.stringify({ refreshToken: refreshTokenMahasiswa1 })
    });
    assert.equal(logoutRes.status, 200);

    // Coba gunakan kembali refresh token yang telah dicabut
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': 'DEV-MHS-001'
      },
      body: JSON.stringify({ refreshToken: refreshTokenMahasiswa1 })
    });

    assert.equal(refreshRes.status, 401);
    const data = await refreshRes.json();
    assert.match(data.error, /dicabut|tidak valid/i);
  });

  // Skenario 6: Mahasiswa dapat membaca nilai miliknya
  test('6. Mahasiswa dapat membaca nilai miliknya sendiri', async () => {
    const res = await fetch(`${BASE_URL}/nilai`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenMahasiswa1}`,
        'X-Device-ID': 'DEV-MHS-001'
      }
    });

    assert.equal(res.status, 200);
    const result = await res.json();
    assert.ok(Array.isArray(result.data), 'Harus mengembalikan daftar nilai');
    assert.ok(result.data.length > 0, 'Mahasiswa 1 harus memiliki nilai terdaftar');
  });

  // Skenario 7: Mahasiswa tidak dapat membaca nilai/transkrip mahasiswa lain
  test('7. Mahasiswa dilarang membaca transkrip milik mahasiswa lain (Least Privilege)', async () => {
    // Mahasiswa 1 (NIM 247006111146) mencoba meminta transkrip Mahasiswa 2 (NIM 247006111147)
    const res = await fetch(`${BASE_URL}/transkrip/247006111147`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenMahasiswa1}`,
        'X-Device-ID': 'DEV-MHS-001'
      }
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /Least Privilege|miliknya sendiri|dilarang/i);
  });

  // Skenario 8: Dosen dapat mengakses nilai kelas yang diampunya
  test('8. Dosen dapat mengakses nilai kelas yang diampunya', async () => {
    // Dosen Alam mengampu kelas Keamanan Informasi (KP70065004)
    const res = await fetch(`${BASE_URL}/nilai`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenDosenAlam}`,
        'X-Device-ID': 'DEV-DSN-001'
      }
    });

    assert.equal(res.status, 200);
    const result = await res.json();
    assert.ok(Array.isArray(result.data));
    const assignedClass = result.data.find((c) => c.kode_mk === 'KP70065004');
    assert.ok(assignedClass, 'Dosen Alam harus dapat melihat kelas Keamanan Informasi (KP70065004)');
    assert.ok(assignedClass.peserta.length > 0, 'Daftar mahasiswa peserta kelas harus tampil');
  });

  // Skenario 9: Dosen ditolak saat mencoba mengubah nilai di kelas dosen lain
  test('9. Dosen ditolak saat mencoba mengubah nilai di kelas dosen lain (403 Forbidden)', async () => {
    // Kelas 2 (KP70065001 - Inteligensi Artifisial) diampu oleh Dosen Aradea.
    // Ambil nilai ID yang ada di kelas 2
    const gradeRows = await query(
      `SELECT n.id FROM nilai n JOIN classes c ON n.class_id = c.id WHERE c.kode_mk = 'KP70065001' LIMIT 1`
    );
    const targetGradeId = gradeRows[0].id;

    // Dosen Alam mencoba mengedit nilai pada kelas Dosen Aradea
    const res = await fetch(`${BASE_URL}/nilai/${targetGradeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDosenAlam}`,
        'X-Device-ID': 'DEV-DSN-001'
      },
      body: JSON.stringify({ nilai_angka: 95.0 })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /tidak mengampu|Least Privilege/i);
  });

  // Skenario 10: Dosen ditolak saat mengubah nilai yang sudah final
  test('10. Dosen ditolak saat mengubah nilai yang sudah berstatus final (403 Forbidden)', async () => {
    // Cari nilai yang sudah final milik Dosen Randi (Kelas Historis Pemrograman Web - IF70063004)
    const finalizedGradeRows = await query(
      `SELECT n.id FROM nilai n JOIN classes c ON n.class_id = c.id WHERE n.is_final = 1 AND c.dosen_id = (SELECT id FROM users WHERE username = 'dosen_randi') LIMIT 1`
    );
    const finalizedGradeId = finalizedGradeRows[0].id;

    // Dosen Randi (pengampu) mencoba mengedit nilai yang sudah final
    const res = await fetch(`${BASE_URL}/nilai/${finalizedGradeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDosenRandi}`,
        'X-Device-ID': 'DEV-DSN-003'
      },
      body: JSON.stringify({ nilai_angka: 99.0 })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /final/i);
  });

  // Skenario 11: Perubahan atau finalisasi di luar jam akses ditolak
  test('11. Perubahan atau finalisasi di luar jam akses (07:00-21:00 WIB) ditolak (403 Forbidden)', async () => {
    // Suntikkan waktu jam 02:00 dini hari WIB (di luar jam akses 07:00 - 21:00)
    setMockTime('2026-10-22T02:00:00+07:00');

    // Ambil kelas milik Dosen Alam yang belum final (Keamanan Informasi)
    const unfinalizedGradeRows = await query(
      `SELECT n.id FROM nilai n JOIN classes c ON n.class_id = c.id WHERE c.kode_mk = 'KP70065004' AND n.is_final = 0 LIMIT 1`
    );
    const targetGradeId = unfinalizedGradeRows[0].id;

    const res = await fetch(`${BASE_URL}/nilai/${targetGradeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDosenAlam}`,
        'X-Device-ID': 'DEV-DSN-001'
      },
      body: JSON.stringify({ nilai_angka: 89.0 })
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /jam operasional|jam akses/i);

    // Kembalikan waktu ke jam operasional normal (14:00 WIB)
    setMockTime('2026-10-22T14:00:00+07:00');
  });

  // Skenario 12: Finalisasi dalam kondisi sah memicu sinkronisasi transkrip
  test('12. Finalisasi kelas oleh dosen sah memicu sinkronisasi ke Service Transkrip', async () => {
    // Ambil ID kelas Keamanan Informasi milik Dosen Alam
    const classRows = await query(
      `SELECT id FROM classes WHERE kode_mk = 'KP70065004' AND is_finalized = 0`
    );
    assert.ok(classRows.length > 0, 'Harus ada kelas yang belum final untuk diuji');
    const classId = classRows[0].id;

    const res = await fetch(`${BASE_URL}/kelas/${classId}/finalisasi`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenDosenAlam}`,
        'X-Device-ID': 'DEV-DSN-001'
      }
    });

    assert.equal(res.status, 200);
    const result = await res.json();
    assert.equal(result.sync_status, 'synced');
    assert.ok(result.synced_count > 0);

    // Verifikasi di database bahwa nilai kelas masuk ke tabel transkrip
    const transcriptCheck = await query(
      `SELECT * FROM transkrip WHERE kode_mk = 'KP70065004'`
    );
    assert.ok(transcriptCheck.length > 0, 'Data transkrip harus tersimpan setelah sinkronisasi');
  });

  // Skenario 13: Mahasiswa, dosen, dan admin ditolak saat memanggil endpoint sinkronisasi transkrip
  test('13. Mahasiswa, dosen, dan admin ditolak saat memanggil endpoint sinkronisasi transkrip (403 Forbidden)', async () => {
    // 13a. Mahasiswa mencoba memanggil sinkronisasi
    const resMhs = await fetch(`${BASE_URL}/transkrip/sinkron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenMahasiswa1}`,
        'X-Device-ID': 'DEV-MHS-001'
      },
      body: JSON.stringify({ class_id: 1, items: [] })
    });
    assert.equal(resMhs.status, 403);

    // 13b. Dosen mencoba memanggil sinkronisasi langsung
    const resDsn = await fetch(`${BASE_URL}/transkrip/sinkron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenDosenAlam}`,
        'X-Device-ID': 'DEV-DSN-001'
      },
      body: JSON.stringify({ class_id: 1, items: [] })
    });
    assert.equal(resDsn.status, 403);

    // 13c. Admin mencoba memanggil sinkronisasi langsung
    const resAdm = await fetch(`${BASE_URL}/transkrip/sinkron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`,
        'X-Device-ID': 'DEV-ADM-001'
      },
      body: JSON.stringify({ class_id: 1, items: [] })
    });
    assert.equal(resAdm.status, 403);
  });

  // Skenario 14: Token service valid dapat digunakan untuk sinkronisasi
  test('14. Token service yang valid dari Service Nilai dapat digunakan untuk sinkronisasi', async () => {
    // Service Nilai meminta token service ke Gateway
    const authSvcRes = await fetch(`${BASE_URL}/auth/service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'service-nilai-verika',
        client_secret: 'svc_nilai_secret_key_9876543210'
      })
    });

    assert.equal(authSvcRes.status, 200);
    const svcData = await authSvcRes.json();
    tokenService = svcData.accessToken;
    assert.equal(svcData.role, 'service');

    // Ambil ID user Fariez dari DB secara dinamis
    const [fariezRow] = await query("SELECT id FROM users WHERE identifier = '247006111146'");
    assert.ok(fariezRow, 'User Fariez harus ada di database');

    // Gunakan service token untuk sinkronisasi melalui Gateway
    const syncRes = await fetch(`${BASE_URL}/transkrip/sinkron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenService}`
      },
      body: JSON.stringify({
        class_id: 999,
        items: [
          {
            student_id: fariezRow.id,
            nim: '247006111146',
            kode_mk: 'TEST101',
            nama_mk: 'Pengujian Sistem Zero Trust',
            sks: 2,
            nilai_huruf: 'A',
            bobot: 4.0,
            mutu: 8.0,
            semester: '20261'
          }
        ]
      })
    });

    assert.equal(syncRes.status, 200);
    const syncData = await syncRes.json();
    assert.equal(syncData.syncedCount, 1);
  });

  // Skenario 15: Request langsung ke Service Nilai tanpa gateway secret ditolak
  test('15. Request langsung ke Service Nilai (port 3001) tanpa X-Gateway-Secret ditolak (403 Forbidden)', async () => {
    const directRes = await fetch(`${NILAI_URL}/nilai`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenMahasiswa1}`
        // Tidak membawa header X-Gateway-Secret
      }
    });

    assert.equal(directRes.status, 403);
    const data = await directRes.json();
    assert.match(data.error, /akses langsung/i);
  });

  // Skenario 16: Request ke service dengan gateway secret tetapi tanpa token valid ditolak
  test('16. Request ke service dengan X-Gateway-Secret tetapi tanpa token valid ditolak (Assume Breach)', async () => {
    // Kirim request ke Service Nilai membawa gateway secret tetapi tanpa header Authorization
    const resNoToken = await fetch(`${NILAI_URL}/nilai`, {
      method: 'GET',
      headers: {
        'X-Gateway-Secret': GATEWAY_SECRET
      }
    });

    assert.equal(resNoToken.status, 401);
    const data = await resNoToken.json();
    assert.match(data.error, /token autentikasi wajib disertakan/i);
  });

  // Skenario 17: Audit log tercatat untuk keputusan akses ALLOW dan DENY
  test('17. Audit log tercatat di basis data untuk keputusan ALLOW maupun DENY', async () => {
    // Periksa tabel audit_logs di basis data
    const allowLogs = await query(
      `SELECT * FROM audit_logs WHERE decision = 'ALLOW' ORDER BY id DESC LIMIT 5`
    );
    const denyLogs = await query(
      `SELECT * FROM audit_logs WHERE decision = 'DENY' ORDER BY id DESC LIMIT 5`
    );

    assert.ok(allowLogs.length > 0, 'Harus ada catatan audit log ALLOW');
    assert.ok(denyLogs.length > 0, 'Harus ada catatan audit log DENY');

    // Verifikasi kelengkapan kolom audit log
    const sampleLog = denyLogs[0];
    assert.ok(sampleLog.timestamp, 'Timestamp wajib ada');
    assert.ok(sampleLog.subject, 'Subject wajib ada');
    assert.ok(sampleLog.endpoint, 'Endpoint wajib ada');
    assert.ok(sampleLog.decision, 'Decision wajib ada');
    assert.ok(sampleLog.reason, 'Reason wajib ada');
    assert.ok(sampleLog.status_code, 'Status code wajib ada');
  });

});
