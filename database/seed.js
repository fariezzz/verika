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

    // 1. Pengguna Awal: Admin, 6 Dosen Pengampu, dan 10 Mahasiswa
    console.log(`[SEED] Menambahkan data 1 admin, 6 dosen pengampu, dan 10 mahasiswa...`);
    const users = [
      // Admin
      ['admin', defaultPasswordHash, 'admin', 'Admin Akademik Pusat', 'ADM001', 'admin@kampus.ac.id'],

      // Dosen Pengampu Sesuai Jadwal Kuliah (Non-KKN)
      ['dosen_alam', defaultPasswordHash, 'dosen', 'Ir. Alam Rahmatulloh, S.T., M.T., MCE., IPM.', '198802022016051002', 'alam@kampus.ac.id'],
      ['dosen_aradea', defaultPasswordHash, 'dosen', 'Dr. Ir. Aradea, S.T., M.T., CIRR.', '197501012005011001', 'aradea@kampus.ac.id'],
      ['dosen_randi', defaultPasswordHash, 'dosen', 'Ir. Randi Rizal, Ph.D.', '198003032008041002', 'randi@kampus.ac.id'],
      ['dosen_reza', defaultPasswordHash, 'dosen', 'Dr. Ir. R Reza El Akbar, S.Si., M.T., M.Kom.', '197905052006041003', 'reza@kampus.ac.id'],
      ['dosen_eka', defaultPasswordHash, 'dosen', 'Dr. Ir. Eka Wahyu Hidayat, S.T., M.T., MCE.', '198108082008121002', 'eka@kampus.ac.id'],
      ['dosen_firmansyah', defaultPasswordHash, 'dosen', 'Ir. Firmansyah M.S.N., S.T., M.Kom., IPM.', '198304042010121001', 'firmansyah@kampus.ac.id'],

      // 10 Mahasiswa
      ['247006111146', defaultPasswordHash, 'mahasiswa', 'Muhammad Fariez Riziq Ilham', '247006111146', '247006111146@student.kampus.ac.id'],
      ['247006111147', defaultPasswordHash, 'mahasiswa', 'Fathir Rizki Fadillah', '247006111147', '247006111147@student.kampus.ac.id'],
      ['247006111148', defaultPasswordHash, 'mahasiswa', 'Aditya Pratama', '247006111148', '247006111148@student.kampus.ac.id'],
      ['247006111149', defaultPasswordHash, 'mahasiswa', 'Naufal Fauzan', '247006111149', '247006111149@student.kampus.ac.id'],
      ['247006111150', defaultPasswordHash, 'mahasiswa', 'Salsa Sabila', '247006111150', '247006111150@student.kampus.ac.id'],
      ['247006111151', defaultPasswordHash, 'mahasiswa', 'Raihan Alamsyah', '247006111151', '247006111151@student.kampus.ac.id'],
      ['247006111152', defaultPasswordHash, 'mahasiswa', 'Zahra Aulia', '247006111152', '247006111152@student.kampus.ac.id'],
      ['247006111153', defaultPasswordHash, 'mahasiswa', 'Daffa Ramadhan', '247006111153', '247006111153@student.kampus.ac.id'],
      ['247006111154', defaultPasswordHash, 'mahasiswa', 'Putri Rahmawati', '247006111154', '247006111154@student.kampus.ac.id'],
      ['247006111155', defaultPasswordHash, 'mahasiswa', 'Dimas Saputra', '247006111155', '247006111155@student.kampus.ac.id']
    ];

    for (const u of users) {
      await connection.query(
        `INSERT INTO users (username, password_hash, role, nama, identifier, email) VALUES (?, ?, ?, ?, ?, ?)`,
        u
      );
    }

    // Ambil mapping User ID
    const [userRows] = await connection.query('SELECT id, username FROM users');
    const userMap = {};
    for (const row of userRows) {
      userMap[row.username] = row.id;
    }

    // 2. Perangkat Terdaftar (Devices - Konteks Zero Trust)
    console.log(`[SEED] Menambahkan perangkat terdaftar untuk seluruh akun...`);
    const devices = [
      [userMap['admin'], 'DEV-ADM-001', 'Workstation Admin Pusat', true],
      [userMap['dosen_alam'], 'DEV-DSN-001', 'ThinkPad Dosen Alam', true],
      [userMap['dosen_aradea'], 'DEV-DSN-002', 'MacBook Air Dosen Aradea', true],
      [userMap['dosen_randi'], 'DEV-DSN-003', 'Dell Latitude Dosen Randi', true],
      [userMap['dosen_reza'], 'DEV-DSN-004', 'HP EliteBook Dosen Reza', true],
      [userMap['dosen_eka'], 'DEV-DSN-005', 'Lenovo ThinkPad Dosen Eka', true],
      [userMap['dosen_firmansyah'], 'DEV-DSN-006', 'Asus ZenBook Dosen Firmansyah', true],

      [userMap['247006111146'], 'DEV-MHS-001', 'Laptop Fariez', true],
      [userMap['247006111147'], 'DEV-MHS-002', 'Laptop Fathir', true],
      [userMap['247006111148'], 'DEV-MHS-003', 'Laptop Aditya', true],
      [userMap['247006111149'], 'DEV-MHS-004', 'Laptop Naufal', true],
      [userMap['247006111150'], 'DEV-MHS-005', 'Laptop Salsa', true],
      [userMap['247006111151'], 'DEV-MHS-006', 'Laptop Raihan', true],
      [userMap['247006111152'], 'DEV-MHS-007', 'Laptop Zahra', true],
      [userMap['247006111153'], 'DEV-MHS-008', 'Laptop Daffa', true],
      [userMap['247006111154'], 'DEV-MHS-009', 'Laptop Putri', true],
      [userMap['247006111155'], 'DEV-MHS-010', 'Laptop Dimas', true]
    ];

    for (const d of devices) {
      await connection.query(
        `INSERT INTO devices (user_id, device_id, device_name, is_trusted) VALUES (?, ?, ?, ?)`,
        d
      );
    }

    // 3. Masukkan Mata Kuliah Sesuai Jadwal Kuliah (Non-KKN)
    console.log(`[SEED] Menambahkan 6 kelas mata kuliah Semester 5 dan 1 kelas historis final...`);
    const classes = [
      // 1. Keamanan Informasi (3 SKS) - Dosen: Ir. Alam Rahmatulloh
      ['KP70065004', 'Keamanan Informasi', 3, '20261', 'E', userMap['dosen_alam'], false, null, 'none'],

      // 2. Inteligensi Artifisial (3 SKS) - Dosen: Dr. Ir. Aradea
      ['KP70065001', 'Inteligensi Artifisial', 3, '20261', 'A', userMap['dosen_aradea'], false, null, 'none'],

      // 3. Komputasi Paralel dan Terdistribusi (3 SKS) - Dosen: Ir. Randi Rizal
      ['KP70065002', 'Komputasi Paralel dan Terdistribusi', 3, '20261', 'B', userMap['dosen_randi'], false, null, 'none'],

      // 4. Pengujian dan Implementasi Sistem (2 SKS) - Dosen: Dr. Ir. R Reza El Akbar
      ['KP70065007', 'Pengujian dan Implementasi Sistem', 2, '20261', 'A', userMap['dosen_reza'], false, null, 'none'],

      // 5. Teori Bahasa dan Otomata (3 SKS) - Dosen: Dr. Ir. Eka Wahyu Hidayat
      ['KP70065006', 'Teori Bahasa dan Otomata', 3, '20261', 'A', userMap['dosen_eka'], false, null, 'none'],

      // 6. Komputasi Awan (2 SKS) - Dosen: Ir. Firmansyah Maulana Sugiartana Nursuwars
      ['KP70065005', 'Komputasi Awan', 2, '20261', 'A', userMap['dosen_firmansyah'], false, null, 'none'],

      // 7. Kelas Historis Semester Lalu yang Sudah Final (Pemrograman Web) - Dosen: Ir. Randi Rizal
      ['IF70063004', 'Pemrograman Web', 3, '20252', 'A', userMap['dosen_randi'], true, new Date('2025-07-15 10:00:00'), 'synced']
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

    // 4. Pendaftaran 10 Mahasiswa ke Kelas (Sebagian besar mengambil semua, beberapa tidak ambil 1-2 MK)
    console.log(`[SEED] Menghubungkan 10 mahasiswa ke kelas mata kuliah...`);
    const studentUsernames = [
      '247006111146', '247006111147', '247006111148', '247006111149', '247006111150',
      '247006111151', '247006111152', '247006111153', '247006111154', '247006111155'
    ];

    const currentCourseCodes = [
      'KP70065004', // Keamanan Informasi
      'KP70065001', // Inteligensi Artifisial
      'KP70065002', // Komputasi Paralel dan Terdistribusi
      'KP70065007', // Pengujian dan Implementasi Sistem
      'KP70065006', // Teori Bahasa dan Otomata
      'KP70065005'  // Komputasi Awan
    ];

    // Penentuan mata kuliah yang dilewati oleh mahasiswa tertentu (1-2 MK)
    const skippedCoursesPerStudent = {
      '247006111149': ['KP70065005'],               // Naufal tidak ambil Komputasi Awan
      '247006111151': ['KP70065007'],               // Raihan tidak ambil Pengujian Sistem
      '247006111153': ['KP70065005', 'KP70065006'], // Daffa tidak ambil Komputasi Awan & TBO
      '247006111155': ['KP70065006']                // Dimas tidak ambil TBO
    };

    const classStudentRows = [];
    const gradeRows = [];

    // Helper penentu huruf & bobot
    function scoreGrade(num) {
      if (num >= 85) return { h: 'A', b: 4.00 };
      if (num >= 80) return { h: 'A-', b: 3.75 };
      if (num >= 75) return { h: 'B+', b: 3.50 };
      if (num >= 70) return { h: 'B', b: 3.00 };
      if (num >= 65) return { h: 'B-', b: 2.75 };
      if (num >= 60) return { h: 'C+', b: 2.50 };
      return { h: 'C', b: 2.00 };
    }

    // Nilai dasar acak realistis per mahasiswa
    const studentBaseScores = {
      '247006111146': 88.5, // Fariez
      '247006111147': 84.0, // Fathir
      '247006111148': 79.5, // Aditya
      '247006111149': 82.0, // Naufal
      '247006111150': 86.5, // Salsa
      '247006111151': 77.0, // Raihan
      '247006111152': 89.0, // Zahra
      '247006111153': 75.5, // Daffa
      '247006111154': 85.0, // Putri
      '247006111155': 81.0  // Dimas
    };

    for (const username of studentUsernames) {
      const studentId = userMap[username];
      const skipped = skippedCoursesPerStudent[username] || [];

      for (let i = 0; i < currentCourseCodes.length; i++) {
        const kodeMk = currentCourseCodes[i];
        if (skipped.includes(kodeMk)) continue; // Lewati jika tidak diambil

        const classId = classMap[kodeMk];
        classStudentRows.push([classId, studentId]);

        // Variasi nilai per mata kuliah
        const variation = ((i * 3 + studentId * 5) % 9) - 3;
        const score = Math.min(96, Math.max(70, studentBaseScores[username] + variation));
        const { h, b } = scoreGrade(score);

        gradeRows.push([classId, studentId, score, h, b, false]);
      }
    }

    // Hubungkan mahasiswa Dimas ke kelas historis yang sudah final (Pemrograman Web) untuk pengujian status final
    classStudentRows.push([classMap['IF70063004'], userMap['247006111155']]);
    gradeRows.push([classMap['IF70063004'], userMap['247006111155'], 92.00, 'A', 4.00, true]);

    for (const cs of classStudentRows) {
      await connection.query(
        `INSERT INTO class_students (class_id, student_id) VALUES (?, ?)`,
        cs
      );
    }

    console.log(`[SEED] Menambahkan ${gradeRows.length} entri nilai mahasiswa...`);
    for (const g of gradeRows) {
      await connection.query(
        `INSERT INTO nilai (class_id, student_id, nilai_angka, nilai_huruf, bobot, is_final)
         VALUES (?, ?, ?, ?, ?, ?)`,
        g
      );
    }

    // 6. Masukkan Transkrip Akademik Historis untuk Fariez (IPK 3.90, 84 SKS)
    console.log(`[SEED] Menambahkan transkrip historis untuk Fariez (IPK 3.90, 84 SKS)...`);
    const transcripts = [
      // Semester 20252
      [userMap['247006111146'], '247006111146', 'IF70063002', 'Komputasi Paralel dan Terdistribusi', 3, 'A', 4.00, 12.00, '20252'],
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
