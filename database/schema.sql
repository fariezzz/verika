-- Skema Basis Data Zero Trust Security - Sistem Nilai Akademik
-- VERIKA Academic System (KP70065004 - Praktikum 2)

CREATE DATABASE IF NOT EXISTS `zero_trust_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `zero_trust_db`;

-- 1. Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'dosen', 'mahasiswa') NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `identifier` VARCHAR(50) NULL, -- NIM (mahasiswa) atau NIP (dosen)
  `email` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Perangkat Terdaftar (Registered Devices - Konteks Keamanan)
CREATE TABLE IF NOT EXISTS `devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `device_id` VARCHAR(100) NOT NULL UNIQUE,
  `device_name` VARCHAR(100) NOT NULL,
  `is_trusted` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_device_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Kelas Mata Kuliah (Classes)
CREATE TABLE IF NOT EXISTS `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_mk` VARCHAR(20) NOT NULL,
  `nama_mk` VARCHAR(100) NOT NULL,
  `sks` INT NOT NULL DEFAULT 3,
  `semester` VARCHAR(20) NOT NULL DEFAULT '20261',
  `kelas` VARCHAR(10) NOT NULL DEFAULT 'A',
  `dosen_id` INT NOT NULL,
  `is_finalized` BOOLEAN DEFAULT FALSE,
  `finalized_at` TIMESTAMP NULL,
  `sync_status` ENUM('none', 'pending', 'synced', 'failed') DEFAULT 'none',
  `sync_message` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_class_dosen` FOREIGN KEY (`dosen_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Relasi Mahasiswa dan Kelas (Class Students)
CREATE TABLE IF NOT EXISTS `class_students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  CONSTRAINT `fk_cs_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cs_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_student_class` (`class_id`, `student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Nilai Mahasiswa (Grades)
CREATE TABLE IF NOT EXISTS `nilai` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `nilai_angka` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `nilai_huruf` VARCHAR(2) NOT NULL DEFAULT 'E',
  `bobot` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  `is_final` BOOLEAN DEFAULT FALSE,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_nilai_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nilai_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_student_grade` (`class_id`, `student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Transkrip Akademik (Academic Transcript)
CREATE TABLE IF NOT EXISTS `transkrip` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `nim` VARCHAR(50) NOT NULL,
  `kode_mk` VARCHAR(20) NOT NULL,
  `nama_mk` VARCHAR(100) NOT NULL,
  `sks` INT NOT NULL,
  `nilai_huruf` VARCHAR(2) NOT NULL,
  `bobot` DECIMAL(3,2) NOT NULL,
  `mutu` DECIMAL(5,2) NOT NULL,
  `semester` VARCHAR(20) NOT NULL,
  `synced_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_transkrip_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_student_mk` (`student_id`, `kode_mk`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel Sesi Refresh Token (Dapat Dicabut / Revocable)
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL UNIQUE,
  `device_id` VARCHAR(100) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `revoked` BOOLEAN DEFAULT FALSE,
  `revoked_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_refresh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabel Audit Log (Pencatatan Keputusan Policy Enforcement Point)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `subject` VARCHAR(100) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `endpoint` VARCHAR(255) NOT NULL,
  `method` VARCHAR(10) NOT NULL,
  `device_id` VARCHAR(100) NULL,
  `ip_address` VARCHAR(50) NULL,
  `decision` ENUM('ALLOW', 'DENY') NOT NULL,
  `reason` TEXT NOT NULL,
  `status_code` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
