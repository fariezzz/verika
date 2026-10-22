// packages/frontend/src/components/AdminDashboard.tsx
// Dasbor Administrator Akademik SINTESYS UNSIL & Audit Log Viewer (PEP NIST SP 800-207)

import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { TranskripResponse, AuditLog } from '../types';
import { SearchIcon, GraduationCapIcon, ShieldIcon, RefreshCwIcon, AlertTriangleIcon } from './Icons';

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

  // Uji Coba Zero Trust Admin (Mencoba memanggil sinkronisasi langsung)
  const [adminViolationResult, setAdminViolationResult] = useState<{ status: string; message: string } | null>(null);
  const [isTestingAdminSync, setIsTestingAdminSync] = useState(false);

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

  // Uji Coba Zero Trust: Admin dilarang memanggil endpoint sinkronisasi transkrip (harus service token)
  const handleTestAdminSyncViolation = async () => {
    setIsTestingAdminSync(true);
    setAdminViolationResult(null);

    try {
      await api.post('/transkrip/sinkron', {
        class_id: 1,
        items: []
      });
      setAdminViolationResult({
        status: 'danger',
        message: 'PERINGATAN: Admin diizinkan memanggil sinkronisasi antarlayanan! Prinsip Least Privilege gagal.'
      });
    } catch (err: any) {
      setAdminViolationResult({
        status: 'success',
        message: `BERHASIL DIBLOKIR: Gateway & Service Transkrip menolak permintaan (${err.status || 403}): ${err.message}`
      });
      fetchAuditLogs();
    } finally {
      setIsTestingAdminSync(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (auditFilter === 'ALL') return true;
    return log.decision === auditFilter;
  });

  return (
    <div className="container" style={{ padding: '32px 20px' }}>
      {/* Header Halaman Admin */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            PORTAL ADMINISTRATOR AKADEMIK
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Pengawasan Transkrip Seluruh Mahasiswa & Pusat Audit Log Keamanan Policy Enforcement Point (PEP)
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('transkrip')}
            className={`btn ${activeTab === 'transkrip' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '8px 16px', border: 'none' }}
          >
            <GraduationCapIcon size={16} /> Transkrip Mahasiswa
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '8px 16px', border: 'none' }}
          >
            <ShieldIcon size={16} /> Audit Log PEP (Zero Trust)
          </button>
        </div>
      </div>

      {activeTab === 'transkrip' ? (
        /* Tab 1: Manajemen Transkrip Mahasiswa */
        <div>
          {/* Form Pencarian Mahasiswa Berdasarkan NIM */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <form onSubmit={handleSearchTranskrip} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Cari Transkrip Berdasarkan NIM Mahasiswa</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <SearchIcon size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Masukkan NIM mahasiswa (contoh: 247006111146, 247006111147, 247006111148)"
                    value={searchNim}
                    onChange={(e) => setSearchNim(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoadingTranskrip}
                className="btn btn-primary"
                style={{ height: '42px', padding: '0 24px' }}
              >
                {isLoadingTranskrip ? 'Mencari...' : 'Lihat Transkrip'}
              </button>
            </form>
          </div>

          {transkripError && (
            <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '24px' }}>
              <strong>Pencarian Gagal:</strong> {transkripError}
            </div>
          )}

          {transkripData && (
            <div>
              {/* Info Mahasiswa yang Ditemukan */}
              <div className="card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    DATA MAHASISWA TERVERIFIKASI
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {transkripData.mahasiswa.nama}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                    NIM: <strong>{transkripData.mahasiswa.identifier}</strong> • Program Studi: S1 Informatika • Email: {transkripData.mahasiswa.email}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', textAlign: 'center' }}>
                  <div style={{ padding: '8px 16px', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                    <div style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 700 }}>IPK KUMULATIF</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#581c87' }}>
                      {transkripData.ringkasan.ipk}
                    </div>
                  </div>
                  <div style={{ padding: '8px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '10px', color: '#166534', fontWeight: 700 }}>TOTAL SKS LULUS</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#14532d' }}>
                      {transkripData.ringkasan.total_sks}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabel Transkrip per Semester */}
              {transkripData.semesters.map((sem, sIdx) => (
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
                          <th>Waktu Sinkronisasi</th>
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

          {/* Kotak Demonstrasi Zero Trust untuk Admin */}
          <div className="card" style={{ padding: '20px', background: '#f8fafc', border: '1px dashed #cbd5e1', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangleIcon size={18} style={{ color: '#dc2626' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Demonstrasi Zero Trust: Pembatasan Wewenang Administrator (Least Privilege)
              </h4>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
              Dalam arsitektur Zero Trust, peran Admin <strong>tidak otomatis</strong> memiliki akses ke operasi internal antarlayanan (seperti sinkronisasi nilai ke transkrip). Endpoint <code>POST /transkrip/sinkron</code> hanya menerima token service milik Service Nilai. Klik tombol di bawah untuk menguji:
            </p>

            <button
              onClick={handleTestAdminSyncViolation}
              disabled={isTestingAdminSync}
              className="btn btn-danger"
              style={{ fontSize: '12px' }}
            >
              {isTestingAdminSync ? 'Menguji Permintaan...' : 'Uji Panggilan Sinkronisasi sebagai Admin'}
            </button>

            {adminViolationResult && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: adminViolationResult.status === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${adminViolationResult.status === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  color: adminViolationResult.status === 'success' ? '#166534' : '#b91c1c'
                }}
              >
                {adminViolationResult.message}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: Audit Log Viewer (PEP NIST SP 800-207) */
        <div>
          {/* Header & Filter Audit Log */}
          <div className="card" style={{ padding: '18px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Filter Keputusan:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setAuditFilter('ALL')}
                  className={`btn ${auditFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Semua ({auditLogs.length})
                </button>
                <button
                  onClick={() => setAuditFilter('ALLOW')}
                  className={`btn ${auditFilter === 'ALLOW' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 12px', fontSize: '12px', color: '#166534' }}
                >
                  ALLOW ({auditLogs.filter((l) => l.decision === 'ALLOW').length})
                </button>
                <button
                  onClick={() => setAuditFilter('DENY')}
                  className={`btn ${auditFilter === 'DENY' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 12px', fontSize: '12px', color: '#b91c1c' }}
                >
                  DENY ({auditLogs.filter((l) => l.decision === 'DENY').length})
                </button>
              </div>
            </div>

            <button
              onClick={fetchAuditLogs}
              disabled={isLoadingAudit}
              className="btn btn-secondary"
              style={{ fontSize: '12px' }}
            >
              <RefreshCwIcon size={14} /> Refresh Log
            </button>
          </div>

          {/* Tabel Catatan Audit Log PEP */}
          <div className="table-container">
            <table className="academic-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>ID</th>
                  <th>Waktu (Asia/Jakarta)</th>
                  <th>Subjek</th>
                  <th>Role</th>
                  <th>Endpoint & Method</th>
                  <th>Device ID</th>
                  <th style={{ textAlign: 'center' }}>Keputusan</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Alasan Evaluasi Kebijakan (Policy Reason)</th>
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
