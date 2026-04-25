import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import TopBar from '../components/common/TopBar';
import { NotifProvider } from '../contexts/NotifContext';

const AppLayout = () => {
  const [open, setOpen] = useState(false);
  return (
    <NotifProvider>
      <div className="app-layout">
        <button className="hamburger" onClick={() => setOpen(true)}>☰</button>
        <Sidebar isOpen={open} onClose={() => setOpen(false)} />
        <main className="main-content">
          <TopBar />
          <Outlet />
        </main>
      </div>
    </NotifProvider>
  );
};

export default AppLayout;
