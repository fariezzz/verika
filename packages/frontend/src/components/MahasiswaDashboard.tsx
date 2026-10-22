// packages/frontend/src/components/MahasiswaDashboard.tsx
// Dasbor Akademik Mahasiswa Sesuai Desain SINTESYS UNSIL (Hasil Studi & Transkrip)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { NilaiItem, TranskripResponse } from '../types';
import { BookOpenIcon, GraduationCapIcon, RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon } from './Icons';

export const MahasiswaDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'khs' | 'transkrip'>('khs');
  const [nilaiList, setNilaiList] = useState<NilaiItem[]>([]);
  const [transkrip, setTranskrip] = useState<TranskripResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk pengujian pelanggaran Least Privilege
  const [unauthorizedNim, setUnauthorizedNim] = useState('247006111147');
  const [securityTestResult, setSecurityTestResult] = useState<{ status: string; message: string } | null>(null);
  const [isTestingViolation, setIsTestingViolation] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Ambil nilai mahasiswa sendiri
      const nilaiResp = await api.get<{ data: NilaiItem[] }>('/nilai');
      setNilaiList(nilaiResp.data || []);

      // 2. Ambil transkrip mahasiswa sendiri
      if (user?.identifier) {
        const transkripResp = await api.get<TranskripResponse>(`/transkrip/${user.identifier}`);
        setTranskrip(transkripResp);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data akademik');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Uji Prinsip Zero Trust: Mencoba membaca transkrip milik mahasiswa lain
  const handleTestLeastPrivilegeViolation = async () => {
    setIsTestingViolation(true);
    setSecurityTestResult(null);
    try {
      await api.get(`/transkrip/${unauthorizedNim}`);
      setSecurityTestResult({
        status: 'danger',
        message: `PERINGATAN: Akses berhasil padahal NIM milik orang lain! Sistem tidak aman.`
      });
    } catch (err: any) {
      // Berhasil dicegat oleh Zero Trust Policy Engine
      setSecurityTestResult({
        status: 'success',
        message: `BERHASIL DIBLOKIR: Gateway & Policy Engine menolak permintaan (${err.status || 403}): ${err.message}`
      });
    } finally {
      setIsTestingViolation(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 20px' }}>
      {/* Breadcrumb & Judul Halaman */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            HASIL STUDI MAHASISWA
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Sistem Informasi Akademik • Fakultas Teknik Universitas Siliwangi
          </p>
        </div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          <span>Hasil Studi</span> &gt; <strong style={{ color: '#0e4b37' }}>Index</strong>
        </div>
      </div>

      {/* Grid Utama: Sidebar Profil Kiri & Konten Nilai Kanan */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Kolom Kiri: Kartu Profil & Prestasi Akademik Mahasiswa */}
        <div>
          <div className="card" style={{ padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
            {/* Foto Formal / Avatar */}
            <div
              style={{
                width: '110px',
                height: '130px',
                backgroundColor: '#1e3a8a',
                color: '#ffffff',
                borderRadius: '8px',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                fontWeight: 700,
                border: '3px solid #e2e8f0'
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>🎓</div>
              <div style={{ fontSize: '11px', letterSpacing: '0.5px' }}>UNSIL</div>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              {user?.nama || 'MUHAMMAD FARIEZ RIZIQ ILHAM'}
            </h3>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '16px' }}>
              NIM: {user?.identifier || '247006111146'}
            </div>

            {/* Status Mahasiswa */}
            <div style={{ marginBottom: '20px' }}>
              <span className="badge badge-success" style={{ padding: '6px 14px', fontSize: '12px' }}>
                ● Status: Mahasiswa Aktif
              </span>
            </div>

            {/* Rincian Identitas Akademik */}
            <div style={{ textAlign: 'left', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Program Studi:</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>7006 - S1 Informatika</div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Status Awal:</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>Peserta didik baru</div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Dosen Wali:</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>Vega Purwayoga, S.Kom., M.Kom.</div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Kelas:</span>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>E</div>
              </div>
            </div>

            {/* Kotak Metrik IPK dan SKS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '12px 8px' }}>
                <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 700 }}>IPK KUMULATIF</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#581c87' }}>
                  {transkrip?.ringkasan.ipk || '3.90'}
                </div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 8px' }}>
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>TOTAL SKS</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#14532d' }}>
                  {transkrip?.ringkasan.total_sks || '84'}
                </div>
              </div>
            </div>

            <button
              onClick={fetchData}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '16px', fontSize: '12px', padding: '8px' }}
            >
              <RefreshCwIcon size={14} /> Sinkronkan Ulang Tampilan
            </button>
          </div>

          {/* Kotak Uji Keamanan Zero Trust (Least Privilege) */}
          <div className="card" style={{ padding: '18px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0e4b37', marginBottom: '8px' }}>
              <AlertTriangleIcon size={16} /> Uji Prinsip Least Privilege
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
              Mahasiswa dilarang membaca transkrip mahasiswa lain. Uji request ke NIM berikut:
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                className="form-input form-input-no-icon"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                value={unauthorizedNim}
                onChange={(e) => setUnauthorizedNim(e.target.value)}
                placeholder="NIM target"
              />
              <button
                onClick={handleTestLeastPrivilegeViolation}
                disabled={isTestingViolation}
                className="btn btn-primary"
                style={{ fontSize: '11px', padding: '6px 12px', whiteSpace: 'nowrap' }}
              >
                {isTestingViolation ? 'Menguji...' : 'Uji Akses'}
              </button>
            </div>

            {securityTestResult && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  background: securityTestResult.status === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${securityTestResult.status === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  color: securityTestResult.status === 'success' ? '#166534' : '#b91c1c'
                }}
              >
                {securityTestResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Tab Menu & Konten Nilai */}
        <div>
          {/* Navigasi Tab */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveTab('khs')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'khs' ? '3px solid #0e4b37' : '3px solid transparent',
                color: activeTab === 'khs' ? '#0e4b37' : '#64748b',
                fontWeight: activeTab === 'khs' ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              <BookOpenIcon size={16} /> Aktivitas Kuliah Mahasiswa (KHS Berjalan)
            </button>

            <button
              onClick={() => setActiveTab('transkrip')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'transkrip' ? '3px solid #0e4b37' : '3px solid transparent',
                color: activeTab === 'transkrip' ? '#0e4b37' : '#64748b',
                fontWeight: activeTab === 'transkrip' ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              <GraduationCapIcon size={16} /> Transkrip Nilai Akademik
            </button>
          </div>

          {error && (
            <div style={{ padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCwIcon size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: '8px', fontSize: '13px' }}>Memuat data dari API Gateway...</div>
            </div>
          ) : activeTab === 'khs' ? (
            /* Tab 1: KHS Mahasiswa Semester Berjalan */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#3d5a45', color: '#ffffff', padding: '12px 18px', borderRadius: '8px 8px 0 0' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>
                  Tahun Akademik: 20261 (Semester 5 - Sedang Ditempuh)
                </span>
                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}>
                  Total {nilaiList.length} Mata Kuliah
                </span>
              </div>

              <div className="table-container" style={{ borderRadius: '0 0 8px 8px' }}>
                <table className="academic-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Kode MK</th>
                      <th>Nama Mata Kuliah</th>
                      <th style={{ textAlign: 'center' }}>SKS</th>
                      <th style={{ textAlign: 'center' }}>Nilai Angka</th>
                      <th style={{ textAlign: 'center' }}>Nilai Mutu</th>
                      <th style={{ textAlign: 'center' }}>Bobot</th>
                      <th>Dosen Pengampu</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nilaiList.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          Belum ada nilai yang terinput untuk semester ini.
                        </td>
                      </tr>
                    ) : (
                      nilaiList.map((item, idx) => (
                        <tr key={item.id}>
                          <td>{idx + 1}</td>
                          <td><strong>{item.kode_mk}</strong></td>
                          <td>{item.nama_mk}</td>
                          <td style={{ textAlign: 'center' }}>{item.sks}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.nilai_angka}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-primary">{item.nilai_huruf}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.bobot}</td>
                          <td style={{ fontSize: '12px' }}>{item.dosen_pengampu}</td>
                          <td style={{ textAlign: 'center' }}>
                            {item.is_final ? (
                              <span className="badge badge-success">
                                <CheckCircleIcon size={12} /> Final
                              </span>
                            ) : (
                              <span className="badge badge-warning">
                                Draf
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Tab 2: Transkrip Nilai Akademik Lengkap */
            <div>
              {transkrip?.semesters && transkrip.semesters.length > 0 ? (
                transkrip.semesters.map((sem, sIdx) => (
                  <div key={sIdx} style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#3d5a45', color: '#ffffff', padding: '10px 16px', borderRadius: '8px 8px 0 0' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>
                        Tahun Akademik: {sem.semester}
                      </span>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                        <span>SKS: <strong>{sem.sks}</strong></span>
                        <span>Total Mutu: <strong>{sem.mutu.toFixed(2)}</strong></span>
                        <span>IPS: <strong>{sem.ips}</strong></span>
                      </div>
                    </div>

                    <div className="table-container" style={{ borderRadius: '0 0 8px 8px' }}>
                      <table className="academic-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>Kode MK</th>
                            <th>Nama Mata Kuliah</th>
                            <th style={{ textAlign: 'center' }}>SKS</th>
                            <th style={{ textAlign: 'center' }}>Nilai</th>
                            <th style={{ textAlign: 'center' }}>Bobot</th>
                            <th style={{ textAlign: 'center' }}>Mutu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sem.mata_kuliah.map((mk, mkIdx) => (
                            <tr key={mk.id}>
                              <td>{mkIdx + 1}</td>
                              <td><strong>{mk.kode_mk}</strong></td>
                              <td>{mk.nama_mk}</td>
                              <td style={{ textAlign: 'center' }}>{mk.sks}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge badge-success">{mk.nilai_huruf}</span>
                              </td>
                              <td style={{ textAlign: 'center' }}>{mk.bobot}</td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{mk.mutu}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Belum ada catatan transkrip akademik yang tersinkronkan.
                </div>
              )}

              {/* Ringkasan Akumulasi Total */}
              <div className="card" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#f8fafc', marginTop: '16px', padding: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>TOTAL SEMESTER</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#6b21a8' }}>
                    {transkrip?.ringkasan.total_semester || 5}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>TOTAL SKS LULUS</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#166534' }}>
                    {transkrip?.ringkasan.total_sks || 84}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>IPK KUMULATIF</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e40af' }}>
                    {transkrip?.ringkasan.ipk || '3.90'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
