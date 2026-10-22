// packages/gateway/src/auth-controller.js
// Pengendali Autentikasi Gateway: Login, Refresh Token, Logout, dan Token Layanan

import bcrypt from 'bcryptjs';
import {
  query,
  execute,
  signAccessToken,
  signServiceToken,
  generateRefreshToken,
  hashToken,
  recordAuditLog
} from '@zero-trust/shared';

/**
 * POST /auth/login
 * Memverifikasi username, password, dan perangkat terdaftar (X-Device-ID).
 */
export async function handleLogin(req, res) {
  const { username, password } = req.body || {};
  const deviceId = req.headers['x-device-id'] || req.body?.device_id;
  const ipAddress = req.ip || req.socket.remoteAddress;

  if (!username || !password) {
    await recordAuditLog({
      subject: username || 'anonymous',
      role: 'anonymous',
      endpoint: '/auth/login',
      method: 'POST',
      deviceId: deviceId || null,
      ipAddress,
      decision: 'DENY',
      reason: 'Username dan password wajib diisi',
      statusCode: 400
    });
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  if (!deviceId) {
    await recordAuditLog({
      subject: username,
      role: 'anonymous',
      endpoint: '/auth/login',
      method: 'POST',
      deviceId: null,
      ipAddress,
      decision: 'DENY',
      reason: 'Header X-Device-ID atau parameter device_id wajib disertakan (Zero Trust Context Check)',
      statusCode: 400
    });
    return res.status(400).json({
      error: 'Device ID wajib disertakan untuk verifikasi konteks perangkat yang terdaftar'
    });
  }

  // 1. Cari user di basis data
  const users = await query(
    `SELECT id, username, password_hash, role, nama, identifier, email FROM users WHERE username = ?`,
    [username]
  );

  if (!users || users.length === 0) {
    await recordAuditLog({
      subject: username,
      role: 'anonymous',
      endpoint: '/auth/login',
      method: 'POST',
      deviceId,
      ipAddress,
      decision: 'DENY',
      reason: `Autentikasi gagal: Akun '${username}' tidak ditemukan`,
      statusCode: 401
    });
    return res.status(401).json({ error: 'Kredensial atau akun tidak valid' });
  }

  const user = users[0];

  // 2. Verifikasi Password Hashing
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    await recordAuditLog({
      subject: username,
      role: user.role,
      endpoint: '/auth/login',
      method: 'POST',
      deviceId,
      ipAddress,
      decision: 'DENY',
      reason: 'Autentikasi gagal: Password yang dimasukkan salah',
      statusCode: 401
    });
    return res.status(401).json({ error: 'Kredensial atau akun tidak valid' });
  }

  // 3. Verifikasi Perangkat Terdaftar (X-Device-ID)
  const devices = await query(
    `SELECT id, device_id, device_name, is_trusted FROM devices WHERE user_id = ? AND device_id = ?`,
    [user.id, deviceId]
  );

  if (!devices || devices.length === 0 || !devices[0].is_trusted) {
    await recordAuditLog({
      subject: username,
      role: user.role,
      endpoint: '/auth/login',
      method: 'POST',
      deviceId,
      ipAddress,
      decision: 'DENY',
      reason: `Akses ditolak: Perangkat '${deviceId}' belum terdaftar atau tidak tepercaya untuk akun '${username}'`,
      statusCode: 403
    });
    return res.status(403).json({
      error: `Perangkat '${deviceId}' tidak terdaftar atau belum disetujui untuk akun Anda. Zero Trust mewajibkan login dari perangkat tepercaya.`
    });
  }

  // 4. Terbitkan Access Token (10 Menit)
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    nama: user.nama,
    identifier: user.identifier,
    device_id: deviceId
  });

  // 5. Terbitkan Refresh Token (1 Hari) dan simpan hash di DB
  const { rawToken, tokenHash, expiresAt } = generateRefreshToken();
  await execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at) VALUES (?, ?, ?, ?)`,
    [user.id, tokenHash, deviceId, expiresAt]
  );

  // Set Cookie HttpOnly untuk refresh token
  res.cookie('refreshToken', rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
    maxAge: 24 * 60 * 60 * 1000 // 1 hari
  });

  // 6. Catat Audit Log ALLOW
  await recordAuditLog({
    subject: user.identifier || user.username,
    role: user.role,
    endpoint: '/auth/login',
    method: 'POST',
    deviceId,
    ipAddress,
    decision: 'ALLOW',
    reason: `Login berhasil melalui perangkat terdaftar '${devices[0].device_name}' (${deviceId})`,
    statusCode: 200
  });

  return res.json({
    message: 'Login berhasil',
    user: {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      identifier: user.identifier,
      email: user.email,
      deviceId
    },
    accessToken,
    refreshToken: rawToken // Dikirim juga untuk pengujian / fleksibilitas client
  });
}

/**
 * POST /auth/refresh
 * Menolak token kedaluwarsa/dicabut dan menerbitkan access token baru serta melakukan rotasi refresh token.
 */
export async function handleRefresh(req, res) {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const deviceId = req.headers['x-device-id'] || req.body?.device_id;
  const ipAddress = req.ip || req.socket.remoteAddress;

  if (!rawToken) {
    await recordAuditLog({
      subject: 'anonymous',
      role: 'anonymous',
      endpoint: '/auth/refresh',
      method: 'POST',
      deviceId: deviceId || null,
      ipAddress,
      decision: 'DENY',
      reason: 'Refresh token tidak ditemukan di cookie maupun request body',
      statusCode: 401
    });
    return res.status(401).json({ error: 'Refresh token tidak ditemukan' });
  }

  const tokenHash = hashToken(rawToken);

  // Cari token di database
  const tokenRows = await query(
    `SELECT rt.id, rt.user_id, rt.device_id, rt.expires_at, rt.revoked,
            u.username, u.role, u.nama, u.identifier
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token_hash = ?`,
    [tokenHash]
  );

  if (!tokenRows || tokenRows.length === 0) {
    await recordAuditLog({
      subject: 'anonymous',
      role: 'anonymous',
      endpoint: '/auth/refresh',
      method: 'POST',
      deviceId: deviceId || null,
      ipAddress,
      decision: 'DENY',
      reason: 'Refresh token tidak dikenal atau telah dihapus',
      statusCode: 401
    });
    return res.status(401).json({ error: 'Refresh token tidak valid' });
  }

  const tokenData = tokenRows[0];

  // Periksa apakah token telah dicabut
  if (tokenData.revoked) {
    await recordAuditLog({
      subject: tokenData.identifier || tokenData.username,
      role: tokenData.role,
      endpoint: '/auth/refresh',
      method: 'POST',
      deviceId: deviceId || null,
      ipAddress,
      decision: 'DENY',
      reason: 'Percobaan penggunaan refresh token yang telah dicabut (Revoked Token Detected)',
      statusCode: 401
    });
    return res.status(401).json({ error: 'Refresh token telah dicabut' });
  }

  // Periksa apakah token telah kedaluwarsa
  if (new Date() > new Date(tokenData.expires_at)) {
    await recordAuditLog({
      subject: tokenData.identifier || tokenData.username,
      role: tokenData.role,
      endpoint: '/auth/refresh',
      method: 'POST',
      deviceId: deviceId || null,
      ipAddress,
      decision: 'DENY',
      reason: 'Refresh token telah kedaluwarsa (lebih dari 1 hari)',
      statusCode: 401
    });
    return res.status(401).json({ error: 'Refresh token telah kedaluwarsa' });
  }

  // Cabut refresh token lama dan lakukan rotasi token baru (Token Rotation)
  await execute(`UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE id = ?`, [tokenData.id]);

  const targetDeviceId = deviceId || tokenData.device_id;
  const newRefresh = generateRefreshToken();
  await execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_id, expires_at) VALUES (?, ?, ?, ?)`,
    [tokenData.user_id, newRefresh.tokenHash, targetDeviceId, newRefresh.expiresAt]
  );

  const newAccessToken = signAccessToken({
    sub: tokenData.user_id,
    role: tokenData.role,
    nama: tokenData.nama,
    identifier: tokenData.identifier,
    device_id: targetDeviceId
  });

  res.cookie('refreshToken', newRefresh.rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
    maxAge: 24 * 60 * 60 * 1000
  });

  await recordAuditLog({
    subject: tokenData.identifier || tokenData.username,
    role: tokenData.role,
    endpoint: '/auth/refresh',
    method: 'POST',
    deviceId: targetDeviceId,
    ipAddress,
    decision: 'ALLOW',
    reason: 'Refresh token valid, access token baru diterbitkan dengan rotasi token',
    statusCode: 200
  });

  return res.json({
    message: 'Token berhasil diperbarui',
    accessToken: newAccessToken,
    refreshToken: newRefresh.rawToken
  });
}

/**
 * POST /auth/logout
 * Mencabut refresh token aktif dari basis data.
 */
export async function handleLogout(req, res) {
  const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const ipAddress = req.ip || req.socket.remoteAddress;

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await execute(`UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE token_hash = ?`, [tokenHash]);
  }

  res.clearCookie('refreshToken', { path: '/auth' });

  await recordAuditLog({
    subject: req.user?.identifier || req.user?.username || 'user',
    role: req.user?.role || 'user',
    endpoint: '/auth/logout',
    method: 'POST',
    deviceId: req.headers['x-device-id'] || null,
    ipAddress,
    decision: 'ALLOW',
    reason: 'Logout berhasil, sesi refresh token telah dicabut',
    statusCode: 200
  });

  return res.json({ message: 'Logout berhasil, sesi telah diakhiri' });
}

/**
 * POST /auth/service
 * Menerbitkan service token (5 menit) khusus untuk Service Nilai dengan Client ID & Secret.
 */
export async function handleServiceToken(req, res) {
  const { client_id, client_secret } = req.body || {};
  const ipAddress = req.ip || req.socket.remoteAddress;

  const validClientId = process.env.SERVICE_NILAI_CLIENT_ID || 'service-nilai-verika';
  const validClientSecret = process.env.SERVICE_NILAI_CLIENT_SECRET || 'svc_nilai_secret_key_9876543210';

  if (!client_id || !client_secret || client_id !== validClientId || client_secret !== validClientSecret) {
    await recordAuditLog({
      subject: client_id || 'unknown_service',
      role: 'service',
      endpoint: '/auth/service',
      method: 'POST',
      deviceId: null,
      ipAddress,
      decision: 'DENY',
      reason: 'Kredensial client_id atau client_secret service tidak valid',
      statusCode: 401
    });
    return res.status(401).json({ error: 'Kredensial service tidak valid' });
  }

  const token = signServiceToken({
    sub: 'service:nilai',
    client_id
  });

  await recordAuditLog({
    subject: 'service:nilai',
    role: 'service',
    endpoint: '/auth/service',
    method: 'POST',
    deviceId: null,
    ipAddress,
    decision: 'ALLOW',
    reason: `Service token (5 menit) diterbitkan untuk '${client_id}'`,
    statusCode: 200
  });

  return res.json({
    message: 'Service token berhasil diterbitkan',
    accessToken: token,
    role: 'service',
    expiresIn: '5m'
  });
}
