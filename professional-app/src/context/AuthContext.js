// ============================================================
// Professional App - AuthContext
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://10.0.2.2:5000/api/v1';

const AuthContext = createContext({});
export const useProfAuth = () => useContext(AuthContext);

export function ProfAuthProvider({ children }) {
  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const [token, profData] = await Promise.all([
        AsyncStorage.getItem('prof_access_token'),
        AsyncStorage.getItem('prof_data'),
      ]);
      if (token && profData) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setProfessional(JSON.parse(profData));
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const login = async (userData, accessToken, refreshToken) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    await AsyncStorage.multiSet([
      ['prof_access_token', accessToken],
      ['prof_refresh_token', refreshToken],
      ['prof_data', JSON.stringify(userData)],
    ]);
    setProfessional(userData);
  };

  const logout = async () => {
    delete axios.defaults.headers.common['Authorization'];
    await AsyncStorage.multiRemove(['prof_access_token', 'prof_refresh_token', 'prof_data']);
    setProfessional(null);
    setIsOnline(false);
  };

  const updateOnlineStatus = async (status) => {
    try {
      await axios.put(`${API_URL}/professionals/availability`, { isAvailable: status });
      setIsOnline(status);
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  return (
    <AuthContext.Provider value={{ professional, loading, isOnline, login, logout, updateOnlineStatus }}>
      {children}
    </AuthContext.Provider>
  );
}
