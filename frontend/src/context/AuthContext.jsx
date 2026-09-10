import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('mm_token');
    if (!token) {
      setReady(true);
      return;
    }
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => {
        localStorage.removeItem('mm_token');
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      async login(email, password, rememberMe = true) {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('mm_token', data.token);
        if (rememberMe) {
          localStorage.setItem('mm_remember_email', email);
        } else {
          localStorage.removeItem('mm_remember_email');
        }
        setUser(data.user);
        return data.user;
      },
      async register(formData) {
        const { data } = await api.post('/auth/register', formData);
        localStorage.setItem('mm_token', data.token);
        setUser(data.user);
        return data.user;
      },
      async demo(role) {
        const { data } = await api.post('/auth/demo', { role });
        localStorage.setItem('mm_token', data.token);
        setUser(data.user);
        return data.user;
      },
      async forgotPassword(email) {
        const { data } = await api.post('/auth/forgot-password', { email });
        return data;
      },
      async resetPassword(token, password) {
        const { data } = await api.post('/auth/reset-password', { token, password });
        return data;
      },
      async updateProfile(updates) {
        const { data } = await api.patch('/auth/me', updates);
        setUser(data.user);
        return data.user;
      },
      logout() {
        localStorage.removeItem('mm_token');
        setUser(null);
      },
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
