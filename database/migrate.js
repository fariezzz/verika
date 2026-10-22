// database/migrate.js
// Script migrasi skema basis data MySQL

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'zero_trust_db';

  console.log(`[MIGRATION] Menghubungkan ke MySQL di ${host}:${port} sebagai ${user}...`);

  // Buat koneksi awal tanpa memilih database spesifik
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  try {
    console.log(`[MIGRATION] Membaca skema dari database/schema.sql...`);
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf-8');

    console.log(`[MIGRATION] Menjalankan perintah DDL...`);
    await connection.query(schemaSql);

    console.log(`[MIGRATION] Berhasil! Skema basis data '${database}' siap digunakan.`);
  } catch (err) {
    console.error(`[MIGRATION ERROR] Gagal menjalankan migrasi:`, err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
