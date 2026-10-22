# Panduan Naskah Video Demonstrasi (Durasi 6–9 Menit)
## Tugas Praktikum Individu: Zero Trust Security Sistem Nilai Akademik
**Keamanan Informasi (KP70065004) • Informatika • VERIKA Academic System**

- **Presenter:** Muhammad Fariez Riziq Ilham (NIM: 247006111146)
- **Target Durasi:** 7 menit 30 detik (rentang aman 6–9 menit)

---

### Ikhtisar Pembagian Waktu (Timeline)

| Menit | Segmen Presentasi | Fokus Kode / Demonstrasi Layar |
|---|---|---|
| **00:00 - 01:00** | Pendahuluan, Identitas, & Konsep Zero Trust | Judul, Slide/README Arsitektur NIST SP 800-207 |
| **01:00 - 02:30** | Autentikasi, JWT, Konteks Perangkat (`X-Device-ID`), & Skenario Deny Device | `auth-controller.js`, `jwt.js`, Form Login Web |
| **02:30 - 04:00** | Policy Engine, Least Privilege Mahasiswa & Dosen | `policy-engine.js`, Dashboard Mahasiswa, Uji Coba NIM Lain |
| **04:00 - 05:30** | Kebijakan Jam Akses (07:00-21:00 WIB) & Pengubahan Nilai Dosen | `time.js`, Dashboard Dosen, Modal Edit Nilai |
| **05:30 - 07:00** | Finalisasi Nilai & Alur Sinkronisasi Transkrip Antarlayanan | `server.js` Service Nilai, `server.js` Service Transkrip |
| **07:00 - 08:00** | Defense-in-Depth (*Assume Breach*) & Verifikasi Ganda | `verify-service-guard.js`, Uji cURL Direct Port |
| **08:00 - 09:00** | Audit Log PEP & Penutup | Halaman Audit Log Admin, Tabel Basis Data, Kesimpulan |

---

### Rincian Naskah & Aksi Per Segmen

#### 1. Pendahuluan & Gambaran Arsitektur (Menit 00:00 - 01:00)
- **Narasi Pembicara:**
  > "Selamat pagi / Assalamu'alaikum wr. wb. Perkenalkan, saya Muhammad Fariez Riziq Ilham, NIM 247006111146 dari kelas Informatika E. Pada kesempatan ini saya akan mendemonstrasikan implementasi VERIKA, yaitu sistem nilai dan transkrip akademik berbasis arsitektur Zero Trust sesuai standar NIST SP 800-207 untuk tugas praktikum Keamanan Informasi."
- **Aksi Layar:**
  - Tampilkan diagram arsitektur pada `README.md`.
  - Tunjukkan bahwa sistem terdiri dari 4 aplikasi terpisah:
    1. **Frontend Web** (React + Vite pada port 5173).
    2. **API Gateway (PEP/PA)** pada port 3000.
    3. **Service Nilai (Resource)** pada port 3001.
    4. **Service Transkrip (Resource)** pada port 3002.
    Semua terhubung ke satu database MySQL di Laragon.

---

#### 2. Autentikasi & Konteks Perangkat Terdaftar (Menit 01:00 - 02:30)
- **Narasi Pembicara:**
  > "Prinsip pertama Zero Trust adalah *Never Trust, Always Verify*. Kita tidak mempercayai login hanya dari kredensial password, tetapi juga memeriksa identitas perangkat terdaftar melalui header X-Device-ID."
- **Tampilkan Kode:**
  - Buka file `packages/gateway/src/auth-controller.js` (tunjukkan fungsi `handleLogin`).
  - Tunjukkan pengecekan ke tabel `devices`:
    `SELECT id, is_trusted FROM devices WHERE user_id = ? AND device_id = ?`
  - Buka file `packages/shared/src/jwt.js`: tunjukkan access token (berlaku tepat 10 menit) dan refresh token (1 hari, tersimpan terenkripsi/hash di database sehingga dapat dicabut saat logout).
- **Aksi Layar (Demo Interaktif):**
  1. **Skenario DENY:**
     - Masuk ke web `http://localhost:5173`.
     - Pilih akun Mahasiswa Fariez (`247006111146`), lalu ubah Device ID menjadi `DEV-UNKNOWN-999`.
     - Klik **Masuk**.
     - Tunjukkan bahwa muncul pesan: *"Akses Ditolak: Perangkat 'DEV-UNKNOWN-999' tidak terdaftar untuk akun ini"*.
  2. **Skenario ALLOW:**
     - Kembalikan Device ID menjadi `DEV-MHS-001`.
     - Klik **Masuk** dan login berhasil masuk ke dasbor.

---

#### 3. Policy Engine & Hak Akses Mahasiswa (Menit 02:30 - 04:00)
- **Narasi Pembicara:**
  > "Prinsip kedua adalah *Least Privilege*. Mahasiswa hanya memiliki wewenang membaca nilai dan transkrip miliknya sendiri. Penegakan ini tidak dilakukan dengan menyembunyikan tombol di frontend, melainkan diverifikasi langsung oleh Policy Engine di Gateway."
- **Tampilkan Kode:**
  - Buka `packages/gateway/src/policy-engine.js` pada bagian evaluasi `GET /transkrip/:nim`:
    `if (role === 'mahasiswa' && decodedUser.identifier !== requestedNim) return { allow: false, statusCode: 403, ... }`
- **Aksi Layar (Demo Interaktif):**
  - Tunjukkan Dasbor Mahasiswa Fariez: tabel KHS menampilkan nilai semester berjalan, dan tab Transkrip menampilkan rekap 84 SKS dengan IPK 3.90 sesuai data riil.
  - Klik tombol navigasi **"Uji Zero Trust"** di Navbar untuk membuka Laboratorium Pengujian Keamanan.
  - Pada Skenario 1 (Hak Akses Mahasiswa), masukkan NIM lain (`247006111147`) lalu klik **"Uji Akses NIM"**.
  - Tunjukkan bahwa sistem langsung menampilkan penolakan:
    *"BERHASIL DIBLOKIR: Gateway PEP menolak (403): Pelanggaran Least Privilege: Mahasiswa dilarang melihat transkrip NIM 247006111147"*.

---

#### 4. Kebijakan Waktu Akses & Pengelolaan Nilai Dosen (Menit 04:00 - 05:30)
- **Narasi Pembicara:**
  > "Kebutuhan selanjutnya adalah verifikasi konteks jam operasional: pengubahan dan finalisasi nilai hanya diizinkan pada pukul 07.00 sampai 21.00 WIB, dan dapat dikonfigurasi tanpa mengubah kode sumber."
- **Tampilkan Kode:**
  - Buka `packages/shared/src/time.js` dan tunjukkan pembacaan `process.env.GRADE_EDIT_START` (07:00), `process.env.GRADE_EDIT_END` (21:00), dan `APP_TIMEZONE` (`Asia/Jakarta`).
  - Buka `packages/gateway/src/policy-engine.js` pada rute `PUT /nilai/:id` dan `POST /kelas/:id/finalisasi`.
- **Aksi Layar (Demo Interaktif):**
  - Logout dari Mahasiswa, login sebagai **Dosen Alam** (`dosen_alam`, Device: `DEV-DSN-001`).
  - Tampilkan kelas yang diampu: *Keamanan Informasi (Kelas E)*.
  - Klik **Ubah** pada salah satu mahasiswa, ganti nilai menjadi `90`, simpan, nilai berhasil terupdate.
  - Klik tombol navigasi **"Uji Zero Trust"** di Navbar, jalankan Skenario 2: **"Uji Ubah Nilai Kelas Dosen Lain"**.
  - Tunjukkan respons penolakan: *"BERHASIL DIBLOKIR: Dosen Alam tidak mengampu mata kuliah ini (Least Privilege Violation)"*.

---

#### 5. Finalisasi Nilai & Sinkronisasi Antarlayanan (Menit 05:30 - 07:00)
- **Narasi Pembicara:**
  > "Saat dosen memfinalisasi kelas, nilai akan dikunci permanen. Setelah itu, Service Nilai secara otomatis memicu sinkronisasi ke Service Transkrip melalui Gateway menggunakan token service khusus mesin."
- **Tampilkan Kode:**
  - Buka `packages/service-nilai/src/server.js` pada endpoint `POST /kelas/:id/finalisasi`:
    1. Update status kelas `is_finalized = 1` dan nilai `is_final = 1`.
    2. Meminta token service ke `POST http://localhost:3000/auth/service` dengan `client_id` dan `client_secret`.
    3. Mengirim nilai final ke Gateway `POST http://localhost:3000/transkrip/sinkron` dengan `Authorization: Bearer <service_token>`.
  - Buka `packages/service-transkrip/src/server.js` pada endpoint `POST /transkrip/sinkron`:
    Tunjukkan bahwa endpoint ini memeriksa `if (user.role !== 'service') return res.status(403)`. Token mahasiswa, dosen, bahkan admin pasti ditolak.
- **Aksi Layar (Demo Interaktif):**
  - Pada dasbor Dosen Alam, klik tombol **Finalisasi Nilai Kelas**.
  - Modal konfirmasi muncul, klik **Ya, Finalisasi & Sinkronkan**.
  - Status kelas berubah menjadi: *"Nilai Telah Difinalisasi & Dikunci • Tersinkron ke Transkrip"*.
  - Coba klik tombol ubah nilai: tombol dinonaktifkan karena nilai sudah berstatus final.

---

#### 6. Defense-in-Depth (*Assume Breach*) (Menit 07:00 - 08:00)
- **Narasi Pembicara:**
  > "Prinsip ketiga Zero Trust adalah *Assume Breach*. Service backend tidak boleh mempercayai siapa pun secara buta. Jika ada penyerang yang mengetahui port internal 3001 atau 3002 dan mencoba membypass Gateway, service akan menolak request tersebut."
- **Tampilkan Kode:**
  - Buka `packages/service-nilai/src/middleware/verify-service-guard.js`.
  - Tunjukkan verifikasi ganda:
    1. Header `X-Gateway-Secret` dicocokkan dengan nilai rahasia backend.
    2. Token JWT diverifikasi ulang secara kriptografis (*signature* dan *expiry*).
- **Aksi Layar (Demo Terminal / cURL):**
  - Buka terminal, jalankan perintah cURL langsung ke Service Nilai port 3001 tanpa Gateway Secret:
    ```bash
    curl -i http://localhost:3001/nilai -H "Authorization: Bearer <TOKEN>"
    ```
  - Tunjukkan hasil: **HTTP 403 Forbidden** (*"Akses langsung ke Service Nilai ditolak. Seluruh permintaan wajib melewati API Gateway"*).

---

#### 7. Audit Log PEP & Penutup (Menit 08:00 - 09:00)
- **Narasi Pembicara:**
  > "Setiap keputusan akses—baik ALLOW maupun DENY—wajib dicatat dalam Audit Log lengkap dengan alasan evaluasi keamanan, waktu, subjek, endpoint, dan status kode."
- **Aksi Layar:**
  - Logout dari Dosen, login sebagai **Admin** (`admin`, Device: `DEV-ADM-001`).
  - Masuk ke tab **Audit Log PEP (Zero Trust)**.
  - Tunjukkan tabel log:
    - Log login sukses (ALLOW)
    - Log login ditolak karena device tidak terdaftar (DENY 403)
    - Log mahasiswa ditolak saat akses transkrip orang lain (DENY 403)
    - Log dosen ditolak mengedit kelas dosen lain (DENY 403)
    - Log penerbitan service token dan sinkronisasi transkrip (ALLOW 200)
  - Tunjukkan bahwa data sensitif seperti password dan JWT tidak pernah dicatat di log.
  - Jalankan perintah automated test di terminal untuk membuktikan 17 skenario:
    ```bash
    npm test
    ```
    Tunjukkan output: `pass 17, fail 0`!
- **Kalimat Penutup:**
  > "Seluruh prinsip Zero Trust—Never Trust Always Verify, Least Privilege, dan Assume Breach—telah terbukti berfungsi dan tervalidasi secara menyeluruh. Terima kasih atas perhatiannya. Wassalamu'alaikum wr. wb."
