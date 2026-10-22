// packages/frontend/src/components/LoginPage.tsx
// Halaman Masuk "Gapura Access" Universitas Siliwangi bergaya SINTESYS dengan Verifikasi Konteks Zero Trust

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserIcon, LockIcon, DeviceIcon, EyeIcon, EyeOffIcon, ShieldIcon, AlertTriangleIcon } from './Icons';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('247006111146');
  const [password, setPassword] = useState('password123');
  const [deviceId, setDeviceId] = useState('DEV-MHS-001');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Akun Cepat Demo untuk keperluan pengujian dan evaluasi tugas praktikum
  const demoAccounts = [
    { label: 'Mahasiswa: Muhammad Fariez (247006111146)', u: '247006111146', p: 'password123', d: 'DEV-MHS-001' },
    { label: 'Mahasiswa: Fathir Rizki (247006111147)', u: '247006111147', p: 'password123', d: 'DEV-MHS-002' },
    { label: 'Dosen: Vega Purwayoga (dosen_vega)', u: 'dosen_vega', p: 'password123', d: 'DEV-DSN-001' },
    { label: 'Dosen: Alam Rahmatulloh (dosen_alam)', u: 'dosen_alam', p: 'password123', d: 'DEV-DSN-002' },
    { label: 'Admin: Admin Akademik (admin)', u: 'admin', p: 'password123', d: 'DEV-ADM-001' },
    { label: '[UJI TOLAK] Device Tidak Terdaftar', u: '247006111146', p: 'password123', d: 'DEV-UNKNOWN-999' }
  ];

  const handleSelectDemo = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = demoAccounts.find((acc) => acc.label === e.target.value);
    if (selected) {
      setUsername(selected.u);
      setPassword(selected.p);
      setDeviceId(selected.d);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password, deviceId);
    } catch (err: any) {
      setError(err?.message || 'Login gagal. Periksa kembali username, password, dan perangkat Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sisi Kiri: Banner Hero Visual Kampus Universitas Siliwangi */}
      <div
        style={{
          flex: 1.1,
          backgroundColor: '#0a3829',
          backgroundImage: 'radial-gradient(circle at 20% 30%, #166534 0%, #064e3b 70%, #022c22 100%)',
          color: '#ffffff',
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Ornamen Grafis Lingkaran Modern */}
        <div
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '24px' }}>
            <ShieldIcon size={16} /> NIST SP 800-207 ZERO TRUST SECURITY
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.2, marginBottom: '16px' }}>
            SINTESYS
          </h1>
          <p style={{ fontSize: '18px', fontWeight: 300, fontStyle: 'italic', opacity: 0.9, marginBottom: '8px' }}>
            Siliwangi Integrated Systems
          </p>
          <p style={{ fontSize: '14px', opacity: 0.75, maxWidth: '440px' }}>
            Portal Akademik Nilai & Transkrip Terpadu dengan Kebijakan Keamanan Berbasis Kebijakan (Policy Enforcement Point).
          </p>
        </div>

        {/* Ringkasan Konteks Arsitektur */}
        <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(6px)', maxWidth: '520px' }}>
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
        <div style={{ fontSize: '12px', opacity: 0.6, letterSpacing: '0.5px' }}>
          GEDUNG KULIAH TERPADU DAN LABORATORIUM FAKULTAS TEKNIK UNIVERSITAS SILIWANGI
        </div>
      </div>

      {/* Sisi Kanan: Formulir Masuk "Gapura Access" */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px'
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Header Gapura Access */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0e4b37', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <ShieldIcon size={18} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b' }}>
                UNIVERSITAS SILIWANGI
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0e4b37' }}>
                  Gapura Access
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  Satu Pintu Akses Layanan Akademik
                </p>
              </div>
              <span className="badge badge-success" style={{ fontSize: '11px', padding: '4px 10px' }}>
                Wilujeng Sumping
              </span>
            </div>
          </div>

          {/* Quick Demo Picker (Mempermudah Pengujian Tugas Praktikum) */}
          <div style={{ marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label className="form-label" style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
              Pilih Akun Demo Pengujian:
            </label>
            <select
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

          {/* Error Banner */}
          {error && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <AlertTriangleIcon size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Akses Ditolak:</strong> {error}
              </div>
            </div>
          )}

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
                borderRadius: '8px'
              }}
            >
              {isSubmitting ? 'Memverifikasi Kebijakan...' : 'Masuk'}
            </button>
          </form>

          {/* Footer Card */}
          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
            <span>BSrE Terverifikasi</span>
            <span>© 2020 – 2026 Universitas Siliwangi</span>
          </div>
        </div>
      </div>
    </div>
  );
};
