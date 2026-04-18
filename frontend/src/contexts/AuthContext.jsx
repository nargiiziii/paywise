import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const Ctx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!localStorage.getItem('pw_token')) { setLoading(false); return; }
    try {
      const r = await api.get('/auth/me');
      setUser(r.data);
    } catch { localStorage.removeItem('pw_token'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('pw_token', r.data.token);
    setUser(r.data.user);
    return r.data;
  };

  const register = async (name, email, password, phone) => {
    const r = await api.post('/auth/register', { name, email, password, phone });
    localStorage.setItem('pw_token', r.data.token);
    setUser(r.data.user);
    return r.data;
  };

  const logout = () => { localStorage.removeItem('pw_token'); setUser(null); };

  const updateBalance = (balance, savings_balance) => {
    setUser(prev => ({
      ...prev,
      account: {
        ...prev.account,
        ...(balance !== undefined && { balance }),
        ...(savings_balance !== undefined && { savings_balance }),
      }
    }));
  };

  const updateCardFreeze = (frozen) => {
    setUser(prev => ({ ...prev, account: { ...prev.account, card_frozen: frozen } }));
  };

  const refresh = loadUser;

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, updateBalance, updateCardFreeze, refresh }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
