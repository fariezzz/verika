// packages/frontend/src/components/Navbar.tsx
// Bar Navigasi Terpadu VERIKA Academic (Desktop sticky 64px, Mobile 54px with hamburger dropdown)

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldIcon, LogOutIcon, DeviceIcon, MenuIcon, XIcon } from './Icons';

interface NavbarProps {
  currentView: 'dashboard' | 'security-demo';
  onViewChange: (view: 'dashboard' | 'security-demo') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange }) => {
  const { user, logout, deviceId } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'dosen':
        return 'Dosen';
      case 'mahasiswa':
        return 'Mahasiswa';
      default:
        return role;
    }
  };

  const handleNavClick = (view: 'dashboard' | 'security-demo') => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="navbar-header">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', position: 'relative' }}>
        {/* Sisi Kiri: Brand & Logo VERIKA */}
        <div
          onClick={() => handleNavClick('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#0e4b37',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              flexShrink: 0
            }}
          >
            <ShieldIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0e4b37', lineHeight: 1.1, letterSpacing: '-0.3px' }}>
              VERIKA
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
              Sistem Nilai Akademik
            </div>
          </div>
        </div>

        {/* Sisi Kanan Desktop: Identitas User, Tombol Demo, & Tombol Keluar */}
        <div className="navbar-desktop">
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {user?.nama || user?.username}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                {user ? getRoleLabel(user.role) : ''}
              </span>
              <span style={{ color: '#cbd5e1', fontSize: '10px' }}>•</span>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <DeviceIcon size={12} /> {deviceId}
              </span>
            </div>
          </div>

          <button
            onClick={() => onViewChange(currentView === 'dashboard' ? 'security-demo' : 'dashboard')}
            className={`btn ${currentView === 'security-demo' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ height: '36px', padding: '0 12px', fontSize: '12px' }}
            title={currentView === 'security-demo' ? 'Kembali ke Dashboard Utama' : 'Buka Halaman Uji Zero Trust'}
          >
            <ShieldIcon size={14} />
            <span>{currentView === 'security-demo' ? 'Dashboard' : 'Uji Zero Trust'}</span>
          </button>

          <button
            onClick={() => logout()}
            className="btn btn-secondary"
            style={{ height: '36px', padding: '0 12px', fontSize: '12px', color: '#dc2626' }}
            title="Keluar dari sesi"
          >
            <LogOutIcon size={14} />
            <span>Keluar</span>
          </button>
        </div>

        {/* Tombol Hamburger Khusus Mobile (54px Navbar) */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>

        {/* Menu Dropdown Mobile saat Hamburger Diklik */}
        {isMobileMenuOpen && (
          <div className="navbar-mobile-menu">
            <div style={{ paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                {user?.nama || user?.username}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  {user ? getRoleLabel(user.role) : ''}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <DeviceIcon size={12} /> {deviceId}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleNavClick(currentView === 'dashboard' ? 'security-demo' : 'dashboard')}
              className={`btn ${currentView === 'security-demo' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: '100%', height: '38px', fontSize: '13px', justifyContent: 'center' }}
            >
              <ShieldIcon size={15} />
              <span>{currentView === 'security-demo' ? 'Kembali ke Dashboard' : 'Uji Keamanan Zero Trust'}</span>
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
              className="btn btn-danger"
              style={{ width: '100%', height: '38px', fontSize: '13px', justifyContent: 'center' }}
            >
              <LogOutIcon size={15} />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
