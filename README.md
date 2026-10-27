# Sistem Nilai Akademik Berbasis Zero Trust Security (NIST SP 800-207)

Aplikasi web Sistem Nilai dan Transkrip Akademik **VERIKA** yang mengimplementasikan arsitektur keamanan **Zero Trust** sesuai standar **NIST SP 800-207**. Dibangun untuk memenuhi Tugas Praktikum Individu mata kuliah **Keamanan Informasi (KP70065004)**.

- **Nama Mahasiswa:** MUHAMMAD FARIEZ RIZIQ ILHAM
- **NIM:** 247006111146
- **Kelas:** Informatika E

---

## 1. Prinsip Zero Trust yang Diterapkan

Sistem ini menerapkan tiga pilar utama Zero Trust (NIST SP 800-207):

1. **Never Trust, Always Verify:**
   - Tidak ada entitas atau lalu lintas jaringan yang otomatis dipercaya meskipun berada di localhost atau jaringan internal.
   - Setiap permintaan wajib membawa Access Token JWT valid (masa berlaku 10 menit) serta identitas perangkat terdaftar (`X-Device-ID`).
   - Pengecekan kontekstual dilakukan secara dinamis: identitas pengguna, status perangkat terdaftar di basis data, rentang jam operasional (07:00 – 21:00 WIB), dan hak kepemilikan data.

2. **Least Privilege (Hak Akses Minimum):**
   - **Mahasiswa:** Hanya dapat melihat nilai semester berjalan miliknya sendiri dan transkrip miliknya sendiri. Permintaan transkrip NIM lain langsung ditolak (403 Forbidden).
   - **Dosen:** Hanya dapat melihat, mengubah, dan memfinalisasi nilai pada kelas mata kuliah yang diampunya dalam batas jam akses. Dosen dilarang mengedit nilai kelas dosen lain maupun nilai yang sudah berstatus final.
   - **Admin:** Memantau transkrip seluruh mahasiswa dan melihat audit log, namun dilarang keras memicu endpoint sinkronisasi antarlayanan.
   - **Service Nilai:** Menggunakan *Service Token* (khusus mesin, berlaku 5 menit) untuk memicu sinkronisasi ke Service Transkrip. Token pengguna manusia jenis apa pun ditolak pada endpoint sinkronisasi.

3. **Assume Breach (Asumsikan Pelanggaran Keamanan / Defense in Depth):**
   - Layanan Resource (*Service Nilai* dan *Service Transkrip*) tidak mempercayai API Gateway secara buta.
   - Setiap service internal menerapkan verifikasi ganda:
     1. Wajib memiliki header `X-Gateway-Secret`. Akses langsung ke port 3001 atau 3002 tanpa header ini ditolak (403 Forbidden).
     2. Memverifikasi tanda tangan kriptografis dan masa berlaku token JWT secara mandiri. Request dengan secret gateway tetapi tanpa token valid tetap ditolak (401 Unauthorized).

---

## 2. Arsitektur Sistem & Alur Komunikasi

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
            | (Jika ALLOW: Sisipkan X-Gateway-Secret & teruskan)    |
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

- **Frontend:** React 19 + TypeScript + Vite (Port 5173). Antarmuka web modern dengan dasbor khusus untuk 3 peran pengguna serta halaman laboratorium uji keamanan (*Security Demo*).
- **Backend API Gateway:** Node.js + Express (Port 3000) bertindak sebagai Policy Enforcement Point (PEP) & Policy Administrator (PA).
- **Service Nilai:** Node.js + Express (Port 3001) untuk pengelolaan nilai perkuliahan dan kelas.
- **Service Transkrip:** Node.js + Express (Port 3002) untuk pengelolaan transkrip akademik kumulatif mahasiswa.
- **Autentikasi & Otorisasi:** JSON Web Token (`jsonwebtoken`) dan hashing password `bcryptjs`.
- **Basis Data:** MySQL 8 / MariaDB (Laragon) dengan koneksi pool `mysql2/promise`.
- **Komunikasi Antarlayanan:** HTTP internal melalui Gateway menggunakan `fetch` native Node.js.
- **Pengujian:** Automated Test Suite native `node:test` (17 skenario Zero Trust).

---

## 4. Struktur Direktori Proyek

```
zero-trust/
├── database/
│   ├── schema.sql              # Skema DDL tabel MySQL (users, devices, classes, nilai, transkrip, audit_logs)
│   ├── migrate.js              # Script eksekusi migrasi DDL otomatis
│   └── seed.js                 # Script seeding data demo & hashing password
├── docs/
│   └── VERIKA-Zero-Trust.postman_collection.json # Koleksi request Postman / Thunder Client
├── packages/
│   ├── shared/                 # Modul bersama: db pool, jwt handler, time policy, audit logger
│   │   └── src/
│   │       ├── db.js
│   │       ├── jwt.js
│   │       ├── time.js
│   │       ├── audit.js
│   │       └── index.js
│   ├── gateway/                # Port 3000 (PEP, Auth Controller, Policy Engine, Proxy Forwarder)
│   │   └── src/
│   │       ├── server.js
│   │       ├── policy-engine.js
│   │       └── auth-controller.js
│   ├── service-nilai/          # Port 3001 (Resource Nilai, Finalisasi, & Service Auth)
│   │   └── src/
│   │       ├── server.js
│   │       └── middleware/verify-service-guard.js
│   ├── service-transkrip/      # Port 3002 (Resource Transkrip & Sinkronisasi Khusus Service Token)
│   │   └── src/
│   │       ├── server.js
│   │       └── middleware/verify-service-guard.js
│   └── frontend/               # Port 5173 (React + TypeScript + Vite)
│       ├── src/
│       │   ├── components/     # LoginPage, Navbar, MahasiswaDashboard, DosenDashboard, AdminDashboard, SecurityDemoPage
│       │   ├── context/        # AuthContext (In-memory token management & dynamic access hours)
│       │   ├── api/            # client.ts (Gateway-only HTTP client)
│       │   ├── types/          # Type definitions
│       │   └── utils/          # formatters.ts
│       └── vite.config.ts
├── scripts/
│   ├── start-all-services.js   # Menjalankan 3 backend sekaligus (Port 3000, 3001, 3002)
│   └── dev.js                  # Menjalankan seluruh sistem (Backend + Frontend)
├── test/
│   └── zero-trust.test.js      # 17 Automated Test Scenarios (node:test)
├── .env.example                # Template konfigurasi variabel lingkungan
├── .env                        # Konfigurasi aktif lokal
├── package.json                # Root konfigurasi monorepo npm workspaces
└── README.md
```

---

## 5. Prasyarat Sistem

1. **Node.js:** Versi 18+ (direkomendasikan Node.js v20 atau v24/v26).
2. **MySQL / MariaDB:** Layanan MySQL aktif pada port `3306` (misal via Laragon atau XAMPP).
3. **Web Browser:** Google Chrome, Microsoft Edge, atau Mozilla Firefox.

---

## 6. Pengaturan Basis Data (Laragon / phpMyAdmin)

1. Buka Laragon dan klik tombol **Start All** (pastikan MySQL berjalan pada port `3306`).
2. Konfigurasi default basis data pada `.env`:
   - Host: `127.0.0.1`
   - Port: `3306`
   - User: `root`
   - Password: `(kosong)`
3. Database `zero_trust_db` dibuat secara otomatis saat menjalankan script migrasi. Jika diperlukan, pembuatan manual dapat dilakukan melalui SQL:
   ```sql
   CREATE DATABASE IF NOT EXISTS zero_trust_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

---

## 7. Instalasi & Menjalankan Aplikasi

### A. Instalasi Dependensi
Buka terminal pada direktori root proyek:
```bash
npm install
```

### B. Migrasi dan Seeding Data Awal
Eksekusi migrasi skema tabel dan pengisian data:
```bash
npm run db:migrate
npm run db:seed
```

### C. Menjalankan Aplikasi
Pilih salah satu metode berikut:

**Opsi 1: Menjalankan Seluruh Sistem Sekaligus (Backend + Frontend)**
```bash
npm run dev
```

**Opsi 2: Menjalankan Secara Terpisah**
- Terminal 1 (Ketiga Layanan Backend: Port 3000, 3001, 3002):
  ```bash
  npm run dev:backend
  ```
- Terminal 2 (Frontend Web Vite: Port 5173):
  ```bash
  npm run dev:frontend
  ```

Buka antarmuka web di browser: **`http://localhost:5173`**

---

## 8. Daftar Akun Demo & Perangkat Terdaftar (*Registered Device ID*)

> **Kata sandi default seluruh akun demo:** `password123`

| No | Role | Username / Identifier | Nama Lengkap | Registered Device ID | Keterangan Hak Akses |
|:---:|---|---|---|---|---|
| 1 | **Mahasiswa** | `247006111146` | MUHAMMAD FARIEZ RIZIQ ILHAM | `DEV-MHS-001` | Akun utama; KHS 6 MK semester 5, Transkrip 84 SKS (IPK 3.90) |
| 2 | **Mahasiswa** | `247006111147` | Fathir Rizki Fadillah | `DEV-MHS-002` | KHS & transkrip pribadi (target uji Least Privilege) |
| 3 | **Mahasiswa** | `247006111148` | Aditya Pratama | `DEV-MHS-003` | KHS & transkrip pribadi |
| 4 | **Mahasiswa** | `247006111149` | Naufal Fauzan | `DEV-MHS-004` | KHS & transkrip pribadi |
| 5 | **Mahasiswa** | `247006111150` | Salsa Sabila | `DEV-MHS-005` | KHS & transkrip pribadi |
| 6 | **Mahasiswa** | `247006111151` | Raihan Alamsyah | `DEV-MHS-006` | KHS & transkrip pribadi |
| 7 | **Mahasiswa** | `247006111152` | Zahra Aulia | `DEV-MHS-007` | KHS & transkrip pribadi |
| 8 | **Mahasiswa** | `247006111153` | Daffa Ramadhan | `DEV-MHS-008` | KHS & transkrip pribadi |
| 9 | **Mahasiswa** | `247006111154` | Putri Rahmawati | `DEV-MHS-009` | KHS & transkrip pribadi |
| 10 | **Mahasiswa** | `247006111155` | Dimas Saputra | `DEV-MHS-010` | KHS & transkrip pribadi |
| 11 | **Dosen** | `dosen_alam` | Ir. Alam Rahmatulloh, S.T., M.T., MCE., IPM. | `DEV-DSN-001` | Pengampu Keamanan Informasi (`KP70065004` - Kelas E) |
| 12 | **Dosen** | `dosen_aradea` | Dr. Ir. Aradea, S.T., M.T., CIRR. | `DEV-DSN-002` | Pengampu Inteligensi Artifisial (`KP70065001` - Kelas A) |
| 13 | **Dosen** | `dosen_randi` | Ir. Randi Rizal, Ph.D. | `DEV-DSN-003` | Pengampu Komputasi Paralel & Terdistribusi (`KP70065002` - Kelas B) |
| 14 | **Dosen** | `dosen_reza` | Dr. Ir. R Reza El Akbar, S.Si., M.T., M.Kom. | `DEV-DSN-004` | Pengampu Pengujian & Implementasi Sistem (`KP70065007` - Kelas A) |
| 15 | **Dosen** | `dosen_eka` | Dr. Ir. Eka Wahyu Hidayat, S.T., M.T., MCE. | `DEV-DSN-005` | Pengampu Teori Bahasa dan Otomata (`KP70065006` - Kelas A) |
| 16 | **Dosen** | `dosen_firmansyah` | Ir. Firmansyah M.S.N., S.T., M.Kom., IPM. | `DEV-DSN-006` | Pengampu Komputasi Awan (`KP70065005` - Kelas A) |
| 17 | **Admin** | `admin` | Admin Akademik Pusat | `DEV-ADM-001` | Pengawasan Transkrip seluruh mahasiswa & Viewer Audit Log PEP |
| 18 | *Uji Ditolak* | *(semua user)* | *(perangkat tidak terdaftar)* | `DEV-UNKNOWN-999` | **Menghasilkan respon HTTP 403 Forbidden** |

---

## 9. Konfigurasi Lingkungan (`.env`)

Berkas `.env` terletak pada direktori root proyek:

```env
# Koneksi Database MySQL
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

# URL Internal & Eksternal
GATEWAY_URL=http://localhost:3000
NILAI_URL=http://localhost:3001
TRANSKRIP_URL=http://localhost:3002
FRONTEND_URL=http://localhost:5173
VITE_GATEWAY_URL=http://localhost:3000

# Rahasia Token JWT (HMAC-SHA256)
JWT_ACCESS_SECRET=zero_trust_access_super_secret_key_2026_verika
JWT_ACCESS_EXPIRES_IN=10m
JWT_REFRESH_EXPIRES_IN=1d

# Kredensial Service Nilai (Inter-service Authentication)
SERVICE_NILAI_CLIENT_ID=service-nilai-verika
SERVICE_NILAI_CLIENT_SECRET=svc_nilai_secret_key_9876543210
JWT_SERVICE_EXPIRES_IN=5m

# Kunci Rahasia Internal Gateway (Defense-in-depth)
GATEWAY_SECRET=gw_secret_internal_zero_trust_verika_2026

# Kebijakan Jam Akses Operasional (Asia/Jakarta)
APP_TIMEZONE=Asia/Jakarta
GRADE_EDIT_START=07:00
GRADE_EDIT_END=21:00
```

---

## 10. Daftar Endpoint API

Seluruh request klien luar diarahkan melalui API Gateway di `http://localhost:3000`.

### Endpoint Autentikasi & Pengawasan Gateway
- `POST /auth/login`: Autentikasi kredensial pengguna dan verifikasi perangkat terdaftar `X-Device-ID`. Menerbitkan access token (10 menit) dan refresh token (1 hari).
- `POST /auth/refresh`: Memperbarui access token dengan refresh token aktif dan melakukan rotasi token.
- `POST /auth/logout`: Mencabut (*revoke*) refresh token dari basis data.
- `POST /auth/service`: Menerbitkan token service (5 menit, `role: service`) untuk Service Nilai menggunakan client ID & secret.
- `GET /auth/me`: Mengembalikan data profil token pengguna dan jendela jam akses operasional dinamis.
- `GET /audit-logs`: Mengambil riwayat catatan evaluasi akses PEP (khusus role Admin).

### Endpoint Resource (Diteruskan Gateway ke Mikroservis)
- `GET /nilai` (ke Service Nilai):
  - Mahasiswa: Hanya melihat nilai miliknya sendiri.
  - Dosen: Hanya melihat nilai kelas yang diampunya.
- `PUT /nilai/:id` (ke Service Nilai):
  - Dosen pengampu mengubah nilai mahasiswa. Dibatasi jam operasional (07:00 – 21:00 WIB) dan hanya jika nilai belum final.
- `POST /kelas/:id/finalisasi` (ke Service Nilai):
  - Dosen pengampu memfinalisasi seluruh nilai pada kelas, mengunci data permanen, dan memicu sinkronisasi ke Service Transkrip melalui Gateway.
- `GET /transkrip/:nim` (ke Service Transkrip):
  - Mahasiswa: Hanya dapat melihat transkrip dengan NIM miliknya sendiri.
  - Admin: Dapat melihat transkrip seluruh mahasiswa.
- `POST /transkrip/sinkron` (ke Service Transkrip):
  - Khusus dipanggil dengan *Token Service* milik Service Nilai. Token pengguna manusia (mahasiswa, dosen, admin) ditolak 403 Forbidden.

---

## 11. Pengujian Otomatis (*Automated Tests*)

Sistem dilengkapi dengan 17 skenario pengujian otomatis berbasis `node:test` untuk memverifikasi seluruh kebijakan Zero Trust:

```bash
npm test
```

### 17 Skenario yang Diuji:
1. Login dengan kredensial valid dan Device ID terdaftar berhasil (200 OK).
2. Login dengan password salah ditolak (401 Unauthorized).
3. Login dengan Device ID yang tidak terdaftar ditolak (403 Forbidden).
4. Access token kedaluwarsa atau signature palsu ditolak (401 Unauthorized).
5. Refresh token yang dicabut saat logout ditolak (401 Unauthorized).
6. Mahasiswa dapat membaca nilai miliknya sendiri (200 OK).
7. Mahasiswa dilarang membaca transkrip milik mahasiswa lain (403 Forbidden - Least Privilege).
8. Dosen dapat mengakses nilai kelas yang diampunya (200 OK).
9. Dosen ditolak saat mencoba mengubah nilai di kelas dosen lain (403 Forbidden).
10. Dosen ditolak saat mengubah nilai yang sudah berstatus final (403 Forbidden).
11. Perubahan atau finalisasi di luar jam akses (07:00 – 21:00 WIB) ditolak (403 Forbidden).
12. Finalisasi kelas oleh dosen sah memicu sinkronisasi ke Service Transkrip (200 OK).
13. Mahasiswa, dosen, dan admin ditolak saat memanggil endpoint sinkronisasi transkrip (403 Forbidden).
14. Token service yang valid dari Service Nilai dapat digunakan untuk sinkronisasi (200 OK).
15. Request langsung ke Service Nilai (port 3001) tanpa `X-Gateway-Secret` ditolak (403 Forbidden).
16. Request ke service dengan `X-Gateway-Secret` tetapi tanpa token valid ditolak (401 Unauthorized - Assume Breach).
17. Audit log tercatat di basis data untuk keputusan `ALLOW` maupun `DENY`.

---

## 12. Pengujian Manual (Postman & cURL)

### A. Pengujian Menggunakan Postman / Thunder Client
Berkas koleksi telah disediakan dan dapat langsung diimpor ke Postman atau ekstensi Thunder Client di VS Code:
- **Lokasi Berkas:** `docs/VERIKA-Zero-Trust.postman_collection.json`
- **Cakupan:** 17 template request lengkap mencakup skenario Allow, Deny, rotasi token, sinkronisasi service token, hingga uji bypass direct port.

### B. Pengujian Menggunakan cURL

#### 1. Login Berhasil (Membawa Device ID Terdaftar)
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: DEV-MHS-001" \
  -d "{\"username\": \"247006111146\", \"password\": \"password123\"}"
```

#### 2. Login Ditolak (Device ID Tidak Terdaftar)
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: DEV-UNKNOWN-999" \
  -d "{\"username\": \"247006111146\", \"password\": \"password123\"}"
```
*Hasil:* HTTP 403 Forbidden - "Perangkat DEV-UNKNOWN-999 tidak terdaftar atau belum disetujui".

#### 3. Pelanggaran Least Privilege (Mahasiswa Membaca Transkrip NIM Lain)
```bash
curl -X GET http://localhost:3000/transkrip/247006111147 \
  -H "Authorization: Bearer <TOKEN_FARIEZ>" \
  -H "X-Device-ID: DEV-MHS-001"
```
*Hasil:* HTTP 403 Forbidden - "Pelanggaran Least Privilege: Mahasiswa dilarang melihat transkrip NIM 247006111147".

#### 4. Pelanggaran Assume Breach (Akses Langsung ke Port Service Tanpa Gateway Secret)
```bash
curl -X GET http://localhost:3001/nilai \
  -H "Authorization: Bearer <TOKEN_VALID>"
```
*Hasil:* HTTP 403 Forbidden - "Akses langsung ke Service Nilai ditolak. Seluruh permintaan wajib melewati API Gateway".

#### 5. Pelanggaran Sinkronisasi (Pengguna Memanggil Sinkronisasi Transkrip)
```bash
curl -X POST http://localhost:3000/transkrip/sinkron \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_ADMIN_ATAU_DOSEN>" \
  -H "X-Device-ID: DEV-ADM-001" \
  -d "{\"class_id\": 1, \"items\": []}"
```
*Hasil:* HTTP 403 Forbidden - "Akses ditolak: Endpoint sinkronisasi transkrip HANYA dapat diakses oleh Service Nilai dengan service token".

---

## 13. Batasan Implementasi

1. **Format Identifikasi Perangkat:** Pengenalan perangkat mengandalkan header `X-Device-ID` yang divalidasi terhadap basis data tabel `devices` (belum menggunakan modul TPM hardware atau sertifikat klien mTLS).
2. **Koneksi Jaringan Antar-Service:** Menggunakan protokol HTTP internal pada localhost dalam lingkungan monorepo satu mesin (belum menerapkan enkripsi mTLS antar-service terdistribusi).
3. **Basis Data Bersama:** Menggunakan satu instance basis data MySQL dengan skema tabel terisolasi sesuai ketentuan praktikum.
