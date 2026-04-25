import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifs } from '../../contexts/NotifContext';
import { Link } from 'react-router-dom';

const TopBar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { unread } = useNotifs();

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Can add breadcrumbs here later */}
      </div>
      
      <div className="topbar-right">
        <label className="theme-switch-mini" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
          <span className="theme-slider-mini">
            <span className="theme-icon-mini">{theme === 'dark' ? '🌙' : '☀️'}</span>
          </span>
        </label>

        <div className="topbar-divider" />

        <Link to="/notifications" className="topbar-icon-btn">
          <span>🔔</span>
          {unread > 0 && <span className="icon-badge">{unread}</span>}
        </Link>

        <Link to="/profile" className="topbar-user">
          <div className="topbar-avatar">{user?.avatar || '👤'}</div>
          <span className="topbar-username">{user?.name?.split(' ')[0]}</span>
        </Link>
      </div>
    </header>
  );
};

export default TopBar;
