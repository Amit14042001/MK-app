/**
 * MK App — Customer Auth Context (Full)
 * OTP login, JWT management, auto-refresh, profile state
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

const AuthContext = createContext({});
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  // ── Restore session ──────────────────────────────────────
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const [token, userData, firstLaunch] = await Promise.all([
        AsyncStorage.getItem('mk_access_token'),
        AsyncStorage.getItem('mk_user'),
        AsyncStorage.getItem('mk_onboarded'),
      ]);

      setIsFirstLaunch(!firstLaunch);

      if (token && userData) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        const parsed = JSON.parse(userData);
        setUser(parsed);
        // Refresh user data in background
        refreshUserSilent();
      }
    } catch (err) {
      console.error('[Auth] Restore session error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserSilent = async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data.user) {
        setUser(data.user);
        await AsyncStorage.setItem('mk_user', JSON.stringify(data.user));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        await handleRefreshToken();
      }
    }
  };

  const handleRefreshToken = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('mk_refresh_token');
      if (!refreshToken) { await clearSession(); return; }
      const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
      await AsyncStorage.setItem('mk_access_token', data.accessToken);
      api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
    } catch {
      await clearSession();
    }
  };

  const clearSession = async () => {
    delete api.defaults.headers.common.Authorization;
    await AsyncStorage.multiRemove(['mk_access_token', 'mk_refresh_token', 'mk_user']);
    setUser(null);
  };

  // ── Request interceptor ──────────────────────────────────
  useEffect(() => {
    const reqInterceptor = api.interceptors.request.use(async config => {
      const token = await AsyncStorage.getItem('mk_access_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    const resInterceptor = api.interceptors.response.use(
      res => res,
      async err => {
        if (err.response?.status === 401 && !err.config._retry) {
          err.config._retry = true;
          await handleRefreshToken();
          const token = await AsyncStorage.getItem('mk_access_token');
          if (token) {
            err.config.headers.Authorization = `Bearer ${token}`;
            return api(err.config);
          }
        }
        return Promise.reject(err);
      }
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // ── Auth methods ─────────────────────────────────────────
  const sendOTP = useCallback(async (phone) => {
    const { data } = await api.post('/auth/send-otp', { phone });
    return data;
  }, []);

  const verifyOTP = useCallback(async (phone, otp, name) => {
    const { data } = await api.post('/auth/verify-otp', { phone, otp, name });
    const { accessToken, refreshToken, user: userData } = data;

    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    await AsyncStorage.multiSet([
      ['mk_access_token',  accessToken],
      ['mk_refresh_token', refreshToken],
      ['mk_user',          JSON.stringify(userData)],
    ]);
    setUser(userData);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('mk_refresh_token');
      if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => {});
    } catch {}
    await clearSession();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      await AsyncStorage.setItem('mk_user', JSON.stringify(data.user));
    } catch {}
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem('mk_user', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const markOnboarded = useCallback(async () => {
    await AsyncStorage.setItem('mk_onboarded', 'true');
    setIsFirstLaunch(false);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, isFirstLaunch,
      sendOTP, verifyOTP, logout, refreshUser, updateUser, markOnboarded,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
