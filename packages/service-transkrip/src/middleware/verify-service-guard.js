// packages/service-transkrip/src/middleware/verify-service-guard.js
// Middleware Verifikasi Ganda (Defense-in-Depth / Assume Breach) pada Service Transkrip

import { verifyToken } from '@zero-trust/shared';

export function verifyServiceGuard(req, res, next) {
  const expectedGatewaySecret = process.env.GATEWAY_SECRET || 'gw_secret_internal_zero_trust_unsil_2026';
  const receivedGatewaySecret = req.headers['x-gateway-secret'];

  // 1. Verifikasi Gateway Secret
  if (!receivedGatewaySecret || receivedGatewaySecret !== expectedGatewaySecret) {
    console.warn(`[DEFENSE-IN-DEPTH] Request ditolak: Akses langsung ke Service Transkrip tanpa X-Gateway-Secret (${req.ip})`);
    return res.status(403).json({
      error: 'Akses langsung ke Service Transkrip ditolak. Seluruh permintaan wajib melewati API Gateway (NIST SP 800-207 PEP).'
    });
  }

  // 2. Verifikasi Ulang Token JWT
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
    return res.status(401).json({
      error: `Verifikasi token pada Service Transkrip gagal: ${err.message}`
    });
  }
}
