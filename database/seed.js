// database/seed.js
// Script pengisian data awal (seeding) sistem nilai Zero Trust

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runSeed() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'zero_trust_db';

  console.log(`[SEED] Menghubungkan ke MySQL ${host}:${port}/${database}...`);

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true
  });

  try {
    console.log(`[SEED] Membersihkan data lama secara aman...`);
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('TRUNCATE TABLE audit_logs;');
    await connection.query('TRUNCATE TABLE refresh_tokens;');
    await connection.query('TRUNCATE TABLE transkrip;');
    await connection.query('TRUNCATE TABLE nilai;');
    await connection.query('TRUNCATE TABLE class_students;');
    await connection.query('TRUNCATE TABLE classes;');
    await connection.query('TRUNCATE TABLE devices;');
    await connection.query('TRUNCATE TABLE users;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log(`[SEED] Melakukan hashing password demo ('password123')...`);
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    // 1. Masukkan Pengguna (Users)
    console.log(`[SEED] Menambahkan pengguna awal...`);
    const users = [
      ['admin', defaultPasswordHash, 'admin', 'Admin Akademik UNSIL', 'ADM001', 'admin@unsil.ac.id'],
      ['dosen_vega', defaultPasswordHash, 'dosen', 'Vega Purwayoga, S.Kom., M.Kom.', '198701012015041001', 'vega@unsil.ac.id'],
      ['dosen_alam', defaultPasswordHash, 'dosen', 'Alam Rahmatulloh, S.T., M.T.', '198802022016051002', 'alam@unsil.ac.id'],
      ['247006111146', defaultPasswordHash, 'mahasiswa', 'MUHAMMAD FARIEZ RIZIQ ILHAM', '247006111146', '247006111146@student.unsil.ac.id'],
      ['247006111147', defaultPasswordHash, 'mahasiswa', 'Fathir Rizki Fadillah', '247006111147', '247006111147@student.unsil.ac.id'],
      ['247006111148', defaultPasswordHash, 'mahasiswa', 'Aditya Pratama', '247006111148', '247006111148@student.unsil.ac.id']
    ];

    for (const u of users) {
      await connection.query(
        `INSERT INTO users (username, password_hash, role, nama, identifier, email) VALUES (?, ?, ?, ?, ?, ?)`,
        u
      );
    }

    // Ambil user ID
    const [userRows] = await connection.query('SELECT id, username FROM users');
    const userMap = {};
    for (const row of userRows) {
      userMap[row.username] = row.id;
    }

    // 2. Masukkan Perangkat Terdaftar (Devices - Konteks Zero Trust)
    console.log(`[SEED] Menambahkan perangkat terdaftar (1 perangkat per akun)...`);
    const devices = [
      [userMap['admin'], 'DEV-ADM-001', 'Workstation Admin Rektorat', true],
      [userMap['dosen_vega'], 'DEV-DSN-001', 'ThinkPad Dosen Vega', true],
      [userMap['dosen_alam'], 'DEV-DSN-002', 'MacBook Air Dosen Alam', true],
      [userMap['247006111146'], 'DEV-MHS-001', 'ASUS ROG Zephyrus Fariez', true],
      [userMap['247006111147'], 'DEV-MHS-002', 'Lenovo ThinkBook Fathir', true],
      [userMap['247006111148'], 'DEV-MHS-003', 'HP Pavilion Aditya', true]
    ];

    for (const d of devices) {
      await connection.query(
        `INSERT INTO devices (user_id, device_id, device_name, is_trusted) VALUES (?, ?, ?, ?)`,
        d
      );
    }

    // 3. Masukkan Kelas Mata Kuliah (Classes)
    console.log(`[SEED] Menambahkan kelas mata kuliah...`);
    const classes = [
      // Kelas 1: Diampu oleh Dosen Vega (Belum finalisasi)
      ['KP70065004', 'Keamanan Informasi', 3, '20261', 'E', userMap['dosen_vega'], false, null, 'none'],
      // Kelas 2: Diampu oleh Dosen Alam (Belum finalisasi)
      ['IF70063001', 'Inteligensi Artifisial', 3, '20261', 'A', userMap['dosen_alam'], false, null, 'none'],
      // Kelas 3: Diampu oleh Dosen Alam (Sudah finalisasi dari semester lalu)
      ['IF70063002', 'Jaringan Komputer', 3, '20252', 'B', userMap['dosen_alam'], true, new Date('2025-07-15 10:00:00'), 'synced']
    ];

    for (const c of classes) {
      await connection.query(
        `INSERT INTO classes (kode_mk, nama_mk, sks, semester, kelas, dosen_id, is_finalized, finalized_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c
      );
    }

    const [classRows] = await connection.query('SELECT id, kode_mk FROM classes');
    const classMap = {};
    for (const row of classRows) {
      classMap[row.kode_mk] = row.id;
    }

    // 4. Masukkan Mahasiswa ke Kelas (Class Students)
    console.log(`[SEED] Menghubungkan mahasiswa ke kelas...`);
    const classStudents = [
      [classMap['KP70065004'], userMap['247006111146']],
      [classMap['KP70065004'], userMap['247006111147']],
      [classMap['KP70065004'], userMap['247006111148']],
      [classMap['IF70063001'], userMap['247006111146']],
      [classMap['IF70063001'], userMap['247006111147']],
      [classMap['IF70063002'], userMap['247006111146']]
    ];

    for (const cs of classStudents) {
      await connection.query(
        `INSERT INTO class_students (class_id, student_id) VALUES (?, ?)`,
        cs
      );
    }

    // 5. Masukkan Nilai (Grades)
    console.log(`[SEED] Menambahkan nilai mahasiswa...`);
    const grades = [
      // Kelas Keamanan Informasi (Belum final)
      [classMap['KP70065004'], userMap['247006111146'], 88.50, 'A', 4.00, false],
      [classMap['KP70065004'], userMap['247006111147'], 82.00, 'A-', 3.75, false],
      [classMap['KP70065004'], userMap['247006111148'], 78.00, 'B+', 3.50, false],
      // Kelas Inteligensi Artifisial (Belum final)
      [classMap['IF70063001'], userMap['247006111146'], 91.00, 'A', 4.00, false],
      [classMap['IF70063001'], userMap['247006111147'], 85.00, 'A', 4.00, false],
      // Kelas Jaringan Komputer (Sudah final)
      [classMap['IF70063002'], userMap['247006111146'], 92.00, 'A', 4.00, true]
    ];

    for (const g of grades) {
      await connection.query(
        `INSERT INTO nilai (class_id, student_id, nilai_angka, nilai_huruf, bobot, is_final)
         VALUES (?, ?, ?, ?, ?, ?)`,
        g
      );
    }

    // 6. Masukkan Transkrip Akademik Awal (Transkrip Mahasiswa Fariez)
    console.log(`[SEED] Menambahkan transkrip historis untuk Fariez (IPK 3.90, 84 SKS)...`);
    const transcripts = [
      // Semester 20252
      [userMap['247006111146'], '247006111146', 'IF70063002', 'Jaringan Komputer', 3, 'A', 4.00, 12.00, '20252'],
      [userMap['247006111146'], '247006111146', 'IF70063003', 'Sistem Informasi', 3, 'A', 4.00, 12.00, '20252'],
      [userMap['247006111146'], '247006111146', 'IF70063004', 'Pemrograman Web', 3, 'A', 4.00, 12.00, '20252'],
      [userMap['247006111146'], '247006111146', 'IF70063005', 'Sains Data', 3, 'A', 4.00, 12.00, '20252'],
      [userMap['247006111146'], '247006111146', 'IF70063006', 'Grafika Komputer', 3, 'A', 4.00, 12.00, '20252'],
      [userMap['247006111146'], '247006111146', 'IF70063007', 'Manajemen Proyek PL', 3, 'A', 4.00, 12.00, '20252'],
      [userMap['247006111146'], '247006111146', 'IF70063008', 'Strategi Algoritma', 3, 'A', 4.00, 12.00, '20252'],
      [userMap['247006111146'], '247006111146', 'IF70063009', 'Analisis Numerik', 2, 'A', 4.00, 8.00, '20252'],
      // Semester 20251
      [userMap['247006111146'], '247006111146', 'IF70062001', 'Rekayasa Perangkat Lunak', 3, 'A', 4.00, 12.00, '20251'],
      [userMap['247006111146'], '247006111146', 'IF70062002', 'Pemrograman Berorientasi Objek', 3, 'A', 4.00, 12.00, '20251'],
      [userMap['247006111146'], '247006111146', 'IF70062003', 'Sistem Operasi', 3, 'A', 4.00, 12.00, '20251'],
      [userMap['247006111146'], '247006111146', 'IF70062004', 'Struktur Data dan Algoritma', 3, 'A', 4.00, 12.00, '20251'],
      // Semester 20242
      [userMap['247006111146'], '247006111146', 'IF70061001', 'Basis Data', 3, 'A', 4.00, 12.00, '20242'],
      [userMap['247006111146'], '247006111146', 'IF70061002', 'Matematika Diskrit', 3, 'A-', 3.75, 11.25, '20242'],
      // Semester 20241
      [userMap['247006111146'], '247006111146', 'IF70060001', 'Dasar Pemrograman', 3, 'A', 4.00, 12.00, '20241'],
      [userMap['247006111146'], '247006111146', 'IF70060002', 'Kalkulus I', 3, 'B', 3.00, 9.00, '20241']
    ];

    for (const t of transcripts) {
      await connection.query(
        `INSERT INTO transkrip (student_id, nim, kode_mk, nama_mk, sks, nilai_huruf, bobot, mutu, semester)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t
      );
    }

    // 7. Audit Log Awal
    await connection.query(
      `INSERT INTO audit_logs (subject, role, endpoint, method, device_id, ip_address, decision, reason, status_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'system',
        'system',
        '/system/seed',
        'POST',
        null,
        '127.0.0.1',
        'ALLOW',
        'Inisialisasi data seed Zero Trust berhasil dijalankan',
        200
      ]
    );

    console.log(`[SEED] Berhasil! Seluruh data seed telah dimasukkan.`);
  } catch (err) {
    console.error(`[SEED ERROR] Gagal melakukan seeding:`, err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSeed();
