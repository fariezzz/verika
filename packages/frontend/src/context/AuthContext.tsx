// packages/frontend/src/context/AuthContext.tsx
// Manajemen Sesi dan Autentikasi Pengguna di Memori Frontend (Zero Trust Best Practice)

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  deviceId: string | null;
  isLoading: boolean;
  login: (username: string, password: string, deviceId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(() => {
    return localStorage.getItem('last_device_id') || 'DEV-MHS-001';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inisialisasi: Periksa apakah ada refresh token aktif di cookie atau sesi
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const savedDevId = localStorage.getItem('last_device_id');
        if (savedDevId) {
          api.setCredentials(null, savedDevId);
          // Coba lakukan refresh token dari HttpOnly cookie
          const refreshResp = await api.post<{ accessToken: string; refreshToken?: string }>('/auth/refresh', {
            device_id: savedDevId
          });

          if (refreshResp.accessToken) {
            setToken(refreshResp.accessToken);
            api.setCredentials(refreshResp.accessToken, savedDevId);

            const meResp = await api.get<{ user: any }>('/auth/me');
            if (meResp.user) {
              setUser({
                id: meResp.user.sub,
                username: meResp.user.nama || meResp.user.sub,
                nama: meResp.user.nama,
                role: meResp.user.role,
                identifier: meResp.user.identifier,
                deviceId: savedDevId
              });
            }
          }
        }
      } catch (err) {
        // Belum ada sesi atau token dicabut
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkExistingSession();
  }, []);

  const login = async (username: string, password: string, selectedDeviceId: string) => {
    setIsLoading(true);
    try {
      api.setCredentials(null, selectedDeviceId);
      const resp = await api.post<{
        message: string;
        user: User;
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', {
        username,
        password,
        device_id: selectedDeviceId
      });

      setUser(resp.user);
      setToken(resp.accessToken);
      setDeviceId(selectedDeviceId);
      localStorage.setItem('last_device_id', selectedDeviceId);
      api.setCredentials(resp.accessToken, selectedDeviceId);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout warning:', err);
    } finally {
      setUser(null);
      setToken(null);
      api.setCredentials(null, deviceId);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, deviceId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
