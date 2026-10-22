// packages/frontend/src/components/DosenDashboard.tsx
// Dasbor Pengelolaan Nilai Dosen SINTESYS UNSIL dengan Kebijakan Akses Berbasis Waktu & Kepemilikan

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ClassItem, NilaiItem } from '../types';
import { CheckCircleIcon, AlertTriangleIcon, RefreshCwIcon, EditIcon, ClockIcon } from './Icons';

export const DosenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal Edit Nilai
  const [editingGrade, setEditingGrade] = useState<NilaiItem | null>(null);
  const [inputScore, setInputScore] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal Konfirmasi Finalisasi
  const [confirmFinalizeClass, setConfirmFinalizeClass] = useState<ClassItem | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Uji Coba Pelanggaran Zero Trust (Mengubah Nilai Kelas Dosen Lain)
  const [violationResult, setViolationResult] = useState<{ status: string; message: string } | null>(null);
  const [isTestingViolation, setIsTestingViolation] = useState(false);

  const fetchClasses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await api.get<{ data: ClassItem[] }>('/nilai');
      const classData = resp.data || [];
      setClasses(classData);
      if (classData.length > 0 && selectedClassId === null) {
        setSelectedClassId(classData[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat kelas yang diampu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0] || null;

  // Aksi Update Nilai
  const handleUpdateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;

    setIsUpdating(true);
    setError(null);
    setActionSuccess(null);

    try {
      const score = parseFloat(inputScore);
      const updateResp = await api.put<{ message: string; data: NilaiItem }>(`/nilai/${editingGrade.id}`, {
        nilai_angka: score
      });

      setActionSuccess(updateResp.message || 'Nilai berhasil disimpan');
      setEditingGrade(null);
      await fetchClasses();
    } catch (err: any) {
      setError(`Gagal memperbarui nilai: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Aksi Finalisasi Kelas & Pemicu Sinkronisasi Transkrip
  const handleFinalizeClass = async () => {
    if (!confirmFinalizeClass) return;

    setIsFinalizing(true);
    setError(null);
    setActionSuccess(null);

    try {
      const finalizeResp = await api.post<{
        message: string;
        sync_status: string;
        synced_count: number;
      }>(`/kelas/${confirmFinalizeClass.id}/finalisasi`);

      setActionSuccess(`${finalizeResp.message} (Total ${finalizeResp.synced_count} nilai disinkronkan)`);
      setConfirmFinalizeClass(null);
      await fetchClasses();
    } catch (err: any) {
      setError(`Finalisasi ditolak: ${err.message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Uji Coba Zero Trust: Dosen mencoba mengubah nilai pada ID milik dosen lain
  const handleTestUnauthorizedEdit = async () => {
    setIsTestingViolation(true);
    setViolationResult(null);

    // Coba edit nilai ID 6 (milik kelas dosen lain)
    const otherLecturerGradeId = 6;
    try {
      await api.put(`/nilai/${otherLecturerGradeId}`, { nilai_angka: 99.9 });
      setViolationResult({
        status: 'danger',
        message: 'PERINGATAN: Berhasil mengubah nilai kelas dosen lain! Kebijakan keamanan jebol.'
      });
    } catch (err: any) {
      setViolationResult({
        status: 'success',
        message: `BERHASIL DIBLOKIR: Gateway Policy Engine menolak permintaan (${err.status || 403}): ${err.message}`
      });
    } finally {
      setIsTestingViolation(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 20px' }}>
      {/* Header Dashboard Dosen */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            PENGELOLAAN NILAI PERKULIAHAN
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Portal Dosen Pengampu • Program Studi Informatika Universitas Siliwangi
          </p>
        </div>

        <button onClick={fetchClasses} className="btn btn-secondary" style={{ fontSize: '13px' }}>
          <RefreshCwIcon size={14} /> Refresh Data
        </button>
      </div>

      {/* Banner Pesan Sukses / Error */}
      {actionSuccess && (
        <div style={{ padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircleIcon size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangleIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748b', marginBottom: '24px' }}>
          <RefreshCwIcon size={24} />
          <div style={{ marginTop: '8px', fontSize: '13px' }}>Memuat daftar kelas dari API Gateway...</div>
        </div>
      ) : (
        <>
          {/* Selector Kelas yang Diampu */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '6px' }}>
        {classes.map((cls) => {
          const isSelected = cls.id === (selectedClass?.id ?? null);
          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              style={{
                padding: '14px 20px',
                borderRadius: '8px',
                border: isSelected ? '2px solid #0e4b37' : '1px solid #e2e8f0',
                background: isSelected ? '#ffffff' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                minWidth: '240px',
                boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                  {cls.kode_mk} - Kelas {cls.kelas}
                </span>
                {cls.is_finalized ? (
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>Final</span>
                ) : (
                  <span className="badge badge-warning" style={{ fontSize: '10px' }}>Draf</span>
                )}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                {cls.nama_mk}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {cls.sks} SKS • Semester {cls.semester} • {cls.peserta?.length || 0} Mahasiswa
              </div>
            </button>
          );
        })}
      </div>

      {/* Konten Kelas Terpilih */}
      {selectedClass ? (
        <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
          {/* Header Info Kelas & Tombol Finalisasi */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '18px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedClass.nama_mk} ({selectedClass.kode_mk})
                </h3>
                <span className="badge badge-secondary">Kelas {selectedClass.kelas}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Semester {selectedClass.semester} • Bobot {selectedClass.sks} SKS • Dosen Pengampu: {user?.nama}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedClass.is_finalized ? (
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <CheckCircleIcon size={14} /> Nilai Telah Difinalisasi & Dikunci
                  </span>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                    {selectedClass.sync_message || 'Tersinkron ke Service Transkrip'}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmFinalizeClass(selectedClass)}
                  className="btn btn-primary"
                  style={{ fontSize: '13px', backgroundColor: '#0e4b37' }}
                >
                  <CheckCircleIcon size={16} /> Finalisasi Nilai Kelas
                </button>
              )}
            </div>
          </div>

          {/* Tabel Nilai Mahasiswa */}
          <div className="table-container">
            <table className="academic-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>NIM</th>
                  <th>Nama Mahasiswa</th>
                  <th>Email Kampus</th>
                  <th style={{ textAlign: 'center' }}>Nilai Angka</th>
                  <th style={{ textAlign: 'center' }}>Huruf Mutu</th>
                  <th style={{ textAlign: 'center' }}>Bobot</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {selectedClass.peserta && selectedClass.peserta.length > 0 ? (
                  selectedClass.peserta.map((peserta, idx) => (
                    <tr key={peserta.id}>
                      <td>{idx + 1}</td>
                      <td><strong>{peserta.nim}</strong></td>
                      <td>{peserta.nama_mahasiswa}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{peserta.email}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '14px' }}>
                        {peserta.nilai_angka}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-primary">{peserta.nilai_huruf}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{peserta.bobot}</td>
                      <td style={{ textAlign: 'center' }}>
                        {peserta.is_final ? (
                          <span className="badge badge-success">Final</span>
                        ) : (
                          <span className="badge badge-warning">Draf</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setEditingGrade(peserta);
                            setInputScore(String(peserta.nilai_angka));
                          }}
                          disabled={peserta.is_final || selectedClass.is_finalized}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          title={peserta.is_final ? 'Nilai sudah final tidak dapat diubah' : 'Ubah nilai'}
                        >
                          <EditIcon size={13} /> Ubah
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Tidak ada mahasiswa terdaftar di kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
        </>
      )}

      {/* Box Demonstrasi Keamanan Zero Trust: Uji Kebijakan Dosen */}
      <div className="card" style={{ padding: '20px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <AlertTriangleIcon size={18} style={{ color: '#d97706' }} />
          <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
            Demonstrasi Zero Trust: Verifikasi Hak Akses & Kepemilikan Kelas
          </h4>
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
          Berdasarkan prinsip <strong>Least Privilege</strong>, dosen dilarang memanipulasi nilai kelas yang diampu oleh dosen lain. Klik tombol di bawah untuk membuktikan penolakan otomatis oleh Policy Engine Gateway:
        </p>

        <button
          onClick={handleTestUnauthorizedEdit}
          disabled={isTestingViolation}
          className="btn btn-secondary"
          style={{ fontSize: '12px', borderColor: '#d97706', color: '#b45309' }}
        >
          {isTestingViolation ? 'Mengirim Request Uji...' : 'Uji Coba Ubah Nilai Kelas Dosen Lain'}
        </button>

        {violationResult && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              background: violationResult.status === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${violationResult.status === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: violationResult.status === 'success' ? '#166534' : '#b91c1c'
            }}
          >
            {violationResult.message}
          </div>
        )}
      </div>

      {/* Modal Edit Nilai */}
      {editingGrade && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Ubah Nilai Mahasiswa
              </h3>
              <button
                onClick={() => setEditingGrade(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateGrade}>
              <div className="modal-body">
                <div style={{ marginBottom: '14px', fontSize: '13px' }}>
                  <div style={{ color: '#64748b' }}>Mahasiswa:</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {editingGrade.nama_mahasiswa} ({editingGrade.nim})
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nilai Angka (0 - 100)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="form-input form-input-no-icon"
                    value={inputScore}
                    onChange={(e) => setInputScore(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Huruf mutu dan bobot akan dikalkulasi otomatis sesuai standar akademik UNSIL.
                  </span>
                </div>

                <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: '6px', fontSize: '11px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ClockIcon size={14} /> Perubahan nilai hanya diperbolehkan pada jam operasional 07:00 - 21:00 WIB.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="btn btn-secondary"
                  disabled={isUpdating}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Finalisasi Kelas */}
      {confirmFinalizeClass && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Konfirmasi Finalisasi Nilai Kelas
              </h3>
              <button
                onClick={() => setConfirmFinalizeClass(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '14px', fontSize: '13px' }}>
                Anda akan memfinalisasi seluruh nilai pada kelas:
                <div style={{ fontWeight: 800, color: '#0e4b37', fontSize: '15px', marginTop: '4px' }}>
                  {confirmFinalizeClass.nama_mk} ({confirmFinalizeClass.kode_mk})
                </div>
              </div>

              <div style={{ padding: '14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                <strong>Peringatan Kebijakan Zero Trust:</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '6px' }}>
                  <li>Seluruh nilai mahasiswa akan dikunci permanen dan tidak dapat diubah kembali.</li>
                  <li>Service Nilai akan meminta <em>Service Token</em> ke Gateway untuk menyinkronkan data langsung ke Service Transkrip.</li>
                  <li>Waktu operasional wajib berada dalam rentang 07:00 - 21:00 WIB.</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setConfirmFinalizeClass(null)}
                className="btn btn-secondary"
                disabled={isFinalizing}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFinalizeClass}
                className="btn btn-primary"
                disabled={isFinalizing}
                style={{ backgroundColor: '#0e4b37' }}
              >
                {isFinalizing ? 'Memproses Sinkronisasi...' : 'Ya, Finalisasi & Sinkronkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
