// packages/frontend/src/App.tsx
// Komponen Utama Aplikasi Web Sistem Nilai Zero Trust

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { MahasiswaDashboard } from './components/MahasiswaDashboard';
import { DosenDashboard } from './components/DosenDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ShieldIcon, RefreshCwIcon } from './components/Icons';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#0e4b37', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <ShieldIcon size={28} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
          <RefreshCwIcon size={16} /> Memverifikasi status sesi & integritas token...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {user.role === 'mahasiswa' && <MahasiswaDashboard />}
        {user.role === 'dosen' && <DosenDashboard />}
        {user.role === 'admin' && <AdminDashboard />}
      </main>

      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '18px 0', marginTop: 'auto', fontSize: '12px', color: '#64748b' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Universitas Siliwangi</strong> • Jurusan Informatika • Keamanan Informasi (KP70065004)
          </div>
          <div>
            Arsitektur Zero Trust (NIST SP 800-207 Policy Enforcement Point)
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
