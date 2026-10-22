// packages/frontend/src/components/MahasiswaDashboard.tsx
// Dasbor Akademik Mahasiswa - Sistem Nilai & Transkrip Akademik

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { NilaiItem, TranskripResponse } from '../types';
import { BookOpenIcon, GraduationCapIcon, RefreshCwIcon, CheckCircleIcon } from './Icons';
import { formatSemester } from '../utils/formatters';

export const MahasiswaDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'khs' | 'transkrip'>('khs');
  const [nilaiList, setNilaiList] = useState<NilaiItem[]>([]);
  const [transkrip, setTranskrip] = useState<TranskripResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Hitung total SKS semester berjalan
  const totalSksKhs = nilaiList.reduce((acc, item) => acc + (item.sks || 0), 0);
  const activeSemesterCode = nilaiList[0]?.semester || '20261';

  return (
    <div className="container" style={{ padding: '24px 20px' }}>
      {/* Header Halaman */}
      <div className="page-header-flex">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', marginBottom: '2px' }}>
            Hasil Studi Mahasiswa
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Informasi Nilai Akademik Semester Berjalan dan Transkrip Kumulatif
          </p>
        </div>

        {/* Tombol Muat Ulang Data */}
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="btn btn-secondary"
          style={{ height: '36px', padding: '0 14px', fontSize: '13px' }}
          title="Muat ulang data dari server"
        >
          <RefreshCwIcon size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isLoading ? 'Memuat...' : 'Muat Ulang Data'}</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px' }}>
          <strong>Gagal memuat data:</strong> {error}
        </div>
      )}

      {/* Grid Utama: Sidebar Profil Kiri & Konten Nilai Kanan */}
      <div className="dashboard-layout-grid">
        {/* Kolom Kiri: Kartu Profil & Ringkasan Akademik Mahasiswa */}
        <div>
          <div className="card" style={{ padding: '22px' }}>
            {/* Identitas Mahasiswa */}
            <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {user?.nama || 'MUHAMMAD FARIEZ RIZIQ ILHAM'}
              </h2>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                NIM: {user?.identifier || '247006111146'}
              </div>
            </div>

            {/* Rincian Akademik Mahasiswa */}
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Program Studi</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>S1 Informatika</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Dosen Wali</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Alam Rahmatulloh, S.T., M.T.</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Kelas</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>Kelas E</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Status</span>
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>Aktif</span>
                </div>
              </div>
            </div>

            {/* Kotak Statistik IPK Kumulatif & SKS Lulus */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase' }}>
                  IPK Kumulatif
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#581c87', marginTop: '2px' }}>
                  {transkrip?.ringkasan.ipk || '3.90'}
                </div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                  SKS Lulus
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                  {transkrip?.ringkasan.total_sks || '84'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Tab Navigasi & Tabel Hasil Studi */}
        <div>
          {/* Navigasi Tab */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setActiveTab('khs')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'khs' ? '3px solid #0e4b37' : '3px solid transparent',
                color: activeTab === 'khs' ? '#0e4b37' : '#64748b',
                fontWeight: activeTab === 'khs' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                marginBottom: '-2px',
                whiteSpace: 'nowrap'
              }}
            >
              <BookOpenIcon size={16} /> Kartu Hasil Studi (KHS)
            </button>

            <button
              onClick={() => setActiveTab('transkrip')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'transkrip' ? '3px solid #0e4b37' : '3px solid transparent',
                color: activeTab === 'transkrip' ? '#0e4b37' : '#64748b',
                fontWeight: activeTab === 'transkrip' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                marginBottom: '-2px',
                whiteSpace: 'nowrap'
              }}
            >
              <GraduationCapIcon size={16} /> Transkrip Akademik
            </button>
          </div>

          {isLoading ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCwIcon size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: '8px', fontSize: '13px' }}>Memuat data akademik...</div>
            </div>
          ) : activeTab === 'khs' ? (
            /* Tab 1: KHS Mahasiswa Semester Berjalan */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#3d5a45', color: '#ffffff', padding: '12px 18px', borderRadius: '8px 8px 0 0', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>
                  {formatSemester(activeSemesterCode)}
                </span>
                <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                  <span>Total SKS: <strong>{totalSksKhs}</strong></span>
                  <span>Mata Kuliah: <strong>{nilaiList.length}</strong></span>
                </div>
              </div>

              <div className="table-container" style={{ borderRadius: '0 0 8px 8px' }}>
                <table className="academic-table" style={{ minWidth: '650px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th style={{ width: '120px' }}>Kode MK</th>
                      <th>Nama Mata Kuliah</th>
                      <th style={{ textAlign: 'center', width: '60px' }}>SKS</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Nilai Angka</th>
                      <th style={{ textAlign: 'center', width: '80px' }}>Huruf</th>
                      <th style={{ textAlign: 'center', width: '70px' }}>Bobot</th>
                      <th>Dosen Pengampu</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nilaiList.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          Belum ada nilai yang terdaftar untuk semester ini.
                        </td>
                      </tr>
                    ) : (
                      nilaiList.map((item, idx) => (
                        <tr key={item.id}>
                          <td>{idx + 1}</td>
                          <td><code>{item.kode_mk}</code></td>
                          <td style={{ fontWeight: 600 }}>{item.nama_mk}</td>
                          <td style={{ textAlign: 'center' }}>{item.sks}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.nilai_angka}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-primary">{item.nilai_huruf}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.bobot}</td>
                          <td style={{ fontSize: '12px', color: '#475569' }}>{item.dosen_pengampu}</td>
                          <td style={{ textAlign: 'center' }}>
                            {item.is_final ? (
                              <span className="badge badge-success" title="Nilai telah berstatus final">
                                <CheckCircleIcon size={12} /> Final
                              </span>
                            ) : (
                              <span className="badge badge-warning" title="Nilai masih dalam bentuk draf">
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
                  <div key={sIdx} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#3d5a45', color: '#ffffff', padding: '10px 16px', borderRadius: '8px 8px 0 0', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>
                        {formatSemester(sem.semester)}
                      </span>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                        <span>SKS: <strong>{sem.sks}</strong></span>
                        <span>Total Mutu: <strong>{sem.mutu.toFixed(2)}</strong></span>
                        <span>IPS: <strong>{sem.ips}</strong></span>
                      </div>
                    </div>

                    <div className="table-container" style={{ borderRadius: '0 0 8px 8px' }}>
                      <table className="academic-table" style={{ minWidth: '600px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th style={{ width: '120px' }}>Kode MK</th>
                            <th>Nama Mata Kuliah</th>
                            <th style={{ textAlign: 'center', width: '60px' }}>SKS</th>
                            <th style={{ textAlign: 'center', width: '80px' }}>Nilai</th>
                            <th style={{ textAlign: 'center', width: '70px' }}>Bobot</th>
                            <th style={{ textAlign: 'center', width: '80px' }}>Mutu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sem.mata_kuliah.map((mk, mkIdx) => (
                            <tr key={mk.id}>
                              <td>{mkIdx + 1}</td>
                              <td><code>{mk.kode_mk}</code></td>
                              <td style={{ fontWeight: 600 }}>{mk.nama_mk}</td>
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

              {/* Ringkasan Kumulatif */}
              <div className="card" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: '#f8fafc', padding: '18px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Semester</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#6b21a8', marginTop: '2px' }}>
                    {transkrip?.ringkasan.total_semester || 5}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>SKS Lulus</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                    {transkrip?.ringkasan.total_sks || 84}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>IPK Kumulatif</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e40af', marginTop: '2px' }}>
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
