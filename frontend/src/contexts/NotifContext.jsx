import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const NCtx = createContext(null);

export const NotifProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const r = await api.get('/notifications');
      setNotifications(r.data.notifications);
      setUnread(r.data.unread_count);
    } catch {}
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    await api.post('/notifications/mark-all-read');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <NCtx.Provider value={{ notifications, unread, reload: load, markAllRead }}>
      {children}
    </NCtx.Provider>
  );
};

export const useNotifs = () => useContext(NCtx);
