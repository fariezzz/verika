// packages/frontend/src/components/LoginPage.tsx
// Halaman Masuk "VERIKA Access" dengan Verifikasi Konteks Zero Trust

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserIcon, LockIcon, DeviceIcon, EyeIcon, EyeOffIcon, ShieldIcon, AlertTriangleIcon, RefreshCwIcon } from './Icons';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  // Form diawali kosong secara default
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [selectedDemo, setSelectedDemo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Popup Modal saat Login Gagal
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  // Akun Cepat Demo untuk keperluan pengujian dan evaluasi praktikum
  const demoAccounts = [
    { label: '-- Pilih Akun Demo (Opsional) --', u: '', p: '', d: '' },
    { label: 'Mahasiswa: Muhammad Fariez (247006111146)', u: '247006111146', p: 'password123', d: 'DEV-MHS-001' },
    { label: 'Mahasiswa: Fathir Rizki (247006111147)', u: '247006111147', p: 'password123', d: 'DEV-MHS-002' },
    { label: 'Mahasiswa: Aditya Pratama (247006111148)', u: '247006111148', p: 'password123', d: 'DEV-MHS-003' },
    { label: 'Dosen: Ir. Alam Rahmatulloh - Keamanan Informasi', u: 'dosen_alam', p: 'password123', d: 'DEV-DSN-001' },
    { label: 'Dosen: Dr. Ir. Aradea, S.T., M.T. - Inteligensi Artifisial', u: 'dosen_aradea', p: 'password123', d: 'DEV-DSN-002' },
    { label: 'Dosen: Ir. Randi Rizal, Ph.D. - Komputasi Paralel & Terdistribusi', u: 'dosen_randi', p: 'password123', d: 'DEV-DSN-003' },
    { label: 'Dosen: Dr. Ir. R Reza El Akbar - Pengujian & Implementasi Sistem', u: 'dosen_reza', p: 'password123', d: 'DEV-DSN-004' },
    { label: 'Dosen: Dr. Ir. Eka Wahyu Hidayat - Teori Bahasa & Otomata', u: 'dosen_eka', p: 'password123', d: 'DEV-DSN-005' },
    { label: 'Dosen: Ir. Firmansyah M.S.N. - Komputasi Awan', u: 'dosen_firmansyah', p: 'password123', d: 'DEV-DSN-006' },
    { label: 'Admin: Admin Akademik Pusat (admin)', u: 'admin', p: 'password123', d: 'DEV-ADM-001' },
    { label: '[Uji Ditolak] Device ID Tidak Terdaftar', u: '247006111146', p: 'password123', d: 'DEV-UNKNOWN-999' }
  ];

  const handleSelectDemo = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedDemo(val);
    const selected = demoAccounts.find((acc) => acc.label === val);
    if (selected && selected.u) {
      setUsername(selected.u);
      setPassword(selected.p);
      setDeviceId(selected.d);
    } else {
      setUsername('');
      setPassword('');
      setDeviceId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(username, password, deviceId);
    } catch (err: any) {
      const errMsg = err?.message || 'Login gagal. Periksa kembali username, password, dan perangkat Anda.';
      setPopupMessage(errMsg);
      setShowErrorPopup(true);

      // Reset form menjadi kosong semua sesuai instruksi
      setUsername('');
      setPassword('');
      setDeviceId('');
      setSelectedDemo('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-layout">
      {/* Sisi Kiri: Banner Hero Visual Kampus */}
      <div className="login-hero-panel">
        {/* Ornamen Grafis Lingkaran Modern */}
        <div
          className="login-decor"
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            pointerEvents: 'none'
          }}
        />
        <div
          className="login-decor"
          style={{
            position: 'absolute',
            bottom: '5%',
            left: '-5%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.05)',
            pointerEvents: 'none'
          }}
        />

        {/* Header Visual */}
        <div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.2, marginBottom: '16px' }}>
            VERIKA
          </h1>
          <p style={{ fontSize: '18px', fontWeight: 300, fontStyle: 'italic', opacity: 0.9, marginBottom: '8px' }}>
            Verifikasi & Informasi Nilai Akademik Terpadu
          </p>
          <p style={{ fontSize: '14px', opacity: 0.75, maxWidth: '440px' }}>
            Portal Akademik Nilai & Transkrip Terpadu dengan Kebijakan Keamanan Berbasis Kebijakan (Policy Enforcement Point).
          </p>
        </div>

        {/* Ringkasan Konteks Arsitektur */}
        <div className="rules-card" style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(6px)', maxWidth: '520px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#86efac', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Aturan Keamanan Akses:
          </div>
          <ul style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.6, paddingLeft: '18px' }}>
            <li><strong>Never Trust, Always Verify:</strong> Setiap request wajib membawa token JWT dan Device ID terdaftar.</li>
            <li><strong>Least Privilege:</strong> Mahasiswa hanya melihat nilainya, dosen hanya mengubah kelas yang diampunya.</li>
            <li><strong>Assume Breach:</strong> Service backend memverifikasi ganda token dan gateway secret mandiri.</li>
          </ul>
        </div>

        {/* Footer Banner */}
        <div className="footer-campus" style={{ fontSize: '12px', opacity: 0.6, letterSpacing: '0.5px' }}>
          GEDUNG PUSAT PEMBELAJARAN DAN LABORATORIUM TERPADU
        </div>
      </div>

      {/* Sisi Kanan: Formulir Masuk "VERIKA Access" */}
      <div className="login-form-panel">
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Header VERIKA Access */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0e4b37', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <ShieldIcon size={18} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b' }}>
                PORTAL AKADEMIK TERPADU
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0e4b37' }}>
                  VERIKA Access
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Satu Pintu Akses Layanan Akademik
                </p>
              </div>
              <span className="badge badge-success" style={{ fontSize: '11px', padding: '4px 10px', height: 'fit-content' }}>
                Selamat Datang
              </span>
            </div>
          </div>

          {/* Quick Demo Picker (Mempermudah Pengujian Tugas Praktikum) */}
          <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label className="form-label" style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
              Pilih Akun Demo Pengujian (Opsional):
            </label>
            <select
              value={selectedDemo}
              onChange={handleSelectDemo}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              {demoAccounts.map((acc, idx) => (
                <option key={idx} value={acc.label}>
                  {acc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Form Login */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email / Username / NIM</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <UserIcon size={18} />
                </span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Username, NIM, atau NIP"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Kata Sandi</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <LockIcon size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Device ID (Konteks Perangkat Terdaftar)
                </label>
                <span style={{ fontSize: '11px', color: '#0e4b37', fontWeight: 600 }}>
                  Header: X-Device-ID
                </span>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">
                  <DeviceIcon size={18} />
                </span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: DEV-MHS-001"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '12px',
                fontSize: '15px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCwIcon size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Footer Card */}
          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
            <span>Sistem Terverifikasi Digital</span>
            <span>© 2020 – 2026 VERIKA Academic</span>
          </div>
        </div>
      </div>

      {/* Popup Modal Saat Login Gagal */}
      {showErrorPopup && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', padding: '28px 24px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid #fecaca'
              }}
            >
              <AlertTriangleIcon size={26} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Autentikasi Gagal
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '22px', lineHeight: 1.5 }}>
              {popupMessage}
            </p>
            <button
              onClick={() => {
                setShowErrorPopup(false);
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '13px', borderRadius: '6px' }}
            >
              Tutup & Masukkan Ulang
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
