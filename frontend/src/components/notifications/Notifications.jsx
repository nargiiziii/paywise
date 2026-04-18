import { useNotifs } from '../../contexts/NotifContext';
import { fmtRelative } from '../../utils/format';

const TYPE_ICONS = { success: '✅', security: '🔒', info: 'ℹ️', warning: '⚠️', error: '❌' };

const Notifications = () => {
  const { notifications, unread, markAllRead } = useNotifs();

  return (
    <div className="page-wrap" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-sub">{unread > 0 ? `${unread} unread notifications` : 'All caught up!'}</p>
          </div>
          {unread > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              ✓ Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="card">
        {notifications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((n, i) => (
              <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                style={{ borderBottom: i < notifications.length - 1 ? '1px solid var(--border-0)' : 'none', borderLeft: !n.is_read ? '2px solid var(--teal)' : 'none' }}>
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{TYPE_ICONS[n.type] || 'ℹ️'}</div>
                <div className="notif-body" style={{ flex: 1 }}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{fmtRelative(n.created_at)}</div>
                </div>
                {!n.is_read && <div className="notif-dot" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty-icon">🔔</div>
            <div className="empty-title">No notifications yet</div>
            <div className="empty-sub">You'll see alerts about transfers and account activity here</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
