// packages/frontend/src/components/AdminDashboard.tsx
// Dasbor Administrator Akademik & Pusat Pemantauan Audit Log PEP

import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { TranskripResponse, AuditLog } from '../types';
import { SearchIcon, GraduationCapIcon, ShieldIcon, RefreshCwIcon } from './Icons';
import { formatSemester } from '../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transkrip' | 'audit'>('transkrip');

  // State Transkrip
  const [searchNim, setSearchNim] = useState('247006111146');
  const [transkripData, setTranskripData] = useState<TranskripResponse | null>(null);
  const [isLoadingTranskrip, setIsLoadingTranskrip] = useState(false);
  const [transkripError, setTranskripError] = useState<string | null>(null);

  // State Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'ALLOW' | 'DENY'>('ALL');

  // Ambil Transkrip Mahasiswa
  const handleSearchTranskrip = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchNim.trim()) return;

    setIsLoadingTranskrip(true);
    setTranskripError(null);

    try {
      const resp = await api.get<TranskripResponse>(`/transkrip/${searchNim.trim()}`);
      setTranskripData(resp);
    } catch (err: any) {
      setTranskripError(err?.message || 'Gagal memuat transkrip mahasiswa');
      setTranskripData(null);
    } finally {
      setIsLoadingTranskrip(false);
    }
  };

  // Ambil Audit Logs
  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const resp = await api.get<{ data: AuditLog[] }>('/audit-logs');
      setAuditLogs(resp.data || []);
    } catch (err: any) {
      console.error('Gagal mengambil audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    handleSearchTranskrip();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const filteredLogs = auditLogs.filter((log) => {
    if (auditFilter === 'ALL') return true;
    return log.decision === auditFilter;
  });

  return (
    <div className="container" style={{ padding: '24px 20px' }}>
      {/* Header Halaman Admin */}
      <div className="page-header-flex">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', marginBottom: '2px' }}>
            Portal Administrator Akademik
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Pemantauan Transkrip Mahasiswa dan Pengawasan Keputusan Policy Enforcement Point (PEP)
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('transkrip')}
            className={`btn ${activeTab === 'transkrip' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '6px 14px', border: 'none', height: '34px', whiteSpace: 'nowrap' }}
          >
            <GraduationCapIcon size={15} /> Transkrip Mahasiswa
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '6px 14px', border: 'none', height: '34px', whiteSpace: 'nowrap' }}
          >
            <ShieldIcon size={15} /> Audit Log PEP
          </button>
        </div>
      </div>

      {activeTab === 'transkrip' ? (
        /* Tab 1: Manajemen Transkrip Mahasiswa */
        <div>
          {/* Form Pencarian Mahasiswa Berdasarkan NIM */}
          <div className="card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
            <form onSubmit={handleSearchTranskrip} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Cari Berdasarkan NIM Mahasiswa</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <SearchIcon size={16} />
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: '9px 12px 9px 38px', fontSize: '13px' }}
                    placeholder="Contoh: 247006111146, 247006111147, 247006111148"
                    value={searchNim}
                    onChange={(e) => setSearchNim(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoadingTranskrip}
                className="btn btn-primary"
                style={{ height: '38px', padding: '0 20px', fontSize: '13px', flexShrink: 0 }}
              >
                {isLoadingTranskrip ? 'Mencari...' : 'Lihat Transkrip'}
              </button>
            </form>
          </div>

          {transkripError && (
            <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px' }}>
              <strong>Pencarian gagal:</strong> {transkripError}
            </div>
          )}

          {transkripData && (
            <div>
              {/* Info Mahasiswa yang Ditemukan */}
              <div className="card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    {transkripData.mahasiswa.nama}
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    NIM: <strong>{transkripData.mahasiswa.identifier}</strong> • Program Studi: S1 Informatika • Email: {transkripData.mahasiswa.email}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', textAlign: 'center' }}>
                  <div style={{ padding: '8px 16px', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                    <div style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase' }}>IPK Kumulatif</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#581c87', marginTop: '2px' }}>
                      {transkripData.ringkasan.ipk}
                    </div>
                  </div>
                  <div style={{ padding: '8px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '10px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>SKS Lulus</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                      {transkripData.ringkasan.total_sks}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabel Transkrip per Semester */}
              {transkripData.semesters.map((sem, sIdx) => (
                <div key={sIdx} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#3d5a45', color: '#ffffff', padding: '10px 16px', borderRadius: '8px 8px 0 0' }}>
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
                    <table className="academic-table" style={{ minWidth: '650px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th style={{ width: '120px' }}>Kode MK</th>
                          <th>Nama Mata Kuliah</th>
                          <th style={{ textAlign: 'center', width: '60px' }}>SKS</th>
                          <th style={{ textAlign: 'center', width: '80px' }}>Nilai</th>
                          <th style={{ textAlign: 'center', width: '70px' }}>Bobot</th>
                          <th style={{ textAlign: 'center', width: '80px' }}>Mutu</th>
                          <th style={{ width: '160px' }}>Waktu Sinkronisasi</th>
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
                            <td style={{ fontSize: '12px', color: '#64748b' }}>
                              {new Date(mk.synced_at).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Audit Log Viewer (PEP NIST SP 800-207) */
        <div>
          {/* Header & Filter Audit Log */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Filter Keputusan:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setAuditFilter('ALL')}
                  className={`btn ${auditFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '12px', height: '30px' }}
                >
                  Semua ({auditLogs.length})
                </button>
                <button
                  onClick={() => setAuditFilter('ALLOW')}
                  className={`btn ${auditFilter === 'ALLOW' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '12px', height: '30px', color: '#166534' }}
                >
                  ALLOW ({auditLogs.filter((l) => l.decision === 'ALLOW').length})
                </button>
                <button
                  onClick={() => setAuditFilter('DENY')}
                  className={`btn ${auditFilter === 'DENY' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '12px', height: '30px', color: '#b91c1c' }}
                >
                  DENY ({auditLogs.filter((l) => l.decision === 'DENY').length})
                </button>
              </div>
            </div>

            <button
              onClick={fetchAuditLogs}
              disabled={isLoadingAudit}
              className="btn btn-secondary"
              style={{ fontSize: '12px', height: '32px', padding: '0 12px' }}
            >
              <RefreshCwIcon size={13} style={{ animation: isLoadingAudit ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Tabel Catatan Audit Log PEP */}
          <div className="table-container">
            <table className="academic-table" style={{ minWidth: '850px' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>ID</th>
                  <th style={{ width: '150px' }}>Waktu</th>
                  <th style={{ width: '130px' }}>Subjek</th>
                  <th style={{ width: '90px' }}>Role</th>
                  <th style={{ width: '170px' }}>Endpoint</th>
                  <th style={{ width: '110px' }}>Device ID</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Keputusan</th>
                  <th style={{ textAlign: 'center', width: '60px' }}>Status</th>
                  <th>Alasan Evaluasi Kebijakan</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Tidak ada catatan audit log yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '11px', color: '#64748b' }}>#{log.id}</td>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td>
                        <strong>{log.subject}</strong>
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '10px' }}>
                          {log.role}
                        </span>
                      </td>
                      <td>
                        <code>{log.method} {log.endpoint}</code>
                      </td>
                      <td style={{ fontSize: '11px', color: '#64748b' }}>
                        {log.device_id || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {log.decision === 'ALLOW' ? (
                          <span className="badge badge-success">ALLOW</span>
                        ) : (
                          <span className="badge badge-danger">DENY</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        <span style={{ color: log.status_code >= 400 ? '#dc2626' : '#16a34a' }}>
                          {log.status_code}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#334155', maxWidth: '380px' }}>
                        {log.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
