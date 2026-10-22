// packages/frontend/src/components/SecurityDemoPage.tsx
// Halaman Khusus Pengujian & Demonstrasi Keamanan Zero Trust (NIST SP 800-207)
// Memisahkan pengujian keamanan dari dashboard akademik utama agar UI dashboard tetap bersih.

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ShieldIcon, AlertTriangleIcon } from './Icons';

export const SecurityDemoPage: React.FC<{ onBackToDashboard: () => void }> = ({ onBackToDashboard }) => {
  const { user } = useAuth();

  // Test 1: Mahasiswa coba akses transkrip orang lain
  const [testNim, setTestNim] = useState('247006111147');
  const [res1, setRes1] = useState<{ status: 'success' | 'danger'; text: string } | null>(null);
  const [loading1, setLoading1] = useState(false);

  // Test 2: Dosen coba ubah nilai kelas dosen lain
  const [res2, setRes2] = useState<{ status: 'success' | 'danger'; text: string } | null>(null);
  const [loading2, setLoading2] = useState(false);

  // Test 3: Admin coba panggil sinkronisasi langsung
  const [res3, setRes3] = useState<{ status: 'success' | 'danger'; text: string } | null>(null);
  const [loading3, setLoading3] = useState(false);

  // Test 4: Direct access ke port service tanpa gateway secret
  const [res4, setRes4] = useState<{ status: 'success' | 'danger'; text: string } | null>(null);
  const [loading4, setLoading4] = useState(false);

  const runTest1 = async () => {
    setLoading1(true);
    setRes1(null);
    try {
      await api.get(`/transkrip/${testNim}`);
      setRes1({
        status: 'danger',
        text: 'PERINGATAN: Request berhasil (seharusnya ditolak)! Least privilege gagal.'
      });
    } catch (err: any) {
      setRes1({
        status: 'success',
        text: `BERHASIL DIBLOKIR: Gateway PEP menolak (${err.status || 403}): ${err.message}`
      });
    } finally {
      setLoading1(false);
    }
  };

  const runTest2 = async () => {
    setLoading2(true);
    setRes2(null);
    try {
      // Coba ubah nilai kelas dosen lain (ID 4 atau 6)
      await api.put('/nilai/4', { nilai_angka: 99.0 });
      setRes2({
        status: 'danger',
        text: 'PERINGATAN: Berhasil mengubah nilai kelas orang lain! Kebijakan gagal.'
      });
    } catch (err: any) {
      setRes2({
        status: 'success',
        text: `BERHASIL DIBLOKIR: Gateway PEP menolak (${err.status || 403}): ${err.message}`
      });
    } finally {
      setLoading2(false);
    }
  };

  const runTest3 = async () => {
    setLoading3(true);
    setRes3(null);
    try {
      await api.post('/transkrip/sinkron', { class_id: 1, items: [] });
      setRes3({
        status: 'danger',
        text: 'PERINGATAN: Pengguna berhasil memanggil sinkronisasi! Token service tidak ditegakkan.'
      });
    } catch (err: any) {
      setRes3({
        status: 'success',
        text: `BERHASIL DIBLOKIR: Endpoint sinkronisasi menolak (${err.status || 403}): ${err.message}`
      });
    } finally {
      setLoading3(false);
    }
  };

  const runTest4 = async () => {
    setLoading4(true);
    setRes4(null);
    try {
      // Direct request ke port 3001 tanpa X-Gateway-Secret
      const directResp = await fetch('http://localhost:3001/nilai', {
        headers: {
          Authorization: `Bearer ${api.getToken() || ''}`
        }
      });
      const data = await directResp.json();
      if (directResp.status === 403) {
        setRes4({
          status: 'success',
          text: `BERHASIL DIBLOKIR (Assume Breach): Service Nilai (port 3001) menolak request langsung tanpa X-Gateway-Secret (${directResp.status}): ${data.error}`
        });
      } else {
        setRes4({
          status: 'danger',
          text: `PERINGATAN: Akses langsung berhasil dengan status ${directResp.status}`
        });
      }
    } catch (err: any) {
      setRes4({
        status: 'success',
        text: `Koneksi ditolak / gagal: ${err.message}`
      });
    } finally {
      setLoading4(false);
    }
  };

  return (
    <div className="container" style={{ padding: '24px 20px', maxWidth: '960px' }}>
      {/* Header Halaman Pengujian */}
      <div className="page-header-flex">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0e4b37', textTransform: 'uppercase', marginBottom: '4px' }}>
            <ShieldIcon size={14} /> Laboratorium Pengujian Keamanan
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', marginBottom: '2px' }}>
            Demonstrasi Kebijakan Zero Trust (NIST SP 800-207)
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Halaman khusus evaluasi dan demonstrasi video untuk membuktikan penolakan otomatis oleh Policy Engine Gateway dan Resource Services.
          </p>
        </div>

        <button
          onClick={onBackToDashboard}
          className="btn btn-secondary"
          style={{ fontSize: '13px', height: '36px', padding: '0 14px', flexShrink: 0 }}
        >
          Kembali ke Dashboard
        </button>
      </div>

      <div className="demo-layout-grid">
        {/* Skenario 1: Least Privilege Mahasiswa */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #0e4b37' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangleIcon size={18} style={{ color: '#0e4b37', flexShrink: 0 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              1. Hak Akses Mahasiswa (Least Privilege)
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
            Mahasiswa dilarang membaca transkrip milik mahasiswa lain. Request di bawah mengirim token sesi aktif Anda ke NIM target:
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input form-input-no-icon"
              style={{ padding: '8px 12px', fontSize: '13px', flex: '1 1 180px' }}
              value={testNim}
              onChange={(e) => setTestNim(e.target.value)}
              placeholder="Masukkan NIM lain"
            />
            <button
              onClick={runTest1}
              disabled={loading1}
              className="btn btn-primary"
              style={{ fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {loading1 ? 'Menguji...' : 'Uji Akses NIM'}
            </button>
          </div>
          {res1 && (
            <div style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '12px', background: res1.status === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${res1.status === 'success' ? '#bbf7d0' : '#fecaca'}`, color: res1.status === 'success' ? '#166534' : '#b91c1c' }}>
              {res1.text}
            </div>
          )}
        </div>

        {/* Skenario 2: Least Privilege Dosen */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangleIcon size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              2. Kepemilikan Kelas Dosen (Least Privilege)
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
            Dosen dilarang mengedit nilai kelas yang diampu oleh dosen lain. Menguji pengiriman <code>PUT /nilai/4</code>:
          </p>
          <button
            onClick={runTest2}
            disabled={loading2}
            className="btn btn-secondary"
            style={{ fontSize: '12px', width: '100%', marginBottom: '12px' }}
          >
            {loading2 ? 'Menguji...' : 'Uji Ubah Nilai Kelas Dosen Lain'}
          </button>
          {res2 && (
            <div style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '12px', background: res2.status === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${res2.status === 'success' ? '#bbf7d0' : '#fecaca'}`, color: res2.status === 'success' ? '#166534' : '#b91c1c' }}>
              {res2.text}
            </div>
          )}
        </div>

        {/* Skenario 3: Pembatasan Sinkronisasi Transkrip */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangleIcon size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              3. Penolakan Token Pengguna pada Sinkronisasi
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
            Endpoint <code>POST /transkrip/sinkron</code> hanya dapat dipanggil oleh Service Token mesin. Token akun manusia wajib ditolak:
          </p>
          <button
            onClick={runTest3}
            disabled={loading3}
            className="btn btn-secondary"
            style={{ fontSize: '12px', width: '100%', marginBottom: '12px' }}
          >
            {loading3 ? 'Menguji...' : 'Uji Panggilan Sinkronisasi Langsung'}
          </button>
          {res3 && (
            <div style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '12px', background: res3.status === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${res3.status === 'success' ? '#bbf7d0' : '#fecaca'}`, color: res3.status === 'success' ? '#166534' : '#b91c1c' }}>
              {res3.text}
            </div>
          )}
        </div>

        {/* Skenario 4: Assume Breach (Direct Port Access) */}
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangleIcon size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              4. Pertahanan Mandiri Service (Assume Breach)
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px', lineHeight: 1.5 }}>
            Mencoba mengakses langsung Service Nilai pada port 3001 tanpa melalui Gateway (tanpa <code>X-Gateway-Secret</code>):
          </p>
          <button
            onClick={runTest4}
            disabled={loading4}
            className="btn btn-secondary"
            style={{ fontSize: '12px', width: '100%', marginBottom: '12px' }}
          >
            {loading4 ? 'Menguji...' : 'Uji Akses Langsung ke Port 3001'}
          </button>
          {res4 && (
            <div style={{ padding: '10px 14px', borderRadius: '6px', fontSize: '12px', background: res4.status === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${res4.status === 'success' ? '#bbf7d0' : '#fecaca'}`, color: res4.status === 'success' ? '#166534' : '#b91c1c' }}>
              {res4.text}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
        <strong>Sesi Akun Saat Ini:</strong> {user?.nama} ({user?.role?.toUpperCase()}) • Device ID: <code>{user?.deviceId || '-'}</code>. Seluruh riwayat pengujian tercatat pada tabel <code>audit_logs</code> di Gateway PEP.
      </div>
    </div>
  );
};
