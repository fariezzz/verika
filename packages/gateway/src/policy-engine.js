// packages/gateway/src/policy-engine.js
// Policy Engine / Policy Administrator (PE/PA) sesuai NIST SP 800-207
// Mengambil keputusan akses (Allow / Deny) berdasarkan identitas, kredensial, perangkat, jam akses, dan data kepemilikan.

import { verifyToken, isWithinAccessHours, query } from '@zero-trust/shared';

/**
 * Evaluasi kebijakan Zero Trust untuk setiap request yang masuk ke Gateway.
 *
 * @param {import('express').Request} req
 * @returns {Promise<{ allow: boolean, statusCode: number, reason: string, user: Object|null }>}
 */
export async function evaluatePolicy(req) {
  const path = req.path;
  const method = req.method.toUpperCase();

  // 1. Endpoint Otentikasi Publik di Gateway tidak memerlukan token awal
  if (path.startsWith('/auth/login') || path.startsWith('/auth/service') || path.startsWith('/auth/refresh')) {
    return { allow: true, statusCode: 200, reason: 'Endpoint autentikasi publik gateway', user: null };
  }

  // 2. Ekstraksi Token dari Authorization Header
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      allow: false,
      statusCode: 401,
      reason: 'Header Authorization: Bearer <token> wajib disertakan',
      user: null
    };
  }

  const token = authHeader.split(' ')[1];
  let decodedUser = null;
  try {
    decodedUser = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return {
        allow: false,
        statusCode: 401,
        reason: 'Access token telah kedaluwarsa (maksimal 10 menit)',
        user: null
      };
    }
    return {
      allow: false,
      statusCode: 401,
      reason: `Signature token tidak valid atau rusak: ${err.message}`,
      user: null
    };
  }

  const role = decodedUser.role;
  const subject = decodedUser.identifier || decodedUser.sub || decodedUser.client_id || 'unknown';

  // 3. Evaluasi Khusus: Service Token vs User Token
  if (path === '/transkrip/sinkron') {
    // Zero Trust Rule: Endpoint sinkronisasi transkrip HANYA boleh dipanggil dengan token service
    if (role !== 'service' || decodedUser.token_type !== 'service') {
      return {
        allow: false,
        statusCode: 403,
        reason: 'Akses ditolak: Endpoint sinkronisasi transkrip hanya dapat diakses oleh Service Nilai dengan service token yang valid (token pengguna ditolak)',
        user: decodedUser
      };
    }
    return {
      allow: true,
      statusCode: 200,
      reason: 'Otorisasi service token valid untuk sinkronisasi transkrip antarlayanan',
      user: decodedUser
    };
  }

  // Jika token bertipe service mencoba mengakses endpoint selain /transkrip/sinkron, tolak (least privilege)
  if (role === 'service') {
    return {
      allow: false,
      statusCode: 403,
      reason: 'Service token tidak diizinkan mengakses resource pengguna',
      user: decodedUser
    };
  }

  // 4. Verifikasi Konteks Perangkat (Device Verification - Zero Trust Context)
  const deviceId = req.headers['x-device-id'] || decodedUser.device_id;
  if (!deviceId) {
    return {
      allow: false,
      statusCode: 400,
      reason: 'Header X-Device-ID wajib disertakan untuk verifikasi konteks perangkat',
      user: decodedUser
    };
  }

  // Periksa apakah perangkat terdaftar dan aktif untuk user ini di basis data
  const deviceRows = await query(
    `SELECT id, is_trusted FROM devices WHERE user_id = ? AND device_id = ?`,
    [decodedUser.sub, deviceId]
  );

  if (!deviceRows || deviceRows.length === 0 || !deviceRows[0].is_trusted) {
    return {
      allow: false,
      statusCode: 403,
      reason: `Akses ditolak: Perangkat dengan Device ID '${deviceId}' tidak terdaftar atau tidak tepercaya untuk akun ini`,
      user: decodedUser
    };
  }

  // 5. Evaluasi Kebijakan Berdasarkan Endpoint & Kepemilikan Data (Least Privilege)

  // A. Endpoint: GET /nilai
  if (path === '/nilai' && method === 'GET') {
    if (role === 'mahasiswa' || role === 'dosen') {
      return {
        allow: true,
        statusCode: 200,
        reason: `Akses diizinkan untuk role '${role}' dengan filter kepemilikan data`,
        user: decodedUser
      };
    }
    return {
      allow: false,
      statusCode: 403,
      reason: `Role '${role}' tidak memiliki izin melihat data nilai kelas/mata kuliah`,
      user: decodedUser
    };
  }

  // B. Endpoint: PUT /nilai/:id (Pengubahan Nilai oleh Dosen)
  const matchPutNilai = path.match(/^\/nilai\/(\d+)$/);
  if (matchPutNilai && method === 'PUT') {
    const nilaiId = matchPutNilai[1];

    if (role !== 'dosen') {
      return {
        allow: false,
        statusCode: 403,
        reason: 'Hanya dosen pengampu yang berhak mengubah nilai',
        user: decodedUser
      };
    }

    // Periksa Kebijakan Jam Akses (07:00 - 21:00 WIB)
    const timeCheck = isWithinAccessHours();
    if (!timeCheck.allowed) {
      return {
        allow: false,
        statusCode: 403,
        reason: `Perubahan nilai ditolak di luar jam operasional (${timeCheck.window} ${timeCheck.timezone}). Waktu sistem saat ini: ${timeCheck.currentTime}`,
        user: decodedUser
      };
    }

    // Periksa Kepemilikan Kelas & Status Finalitas di Basis Data
    const gradeRows = await query(
      `SELECT n.id, n.is_final, c.dosen_id, c.is_finalized, c.nama_mk
       FROM nilai n
       JOIN classes c ON n.class_id = c.id
       WHERE n.id = ?`,
      [nilaiId]
    );

    if (!gradeRows || gradeRows.length === 0) {
      return {
        allow: false,
        statusCode: 404,
        reason: `Data nilai dengan ID ${nilaiId} tidak ditemukan`,
        user: decodedUser
      };
    }

    const grade = gradeRows[0];

    // Dosen hanya boleh mengubah kelas yang diampunya
    if (grade.dosen_id !== decodedUser.sub) {
      return {
        allow: false,
        statusCode: 403,
        reason: `Akses ditolak: Dosen ${decodedUser.nama} tidak mengampu mata kuliah ini (Least Privilege Violation)`,
        user: decodedUser
      };
    }

    // Nilai tidak boleh diubah jika sudah final
    if (grade.is_final || grade.is_finalized) {
      return {
        allow: false,
        statusCode: 403,
        reason: 'Nilai telah berstatus final dan terkunci, tidak dapat diubah lagi',
        user: decodedUser
      };
    }

    return {
      allow: true,
      statusCode: 200,
      reason: 'Validasi kepemilikan kelas, status non-final, dan jam akses terpenuhi',
      user: decodedUser
    };
  }

  // C. Endpoint: POST /kelas/:id/finalisasi (Finalisasi Kelas oleh Dosen)
  const matchFinalisasi = path.match(/^\/kelas\/(\d+)\/finalisasi$/);
  if (matchFinalisasi && method === 'POST') {
    const classId = matchFinalisasi[1];

    if (role !== 'dosen') {
      return {
        allow: false,
        statusCode: 403,
        reason: 'Hanya dosen pengampu yang berhak memfinalisasi nilai kelas',
        user: decodedUser
      };
    }

    // Periksa Kebijakan Jam Akses
    const timeCheck = isWithinAccessHours();
    if (!timeCheck.allowed) {
      return {
        allow: false,
        statusCode: 403,
        reason: `Finalisasi nilai ditolak di luar jam operasional (${timeCheck.window} ${timeCheck.timezone}). Waktu sistem saat ini: ${timeCheck.currentTime}`,
        user: decodedUser
      };
    }

    // Periksa Kepemilikan Kelas di Database
    const classRows = await query(
      `SELECT id, dosen_id, is_finalized, nama_mk FROM classes WHERE id = ?`,
      [classId]
    );

    if (!classRows || classRows.length === 0) {
      return {
        allow: false,
        statusCode: 404,
        reason: `Kelas dengan ID ${classId} tidak ditemukan`,
        user: decodedUser
      };
    }

    const cls = classRows[0];
    if (cls.dosen_id !== decodedUser.sub) {
      return {
        allow: false,
        statusCode: 403,
        reason: `Akses ditolak: Anda bukan dosen pengampu untuk kelas '${cls.nama_mk}'`,
        user: decodedUser
      };
    }

    if (cls.is_finalized) {
      return {
        allow: false,
        statusCode: 400,
        reason: 'Kelas ini sudah pernah difinalisasi sebelumnya',
        user: decodedUser
      };
    }

    return {
      allow: true,
      statusCode: 200,
      reason: 'Dosen terverifikasi mengampu kelas dan waktu berada dalam batas akses',
      user: decodedUser
    };
  }

  // D. Endpoint: GET /transkrip/:nim (Melihat Transkrip Mahasiswa)
  const matchTranskrip = path.match(/^\/transkrip\/([A-Za-z0-9_-]+)$/);
  if (matchTranskrip && method === 'GET') {
    const requestedNim = matchTranskrip[1];

    if (role === 'admin') {
      return {
        allow: true,
        statusCode: 200,
        reason: 'Admin diizinkan melihat transkrip seluruh mahasiswa',
        user: decodedUser
      };
    }

    if (role === 'mahasiswa') {
      // Mahasiswa hanya boleh melihat transkrip NIM miliknya sendiri
      if (decodedUser.identifier !== requestedNim) {
        return {
          allow: false,
          statusCode: 403,
          reason: `Pelanggaran Least Privilege: Mahasiswa dengan NIM ${decodedUser.identifier} dilarang melihat transkrip NIM ${requestedNim}`,
          user: decodedUser
        };
      }
      return {
        allow: true,
        statusCode: 200,
        reason: 'Mahasiswa melihat transkrip miliknya sendiri',
        user: decodedUser
      };
    }

    return {
      allow: false,
      statusCode: 403,
      reason: `Role '${role}' tidak memiliki izin melihat transkrip mahasiswa`,
      user: decodedUser
    };
  }

  // E. Endpoint: GET /audit-logs (Monitoring oleh Admin)
  if (path === '/audit-logs' && method === 'GET') {
    if (role !== 'admin') {
      return {
        allow: false,
        statusCode: 403,
        reason: 'Hanya Admin yang berhak mengakses audit logs',
        user: decodedUser
      };
    }
    return {
      allow: true,
      statusCode: 200,
      reason: 'Admin mengakses audit log sistem',
      user: decodedUser
    };
  }

  // F. Endpoint: GET /auth/me
  if (path === '/auth/me' && method === 'GET') {
    return {
      allow: true,
      statusCode: 200,
      reason: 'Pengguna memeriksa status profil autentikasi',
      user: decodedUser
    };
  }

  // Default Fail-Closed untuk endpoint lain yang tidak terdaftar
  return {
    allow: false,
    statusCode: 404,
    reason: `Endpoint ${method} ${path} tidak dikenal atau tidak diizinkan oleh kebijakan sistem`,
    user: decodedUser
  };
}
