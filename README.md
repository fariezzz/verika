# Sistem Nilai Akademik Berbasis Zero Trust Security (NIST SP 800-207)

Aplikasi web Sistem Nilai dan Transkrip Akademik terintegrasi yang mengimplementasikan arsitektur keamanan **Zero Trust** langsung pada level aplikasi. Dibangun untuk memenuhi Tugas Praktikum Individu mata kuliah **Keamanan Informasi (KP70065004)**, Jurusan Informatika, Fakultas Teknik, Universitas Siliwangi.

- **Nama Mahasiswa:** MUHAMMAD FARIEZ RIZIQ ILHAM
- **NIM:** 247006111146
- **Kelas:** Informatika E
- **Dosen Pengampu:** Vega Purwayoga, S.Kom., M.Kom.

---

## 1. Prinsip Zero Trust yang Diterapkan

Sistem ini menerapkan tiga pilar utama Zero Trust (NIST SP 800-207):

1. **Never Trust, Always Verify:**
   - Tidak ada entitas atau jaringan lokal yang otomatis dipercaya.
   - Setiap permintaan wajib membawa Access Token JWT yang valid (masa berlaku 10 menit) serta identitas perangkat terdaftar (`X-Device-ID`).
   - Pengecekan kontekstual dilakukan secara dinamis: identitas akun, status perangkat di database, rentang jam operasional (07:00 - 21:00 WIB), dan hak kepemilikan data.

2. **Least Privilege (Hak Akses Minimum):**
   - **Mahasiswa:** Hanya dapat membaca nilai miliknya sendiri dan transkrip miliknya sendiri. Akses ke transkrip NIM lain langsung diblokir (403 Forbidden).
   - **Dosen:** Hanya dapat melihat, mengubah, dan memfinalisasi nilai pada kelas mata kuliah yang diampunya dalam jam akses (07:00 - 21:00 WIB). Dosen dilarang mengedit nilai kelas dosen lain maupun nilai yang sudah final.
   - **Admin:** Dapat memantau transkrip seluruh mahasiswa dan melihat audit log, namun **dilarang keras** memicu sinkronisasi antarlayanan.
   - **Service Nilai:** Menggunakan *Service Token* (khusus mesin, berlaku 5 menit) untuk sinkronisasi nilai ke Service Transkrip. Token pengguna manusia jenis apa pun ditolak pada endpoint sinkronisasi.

3. **Assume Breach (Asumsikan Pelanggaran Keamanan):**
   - Layanan Resource (*Service Nilai* dan *Service Transkrip*) tidak mempercayai API Gateway secara buta (*defense-in-depth*).
   - Setiap service melakukan verifikasi ganda:
     1. Wajib memiliki header `X-Gateway-Secret`. Akses langsung ke port 3001 atau 3002 tanpa header ini ditolak.
     2. Wajib memverifikasi tanda tangan kriptografis dan masa berlaku token JWT secara mandiri. Request yang membawa gateway secret tetapi tanpa JWT sah tetap ditolak.

---

## 2. Arsitektur Sistem & Alur Permintaan

```
                                    +-----------------------------------------+
                                    |     Browser / Postman / cURL Client     |
                                    +-----------------------------------------+
                                                         |
                                                         | (1) HTTP Request + Bearer JWT + X-Device-ID
                                                         v
                                      +-------------------------------------+
                                      |     API GATEWAY (Port 3000)         |
                                      |   Policy Enforcement Point (PEP)    |
                                      +-------------------------------------+
                                            |                       |
                             Evaluasi Akses |                       | Pencatatan Keputusan
                                            v                       v
                         +-----------------------------+   +-------------------+
                         | Policy Engine & PA (Modul)  |   |    AUDIT LOGS     |
                         | - Verifikasi Token JWT      |   | - Waktu kejadian  |
                         | - Konteks Device ID         |   | - Subjek & Role   |
                         | - Kebijakan Jam Operasional |   | - Endpoint & Path |
                         | - Database Ownership Check  |   | - ALLOW / DENY    |
                         +-----------------------------+   | - Alasan teknis   |
                                        |                  +-------------------+
            +---------------------------+---------------------------+
            | (Jika ALLOW: Tambahkan X-Gateway-Secret & teruskan)  |
            v                                                       v
+------------------------------------+              +------------------------------------+
|     SERVICE NILAI (Port 3001)      |              |   SERVICE TRANSKRIP (Port 3002)    |
| - Verifikasi Ganda Gateway Secret  |              | - Verifikasi Ganda Gateway Secret  |
| - Verifikasi Ulang Token JWT       |              | - Verifikasi Ulang Token JWT       |
| - Data Nilai & Kelas Dosen         |              | - Data Transkrip Akademik Mahasiswa|
+------------------------------------+              +------------------------------------+
            |                                                       ^
            | (Alur Sinkronisasi Antarlayanan)                      |
            | 1. Meminta Service Token: POST /auth/service         |
            | 2. Panggil Gateway: POST /transkrip/sinkron --------> |
            +-------------------------------------------------------+
                                        |
                                        v
                 +---------------------------------------------+
                 |    MySQL / MariaDB (Database: zero_trust_db)|
                 |  users, devices, classes, nilai, transkrip  |
                 +---------------------------------------------+
```

---

## 3. Teknologi yang Digunakan

- **Frontend:** React 19 + TypeScript + Vite (Port 5173). Desain antarmuka akademik resmi Universitas Siliwangi (SINTESYS & Gapura Access).
- **Backend API Gateway:** Express (Port 3000) bertindak sebagai Policy Enforcement Point (PEP) & Policy Administrator (PA).
- **Service Nilai:** Express (Port 3001) untuk pengelolaan nilai dan kelas.
- **Service Transkrip:** Express (Port 3002) untuk pengelolaan transkrip akademik mahasiswa.
- **Autentikasi & Otorisasi:** JSON Web Token (`jsonwebtoken`) dan hashing password `bcryptjs`.
- **Basis Data:** MySQL 8 / MariaDB (Laragon) menggunakan pool koneksi `mysql2/promise`.
- **Komunikasi Antarlayanan:** HTTP internal melalui Gateway menggunakan `fetch` native Node.js.
- **Pengujian:** Automated Test Suite native `node:test` (17 skenario Zero Trust lengkap).

---

## 4. Struktur Direktori Monorepo

```
zero-trust/
├── database/
│   ├── schema.sql              # Skema tabel DDL MySQL (users, devices, classes, nilai, transkrip, audit_logs)
│   ├── seed.sql                # Data awal SQL
│   ├── migrate.js              # Script eksekusi migrasi DDL otomatis
│   └── seed.js                 # Script seeding data demo & hashing password
├── docs/
│   └── demo-script.md          # Naskah presentasi video demo (durasi 6-9 menit)
├── packages/
│   ├── shared/                 # Modul bersama: db pool, jwt handler, time policy, audit logger
│   │   └── src/
│   │       ├── db.js
│   │       ├── jwt.js
│   │       ├── time.js
│   │       └── audit.js
│   ├── gateway/                # Port 3000 (PEP, Auth, Policy Engine, Proxy)
│   │   └── src/
│   │       ├── server.js
│   │       ├── policy-engine.js
│   │       └── auth-controller.js
│   ├── service-nilai/          # Port 3001 (Resource Nilai & Finalisasi)
│   │   └── src/
│   │       ├── server.js
│   │       └── middleware/verify-service-guard.js
│   ├── service-transkrip/      # Port 3002 (Resource Transkrip & Sinkronisasi)
│   │   └── src/
│   │       ├── server.js
│   │       └── middleware/verify-service-guard.js
│   └── frontend/               # Port 5173 (React + TypeScript + Vite)
│       ├── src/
│       │   ├── components/     # LoginPage, Navbar, MahasiswaDashboard, DosenDashboard, AdminDashboard
│       │   ├── context/        # AuthContext (In-memory token management)
│       │   └── api/client.ts   # Gateway-only API Client
│       └── vite.config.ts
├── scripts/
│   ├── start-all-services.js   # Menjalankan 3 backend sekaligus (Port 3000, 3001, 3002)
│   └── dev.js                  # Menjalankan seluruh sistem (Backend + Frontend)
├── test/
│   └── zero-trust.test.js      # 17 Automated Test Scenarios (node:test)
├── .env.example                # Template konfigurasi variabel lingkungan
├── .env                        # Konfigurasi aktif lokal
├── package.json                # Root package konfigurasi npm workspaces
└── README.md
```

---

## 5. Prasyarat Instalasi

1. **Node.js:** Versi 18+ (disarankan Node.js v20 atau v26).
2. **Laragon / XAMPP:** Memastikan layanan MySQL aktif pada port `3306`.
3. **Web Browser:** Google Chrome, Edge, atau Firefox.

---

## 6. Pengaturan Basis Data (Laragon / phpMyAdmin)

1. Buka Laragon dan klik **Start All** (pastikan MySQL berjalan di port `3306`).
2. Kredensial default Laragon:
   - Host: `127.0.0.1`
   - Port: `3306`
   - User: `root`
   - Password: `(kosong)`
3. Database `zero_trust_db` akan dibuat secara otomatis saat menjalankan script migrasi. Anda juga dapat membuatnya secara manual di HeidiSQL/phpMyAdmin:
   ```sql
   CREATE DATABASE IF NOT EXISTS zero_trust_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

---

## 7. Instalasi & Menjalankan Aplikasi

### A. Instalasi Dependensi
Buka terminal (Command Prompt / PowerShell / Terminal WSL) di folder proyek:
```bash
npm install
```

### B. Migrasi dan Seeding Data
Jalankan migrasi skema dan pengisian data awal:
```bash
npm run db:migrate
npm run db:seed
```

### C. Menjalankan Aplikasi
Anda dapat memilih salah satu cara berikut:

**Opsi 1: Menjalankan Seluruh Sistem (Backend + Frontend Sekaligus)**
```bash
npm run dev
```

**Opsi 2: Menjalankan Secara Terpisah**
- Terminal 1 (Ketiga Backend Gateway + Nilai + Transkrip):
  ```bash
  npm run dev:backend
  ```
- Terminal 2 (Frontend Web Vite):
  ```bash
  npm run dev:frontend
  ```

Akses aplikasi web di browser: **`http://localhost:5173`**

---

## 8. Daftar Akun Demo & Perangkat Terdaftar

Seluruh akun demo menggunakan kata sandi: **`password123`**

| Role | Username / NIM / NIP | Nama Lengkap | Registered Device ID | Keterangan Akses |
|---|---|---|---|---|
| **Mahasiswa** | `247006111146` | MUHAMMAD FARIEZ RIZIQ ILHAM | `DEV-MHS-001` | Nilai miliknya & Transkrip IPK 3.90 (84 SKS) |
| **Mahasiswa** | `247006111147` | Fathir Rizki Fadillah | `DEV-MHS-002` | Nilai & transkrip pribadi |
| **Mahasiswa** | `247006111148` | Aditya Pratama | `DEV-MHS-003` | Nilai & transkrip pribadi |
| **Dosen** | `dosen_vega` | Vega Purwayoga, S.Kom., M.Kom. | `DEV-DSN-001` | Mengampu Kelas Keamanan Informasi (KP70065004 - Kelas E) |
| **Dosen** | `dosen_alam` | Alam Rahmatulloh, S.T., M.T. | `DEV-DSN-002` | Mengampu Kelas Inteligensi Artifisial (IF70063001 - Kelas A) |
| **Admin** | `admin` | Admin Akademik UNSIL | `DEV-ADM-001` | Transkrip seluruh mahasiswa & Audit Log PEP |

*Catatan Pengujian Zero Trust:*
- Untuk menguji penolakan perangkat tidak terdaftar, gunakan Device ID acak seperti: `DEV-UNKNOWN-999` (akan ditolak dengan kode status 403 Forbidden).

---

## 9. Konfigurasi Lingkungan (`.env`)

File `.env` terletak di root proyek:

```env
# Koneksi Database Laragon
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=zero_trust_db

# Port Layanan
GATEWAY_PORT=3000
NILAI_PORT=3001
TRANSKRIP_PORT=3002
FRONTEND_PORT=5173

# Rahasia Token JWT
JWT_ACCESS_SECRET=zero_trust_access_super_secret_key_2026_unsil
JWT_REFRESH_SECRET=zero_trust_refresh_super_secret_key_2026_unsil
JWT_ACCESS_EXPIRES_IN=10m
JWT_REFRESH_EXPIRES_IN=1d

# Kredensial Service Nilai (Inter-service Authentication)
SERVICE_NILAI_CLIENT_ID=service-nilai-unsil
SERVICE_NILAI_CLIENT_SECRET=svc_nilai_secret_key_9876543210
JWT_SERVICE_EXPIRES_IN=5m

# Kunci Rahasia Internal Gateway (Defense-in-depth)
GATEWAY_SECRET=gw_secret_internal_zero_trust_unsil_2026

# Kebijakan Jam Akses Operasional (Asia/Jakarta)
APP_TIMEZONE=Asia/Jakarta
GRADE_EDIT_START=07:00
GRADE_EDIT_END=21:00
```

---

## 10. Daftar Endpoint API

Seluruh request klien eksternal **wajib** menuju ke API Gateway di `http://localhost:3000`.

### Endpoint Autentikasi Gateway
- `POST /auth/login`: Autentikasi kredensial pengguna dan verifikasi perangkat terdaftar `X-Device-ID`. Menerbitkan access token (10 menit) dan refresh token (1 hari).
- `POST /auth/refresh`: Memperbarui access token dengan refresh token aktif dan melakukan rotasi token.
- `POST /auth/logout`: Mencabut (*revoke*) refresh token dari basis data.
- `POST /auth/service`: Menerbitkan token service (5 menit, `role: service`) untuk Service Nilai menggunakan client ID & secret.
- `GET /auth/me`: Mengembalikan data profil token pengguna saat ini.
- `GET /audit-logs`: Mengambil riwayat catatan evaluasi akses PEP (khusus role Admin).

### Endpoint Resource (Diteruskan Gateway ke Service)
- `GET /nilai` (ke Service Nilai):
  - Mahasiswa: Hanya menampilkan nilai milik dirinya sendiri.
  - Dosen: Hanya menampilkan nilai pada kelas yang diampunya.
- `PUT /nilai/:id` (ke Service Nilai):
  - Dosen pengampu mengubah nilai mahasiswa. Dibatasi jam operasional (07:00 - 21:00 WIB) dan hanya jika nilai belum final.
- `POST /kelas/:id/finalisasi` (ke Service Nilai):
  - Dosen pengampu memfinalisasi seluruh nilai pada kelas, mengunci data, dan memicu sinkronisasi ke Service Transkrip melalui Gateway.
- `GET /transkrip/:nim` (ke Service Transkrip):
  - Mahasiswa: Hanya boleh melihat transkrip dengan NIM miliknya sendiri.
  - Admin: Dapat melihat transkrip seluruh NIM mahasiswa.
- `POST /transkrip/sinkron` (ke Service Transkrip):
  - Khusus dipanggil dengan *Token Service* milik Service Nilai. Token user apa pun (mahasiswa, dosen, admin) ditolak 403 Forbidden.

---

## 11. Menjalankan Automated Tests

Aplikasi dilengkapi dengan 17 skenario pengujian otomatis berbasis `node:test` yang mencakup seluruh poin persyaratan tugas:

```bash
npm test
```

### Ringkasan 17 Skenario Uji:
1. Login dengan kredensial valid dan Device ID terdaftar berhasil.
2. Login dengan password salah ditolak (401 Unauthorized).
3. Login dengan Device ID yang tidak terdaftar ditolak (403 Forbidden).
4. Access token kedaluwarsa atau signature palsu ditolak (401 Unauthorized).
5. Refresh token yang dicabut saat logout ditolak (401 Unauthorized).
6. Mahasiswa dapat membaca nilai miliknya sendiri.
7. Mahasiswa dilarang membaca transkrip milik mahasiswa lain (Least Privilege).
8. Dosen dapat mengakses nilai kelas yang diampunya.
9. Dosen ditolak saat mencoba mengubah nilai di kelas dosen lain (403 Forbidden).
10. Dosen ditolak saat mengubah nilai yang sudah berstatus final (403 Forbidden).
11. Perubahan atau finalisasi di luar jam akses (07:00 - 21:00 WIB) ditolak (403 Forbidden).
12. Finalisasi kelas oleh dosen sah memicu sinkronisasi ke Service Transkrip.
13. Mahasiswa, dosen, dan admin ditolak saat memanggil endpoint sinkronisasi transkrip (403 Forbidden).
14. Token service yang valid dari Service Nilai dapat digunakan untuk sinkronisasi.
15. Request langsung ke Service Nilai (port 3001) tanpa `X-Gateway-Secret` ditolak (403 Forbidden).
16. Request ke service dengan `X-Gateway-Secret` tetapi tanpa token valid ditolak (*Assume Breach*).
17. Audit log tercatat di basis data untuk keputusan `ALLOW` maupun `DENY`.

---

## 12. Panduan Pengujian Manual Menggunakan cURL

Berikut adalah contoh perintah cURL untuk mendemonstrasikan perilaku Zero Trust:

### 1. Login Berhasil (Membawa Device ID Terdaftar)
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: DEV-MHS-001" \
  -d "{\"username\": \"247006111146\", \"password\": \"password123\"}"
```

### 2. Login Ditolak (Device ID Tidak Terdaftar)
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: DEV-UNKNOWN-999" \
  -d "{\"username\": \"247006111146\", \"password\": \"password123\"}"
```
*Hasil:* HTTP 403 Forbidden - "Perangkat DEV-UNKNOWN-999 tidak terdaftar atau belum disetujui".

### 3. Pelanggaran Least Privilege (Mahasiswa Membaca Transkrip NIM Lain)
```bash
curl -X GET http://localhost:3000/transkrip/247006111147 \
  -H "Authorization: Bearer <TOKEN_MAHASISWA_247006111146>" \
  -H "X-Device-ID: DEV-MHS-001"
```
*Hasil:* HTTP 403 Forbidden - "Pelanggaran Least Privilege: Mahasiswa dilarang melihat transkrip NIM 247006111147".

### 4. Pelanggaran Assume Breach (Akses Langsung ke Port Service Tanpa Gateway Secret)
```bash
curl -X GET http://localhost:3001/nilai \
  -H "Authorization: Bearer <TOKEN_MAHASISWA>"
```
*Hasil:* HTTP 403 Forbidden - "Akses langsung ke Service Nilai ditolak. Seluruh permintaan wajib melewati API Gateway".

### 5. Pelanggaran Sinkronisasi (Admin Mencoba Memanggil Sinkronisasi Transkrip)
```bash
curl -X POST http://localhost:3000/transkrip/sinkron \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "X-Device-ID: DEV-ADM-001" \
  -d "{\"class_id\": 1, \"items\": []}"
```
*Hasil:* HTTP 403 Forbidden - "Akses ditolak: Endpoint sinkronisasi transkrip HANYA dapat diakses oleh Service Nilai dengan service token".

---

## 13. Batasan Implementasi yang Ada

1. **Format Perangkat:** Identifikasi perangkat mengandalkan header `X-Device-ID` yang dicocokkan dengan basis data pengguna terdaftar (belum mencakup verifikasi sertifikat mTLS hardware/TPM).
2. **Koneksi Jaringan Antar-Service:** Menggunakan HTTP internal pada localhost dalam lingkungan satu komputer (belum menggunakan enkripsi HTTPS/TLS internal mTLS antar-service pada cluster terdistribusi).
3. **Database Bersama:** Menggunakan satu basis data MySQL bersama dengan tabel terisolasi sesuai ketentuan rekomendasi penugasan praktikum.
