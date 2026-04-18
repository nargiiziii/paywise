import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { fmtDate, $ } from '../../utils/format';

const Profile = () => {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', address: '', occupation: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setForm(p => ({ ...p, name: user.name || '', phone: user.phone || '', address: user.address || '', occupation: user.occupation || '' }));
    }
    api.get('/auth/activity').then(r => setActivity(r.data)).catch(() => {});
  }, [user]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (form.newPassword) {
      if (!form.currentPassword) e.currentPassword = 'Current password required';
      if (form.newPassword.length < 6) e.newPassword = 'Min 6 characters';
      if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Do not match';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { name: form.name, phone: form.phone, address: form.address, occupation: form.occupation };
      if (form.newPassword) { payload.currentPassword = form.currentPassword; payload.newPassword = form.newPassword; }
      await api.put('/auth/update-profile', payload);
      await refresh();
      toast.success('Profile updated!');
      setForm(p => ({ ...p, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const TABS = [
    { k: 'profile', l: 'Profile Info' },
    { k: 'security', l: 'Security' },
    { k: 'activity', l: 'Activity Log' },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your profile, security, and account preferences</p>
      </div>

      <div className="profile-layout">
        {/* Left: user card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="avatar-xl">{user?.avatar || '👤'}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>{user?.email}</div>
            {user?.occupation && <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>{user.occupation}</div>}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 8 }}>
              {user?.is_verified && <span className="badge badge-green">✓ Verified</span>}
              <span className="badge badge-teal">Checking</span>
            </div>
          </div>

          <div className="card">
            <div className="card-label">Account Summary</div>
            {[
              { lbl: 'Balance', val: $(user?.account?.balance || 0), color: 'var(--teal)' },
              { lbl: 'Savings', val: $(user?.account?.savings_balance || 0), color: 'var(--amber)' },
              { lbl: 'Member since', val: fmtDate(user?.created_at || new Date()) },
              { lbl: 'Last login', val: user?.last_login ? fmtDate(user.last_login) : '—' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 3 ? '1px solid var(--border-0)' : 'none' }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.lbl}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: r.color || 'var(--text-1)' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: tabs */}
        <div>
          <div className="tab-row" style={{ marginBottom: 20 }}>
            {TABS.map(t => (
              <button key={t.k} className={`tab-btn ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>{t.l}</button>
            ))}
          </div>

          {tab === 'profile' && (
            <div className="card">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className={`form-input ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
                  {errors.name && <div className="form-error">⚠ {errors.name}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="+1 555-0100" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <input className="form-input" value={form.occupation} onChange={e => setForm(p => ({...p, occupation: e.target.value}))} placeholder="e.g. Software Engineer" />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} placeholder="City, State" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email (cannot change)</label>
                <input className="form-input" value={user?.email || ''} disabled />
              </div>
              <div className="divider" />
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><div className="spinner" style={{ borderTopColor: 'var(--bg-0)', borderColor: 'rgba(0,0,0,0.2)' }} /> Saving...</> : '✓ Save Changes'}
              </button>
            </div>
          )}

          {tab === 'security' && (
            <div className="card">
              <div className="card-label" style={{ marginBottom: 16 }}>Change Password</div>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className={`form-input ${errors.currentPassword ? 'error' : ''}`} type="password" value={form.currentPassword} onChange={e => setForm(p => ({...p, currentPassword: e.target.value}))} placeholder="••••••••" />
                {errors.currentPassword && <div className="form-error">⚠ {errors.currentPassword}</div>}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className={`form-input ${errors.newPassword ? 'error' : ''}`} type="password" value={form.newPassword} onChange={e => setForm(p => ({...p, newPassword: e.target.value}))} placeholder="Min 6 chars" />
                  {errors.newPassword && <div className="form-error">⚠ {errors.newPassword}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New</label>
                  <input className={`form-input ${errors.confirmPassword ? 'error' : ''}`} type="password" value={form.confirmPassword} onChange={e => setForm(p => ({...p, confirmPassword: e.target.value}))} placeholder="Repeat" />
                  {errors.confirmPassword && <div className="form-error">⚠ {errors.confirmPassword}</div>}
                </div>
              </div>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><div className="spinner" style={{ borderTopColor: 'var(--bg-0)', borderColor: 'rgba(0,0,0,0.2)' }} /> Updating...</> : '🔐 Update Password'}
              </button>

              <div className="divider" />
              <div className="card-label" style={{ marginBottom: 12 }}>Security Status</div>
              {[
                { icon: '✅', label: 'Account Verified', sub: 'Your email is verified', ok: true },
                { icon: '🔒', label: 'Password Protected', sub: 'Using bcrypt encryption', ok: true },
                { icon: '🛡️', label: 'JWT Sessions', sub: '7-day secure tokens', ok: true },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border-0)' : 'none' }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.sub}</div>
                  </div>
                  <span className="badge badge-green">Active</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'activity' && (
            <div className="card">
              <div className="card-label" style={{ marginBottom: 16 }}>Recent Login Activity</div>
              {activity.length > 0 ? activity.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--border-0)' : 'none' }}>
                  <div style={{ width: 36, height: 36, background: 'var(--teal-dim)', border: '1px solid var(--border-1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🔐</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)', textTransform: 'capitalize' }}>{a.action}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontFamily: 'var(--mono)' }}>{a.ip_address || 'Unknown IP'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.device?.slice(0, 60) || 'Unknown device'}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', flexShrink: 0 }}>{fmtDate(a.created_at)}</div>
                </div>
              )) : (
                <div className="empty" style={{ padding: 32 }}>
                  <div className="empty-icon">📋</div>
                  <div className="empty-sub">No activity recorded yet</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
