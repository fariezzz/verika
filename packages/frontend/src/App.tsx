// packages/frontend/src/App.tsx
// Komponen Utama Aplikasi Web Sistem Nilai Akademik VERIKA

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { MahasiswaDashboard } from './components/MahasiswaDashboard';
import { DosenDashboard } from './components/DosenDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SecurityDemoPage } from './components/SecurityDemoPage';
import { ShieldIcon, RefreshCwIcon } from './components/Icons';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'security-demo'>('dashboard');

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#0e4b37', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          <ShieldIcon size={24} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
          <RefreshCwIcon size={14} style={{ animation: 'spin 1s linear infinite' }} /> Memeriksa status sesi autentikasi...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <Navbar currentView={currentView} onViewChange={setCurrentView} />

      <main style={{ flex: 1 }}>
        {currentView === 'security-demo' ? (
          <SecurityDemoPage onBackToDashboard={() => setCurrentView('dashboard')} />
        ) : (
          <>
            {user.role === 'mahasiswa' && <MahasiswaDashboard />}
            {user.role === 'dosen' && <DosenDashboard />}
            {user.role === 'admin' && <AdminDashboard />}
          </>
        )}
      </main>

      {/* Footer Bersih & Profesional */}
      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '16px 0', marginTop: 'auto', fontSize: '12px', color: '#64748b' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            © 2026 <strong>VERIKA Academic</strong> • Sistem Informasi Nilai Terpadu
          </div>
          <div>
            <button
              onClick={() => setCurrentView(currentView === 'dashboard' ? 'security-demo' : 'dashboard')}
              style={{ background: 'none', border: 'none', color: '#0e4b37', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: 0 }}
            >
              {currentView === 'dashboard' ? 'Laboratorium Uji Keamanan' : 'Kembali ke Dashboard Utama'}
            </button>
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
