// packages/service-nilai/src/middleware/verify-service-guard.js
// Middleware Verifikasi Ganda (Defense-in-Depth / Assume Breach)
// Memverifikasi X-Gateway-Secret DAN memvalidasi token JWT secara mandiri di level service.

import { verifyToken } from '@zero-trust/shared';

export function verifyServiceGuard(req, res, next) {
  const expectedGatewaySecret = process.env.GATEWAY_SECRET || 'gw_secret_internal_zero_trust_verika_2026';
  const receivedGatewaySecret = req.headers['x-gateway-secret'];

  // 1. Verifikasi Gateway Secret (Mencegah direct access ke port service tanpa melalui Gateway)
  if (!receivedGatewaySecret || receivedGatewaySecret !== expectedGatewaySecret) {
    console.warn(`[DEFENSE-IN-DEPTH] Request ditolak: Akses langsung ke Service Nilai tanpa X-Gateway-Secret yang sah (${req.ip})`);
    return res.status(403).json({
      error: 'Akses langsung ke Service Nilai ditolak. Seluruh permintaan wajib melewati API Gateway (NIST SP 800-207 PEP).'
    });
  }

  // 2. Verifikasi Ulang Token JWT (Assume Breach: Service tidak mempercayai Gateway secara buta)
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[DEFENSE-IN-DEPTH] Request membawa X-Gateway-Secret tetapi tidak memiliki Authorization Token`);
    return res.status(401).json({
      error: 'Akses ditolak: Token autentikasi wajib disertakan meskipun membawa gateway secret.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.warn(`[DEFENSE-IN-DEPTH] Verifikasi token di Service Nilai gagal: ${err.message}`);
    return res.status(401).json({
      error: `Verifikasi token pada Service Nilai gagal: ${err.message}`
    });
  }
}
