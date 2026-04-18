import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifs } from '../../contexts/NotifContext';

const navItems = [
  { to: '/', icon: '⬡', label: 'Dashboard', end: true },
  { to: '/transfer', icon: '↗', label: 'Transfer' },
  { to: '/history', icon: '◷', label: 'History' },
  { to: '/savings', icon: '🪙', label: 'Savings' },
  { to: '/cards', icon: '💳', label: 'My Card' },
  { to: '/notifications', icon: '🔔', label: 'Notifications', badge: true },
];

const bottomItems = [
  { to: '/profile', icon: '◉', label: 'Profile' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { unread } = useNotifs();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); onClose?.(); };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'on' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">💳</div>
          <div className="logo-name">Pay<span>Wise</span></div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge && unread > 0 && <span className="nav-badge">{unread}</span>}
            </NavLink>
          ))}

          <div className="nav-section-label" style={{ marginTop: 8 }}>Account</div>
          {bottomItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <button className="nav-item" style={{ marginTop: 4, color: 'var(--red)' }} onClick={handleLogout}>
            <span className="nav-icon">⎋</span>
            Sign Out
          </button>
        </nav>

        <div className="sidebar-bottom">
          <NavLink to="/profile" className="user-pill" onClick={onClose}>
            <div className="user-ava">{user?.avatar || '👤'}</div>
            <div className="user-info-mini">
              <div className="user-name-mini">{user?.name || 'User'}</div>
              <div className="user-role-mini">{user?.occupation || 'Account Holder'}</div>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
