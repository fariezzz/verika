// packages/shared/src/jwt.js
// Pengelolaan token JWT & Refresh Token sesuai prinsip Zero Trust

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'zero_trust_access_super_secret_key_2026_unsil';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'zero_trust_refresh_super_secret_key_2026_unsil';

/**
 * Menghasilkan Access Token JWT (berlaku 10 menit)
 * Payload minimal: sub, role, token_type
 */
export function signAccessToken(payload) {
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '10m';
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      nama: payload.nama,
      identifier: payload.identifier || null,
      device_id: payload.device_id || null,
      token_type: 'access'
    },
    ACCESS_SECRET,
    { expiresIn }
  );
}

/**
 * Menghasilkan Service Token JWT untuk panggilan antarlayanan (berlaku 5 menit)
 * Role strictly: 'service'
 */
export function signServiceToken(payload) {
  const expiresIn = process.env.JWT_SERVICE_EXPIRES_IN || '5m';
  return jwt.sign(
    {
      sub: payload.sub || 'service:nilai',
      role: 'service',
      client_id: payload.client_id,
      token_type: 'service'
    },
    ACCESS_SECRET,
    { expiresIn }
  );
}

/**
 * Memverifikasi token JWT dan mengembalikan decoded payload.
 * Melempar error jika signature tidak valid atau token kedaluwarsa.
 */
export function verifyToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Menghasilkan Refresh Token acak dan aman (hex 40 byte)
 * serta hash SHA-256 untuk disimpan di database.
 */
export function generateRefreshToken() {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  // Masa berlaku 1 hari
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return {
    rawToken,
    tokenHash,
    expiresAt
  };
}

/**
 * Hash satu arah untuk menyimpan token di basis data (mencegah plaintext token leakage)
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
