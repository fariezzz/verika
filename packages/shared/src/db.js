// packages/shared/src/db.js
// Koneksi basis data MySQL/MariaDB menggunakan mysql2/promise

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat .env dari root project jika belum dimuat
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

let pool = null;

export function getPool() {
  if (!pool) {
    const config = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'zero_trust_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    };

    pool = mysql.createPool(config);
  }
  return pool;
}

/**
 * Eksekusi query dengan parameterized inputs untuk mencegah SQL Injection
 */
export async function query(sql, params = []) {
  const p = getPool();
  const [rows, fields] = await p.query(sql, params);
  return rows;
}

/**
 * Eksekusi query INSERT/UPDATE/DELETE dengan result info
 */
export async function execute(sql, params = []) {
  const p = getPool();
  const [result] = await p.execute(sql, params);
  return result;
}

/**
 * Tutup pool koneksi (misalnya saat pengujian selesai)
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
