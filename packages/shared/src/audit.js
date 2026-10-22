// packages/shared/src/audit.js
// Pencatatan Audit Log pada Policy Enforcement Point (PEP) sesuai NIST SP 800-207

import { execute, query } from './db.js';

/**
 * Mencatat hasil keputusan evaluasi keamanan (ALLOW atau DENY) ke basis data audit_logs.
 * Menjamin tidak ada data sensitif (password, secret, raw JWT) yang bocor ke log.
 *
 * @param {Object} entry
 * @param {string} entry.subject - Identitas subjek (NIM, NIP, username, atau 'service:nilai')
 * @param {string} entry.role - Role subjek ('mahasiswa', 'dosen', 'admin', 'service', 'anonymous')
 * @param {string} entry.endpoint - Path endpoint (mis. '/nilai', '/auth/login')
 * @param {string} entry.method - HTTP Method ('GET', 'POST', 'PUT', dll)
 * @param {string|null} [entry.deviceId] - ID Perangkat jika relevan
 * @param {string|null} [entry.ipAddress] - IP Address pemohon
 * @param {'ALLOW'|'DENY'} entry.decision - Keputusan Policy Engine
 * @param {string} entry.reason - Penjelasan teknis alasan izin atau penolakan
 * @param {number} entry.statusCode - HTTP Status Code yang dihasilkan
 */
export async function recordAuditLog({
  subject = 'anonymous',
  role = 'anonymous',
  endpoint,
  method,
  deviceId = null,
  ipAddress = null,
  decision,
  reason,
  statusCode
}) {
  // Sanitasi alasan dan subjek untuk memastikan tidak ada token atau kata sandi
  const sanitizedReason = String(reason).replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED_TOKEN]');

  try {
    await execute(
      `INSERT INTO audit_logs (subject, role, endpoint, method, device_id, ip_address, decision, reason, status_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subject.substring(0, 100),
        role.substring(0, 50),
        endpoint.substring(0, 255),
        method.toUpperCase().substring(0, 10),
        deviceId ? deviceId.substring(0, 100) : null,
        ipAddress ? ipAddress.substring(0, 50) : null,
        decision === 'ALLOW' ? 'ALLOW' : 'DENY',
        sanitizedReason,
        statusCode
      ]
    );
  } catch (err) {
    // Zero Trust: Kegagalan audit log harus dicatat ke stderr dan dilaporkan
    console.error('[AUDIT LOGGING FAILURE]', err.message, {
      subject,
      endpoint,
      decision,
      statusCode
    });
    throw err;
  }
}

/**
 * Mengambil daftar audit log terbaru (khusus dashboard pemantauan admin)
 */
export async function getAuditLogs(limit = 100) {
  return await query(
    `SELECT id, timestamp, subject, role, endpoint, method, device_id, ip_address, decision, reason, status_code
     FROM audit_logs
     ORDER BY timestamp DESC, id DESC
     LIMIT ?`,
    [limit]
  );
}
