// packages/gateway/src/server.js
// API Gateway - Policy Enforcement Point (PEP) sesuai NIST SP 800-207

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { recordAuditLog, getAuditLogs, verifyToken } from '@zero-trust/shared';
import { evaluatePolicy } from './policy-engine.js';
import {
  handleLogin,
  handleRefresh,
  handleLogout,
  handleServiceToken
} from './auth-controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = parseInt(process.env.GATEWAY_PORT || '3000', 10);
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'gw_secret_internal_zero_trust_verika_2026';
const NILAI_URL = process.env.NILAI_URL || 'http://localhost:3001';
const TRANSKRIP_URL = process.env.TRANSKRIP_URL || 'http://localhost:3002';

// 1. Konfigurasi Keamanan CORS (hanya izinkan origin frontend terdaftar)
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://127.0.0.1:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID', 'X-Requested-With']
  })
);

app.use(cookieParser());
app.use(express.json());

// 2. Logging dasar request masuk
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[PEP GATEWAY] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// 3. Endpoint Autentikasi Gateway
app.post('/auth/login', handleLogin);
app.post('/auth/refresh', handleRefresh);
app.post('/auth/logout', handleLogout);
app.post('/auth/service', handleServiceToken);

app.get('/auth/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }
  try {
    const decoded = verifyToken(authHeader.split(' ')[1]);
    return res.json({ user: decoded });
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' });
  }
});

// 4. Endpoint Audit Logs (Khusus Admin)
app.get('/audit-logs', async (req, res) => {
  const decision = await evaluatePolicy(req);
  const ipAddress = req.ip || req.socket.remoteAddress;
  const deviceId = req.headers['x-device-id'] || null;

  if (!decision.allow) {
    await recordAuditLog({
      subject: decision.user?.identifier || decision.user?.username || 'anonymous',
      role: decision.user?.role || 'anonymous',
      endpoint: '/audit-logs',
      method: 'GET',
      deviceId,
      ipAddress,
      decision: 'DENY',
      reason: decision.reason,
      statusCode: decision.statusCode
    });
    return res.status(decision.statusCode).json({ error: decision.reason });
  }

  await recordAuditLog({
    subject: decision.user?.identifier || decision.user?.username,
    role: decision.user?.role,
    endpoint: '/audit-logs',
    method: 'GET',
    deviceId,
    ipAddress,
    decision: 'ALLOW',
    reason: decision.reason,
    statusCode: 200
  });

  const logs = await getAuditLogs(150);
  return res.json({ data: logs });
});

// 5. Policy Enforcement Point (PEP) Middleware & Forwarder ke Resource Services
app.use(async (req, res) => {
  const path = req.path;
  const method = req.method;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const deviceId = req.headers['x-device-id'] || null;

  // Evaluasi kebijakan pada Policy Engine
  const decision = await evaluatePolicy(req);

  // Catat keputusan ke Audit Log (Zero Trust Rule: Semua keputusan dicatat)
  await recordAuditLog({
    subject: decision.user?.identifier || decision.user?.sub || decision.user?.client_id || 'anonymous',
    role: decision.user?.role || 'anonymous',
    endpoint: path,
    method,
    deviceId,
    ipAddress,
    decision: decision.allow ? 'ALLOW' : 'DENY',
    reason: decision.reason,
    statusCode: decision.statusCode
  });

  // Jika Policy Engine menolak (DENY), putuskan aliran (Fail Closed)
  if (!decision.allow) {
    return res.status(decision.statusCode).json({ error: decision.reason });
  }

  // Tentukan service tujuan
  let targetBaseUrl = null;
  if (path.startsWith('/nilai') || path.startsWith('/kelas')) {
    targetBaseUrl = NILAI_URL;
  } else if (path.startsWith('/transkrip')) {
    targetBaseUrl = TRANSKRIP_URL;
  } else {
    return res.status(404).json({ error: `Rute '${path}' tidak ditangani oleh service terdaftar` });
  }

  const targetUrl = new URL(req.originalUrl, targetBaseUrl).toString();

  try {
    // Siapkan headers untuk diteruskan ke downstream service
    // Zero Trust Defense-in-Depth:
    // 1. Gateway menyisipkan X-Gateway-Secret
    // 2. Gateway tetap menyertakan token Authorization asli
    // 3. Header konteks diteruskan
    const forwardHeaders = {
      'Content-Type': 'application/json',
      'X-Gateway-Secret': GATEWAY_SECRET,
      'Authorization': req.headers['authorization'] || ''
    };

    if (deviceId) {
      forwardHeaders['X-Device-ID'] = deviceId;
    }

    const fetchOptions = {
      method,
      headers: forwardHeaders
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const downstreamResponse = await fetch(targetUrl, fetchOptions);
    const contentType = downstreamResponse.headers.get('content-type') || '';

    let data;
    if (contentType.includes('application/json')) {
      data = await downstreamResponse.json();
    } else {
      data = await downstreamResponse.text();
    }

    return res.status(downstreamResponse.status).json(data);
  } catch (err) {
    console.error(`[GATEWAY FORWARDING ERROR] Gagal menghubungi service tujuan di ${targetUrl}:`, err.message);
    return res.status(502).json({
      error: `Service backend (${targetBaseUrl}) sedang tidak dapat dihubungi: ${err.message}`
    });
  }
});

// Jalankan Gateway
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[PEP GATEWAY] Policy Enforcement Point aktif di http://localhost:${PORT}`);
  });
}

export default app;
