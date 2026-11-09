import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAccessToken } from '../lib/api';
import { API } from '../lib/httpSurface';
import { onSessionExpired } from '../lib/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const me = await api(API.me);
    setUser(me);
    return me;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api(API.refresh, { method: 'POST' });
        if (!alive) return;
        await refreshMe();
      } catch {
        if (alive) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return onSessionExpired(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(email, password) {
        const data = await api(API.login, {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data.user;
      },
      async logout() {
        try {
          await api(API.logout, { method: 'POST' });
        } finally {
          setAccessToken(null);
          setUser(null);
        }
      },
      refreshMe,
      isOwnerOrAdmin: user?.role === 'OWNER' || user?.role === 'ADMIN',
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
