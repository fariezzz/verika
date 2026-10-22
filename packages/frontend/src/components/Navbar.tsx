// packages/frontend/src/components/Navbar.tsx
// Bar Navigasi Terpadu SINTESYS Universitas Siliwangi

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldIcon, LogOutIcon, DeviceIcon, ClockIcon } from './Icons';

export const Navbar: React.FC = () => {
  const { user, logout, deviceId } = useAuth();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="badge badge-danger">ADMINISTRATOR</span>;
      case 'dosen':
        return <span className="badge badge-primary">DOSEN PENGAMPU</span>;
      case 'mahasiswa':
        return <span className="badge badge-success">MAHASISWA AKTIF</span>;
      default:
        return <span className="badge badge-secondary">{role.toUpperCase()}</span>;
    }
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        height: '64px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}
    >
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        {/* Sisi Kiri: Logo & Identitas Kampus */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#0e4b37',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px'
            }}
          >
            <ShieldIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0e4b37', lineHeight: 1.1 }}>
              SINTESYS UNSIL
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              Sistem Nilai Akademik Zero Trust
            </div>
          </div>
        </div>

        {/* Tengah: Indikator Waktu Akses Operasional (07:00 - 21:00 WIB) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
          <ClockIcon size={14} style={{ color: '#16a34a' }} />
          <span>Jam Akses Nilai: <strong>07:00 - 21:00 WIB</strong></span>
        </div>

        {/* Sisi Kanan: Identitas User, Perangkat & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {user?.nama || user?.username}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginTop: '2px' }}>
              {user && getRoleBadge(user.role)}
              <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <DeviceIcon size={12} /> {deviceId}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px', height: '36px' }}
            title="Keluar dari sesi"
          >
            <LogOutIcon size={16} /> Keluar
          </button>
        </div>
      </div>
    </header>
  );
};
