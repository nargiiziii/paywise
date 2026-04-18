import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import TxItem from '../common/TxItem';
import api from '../../utils/api';
import { $, fmtIBAN } from '../../utils/format';

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-2)', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {$(p.value)}</p>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/transactions/recent'), api.get('/transactions/stats')])
      .then(([tx, st]) => { setRecent(tx.data); setStats(st.data); })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const copyIBAN = () => {
    navigator.clipboard.writeText(user?.account?.iban || '');
    setCopied(true);
    toast.success('IBAN copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const balance = user?.account?.balance || 0;
  const savings = user?.account?.savings_balance || 0;
  const iban = user?.account?.iban || '';

  const quickActions = [
    { icon: '↗', label: 'Send Money', to: '/transfer', color: 'var(--teal-dim)', iconColor: 'var(--teal)' },
    { icon: '📊', label: 'Analytics', to: '/history', color: 'var(--amber-dim)', iconColor: 'var(--amber)' },
    { icon: '🪙', label: 'Savings', to: '/savings', color: 'var(--blue-dim)', iconColor: 'var(--blue)' },
    { icon: '💳', label: 'My Card', to: '/cards', color: 'var(--green-dim)', iconColor: 'var(--green)' },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Hey, {user?.name?.split(' ')[0]} {user?.avatar} 👋</h1>
        <p className="page-sub">Here's your financial overview for today</p>
      </div>

      {/* Top row: Balance + Stats */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Balance Hero */}
        <div className="balance-hero">
          <div className="balance-tag">Available Balance</div>
          <div className="balance-num">
            <span className="currency-sym">$</span>
            {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="balance-savings-strip">
            <span style={{ fontSize: 16 }}>🪙</span>
            <span className="lbl">Savings vault</span>
            <span className="val">{$(savings)}</span>
          </div>
          <div className="iban-row" onClick={copyIBAN} title="Click to copy IBAN">
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>IBAN</span>
            <span className="iban-text">{fmtIBAN(iban)}</span>
            <button className="iban-copy">{copied ? '✓ Copied' : 'Copy'}</button>
          </div>
        </div>

        {/* Stats column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="stat-card stagger-1">
            <div className="stat-icon green">↙</div>
            <div className="stat-val" style={{ color: 'var(--green)' }}>{$(stats?.totals?.total_received || 0)}</div>
            <div className="stat-lbl">Total Received</div>
            <div className="stat-delta up">↑ {stats?.totals?.received_count || 0} transactions</div>
          </div>
          <div className="stat-card stagger-2">
            <div className="stat-icon red">↗</div>
            <div className="stat-val" style={{ color: 'var(--red)' }}>{$(stats?.totals?.total_sent || 0)}</div>
            <div className="stat-lbl">Total Sent</div>
            <div className="stat-delta down">↓ {stats?.totals?.sent_count || 0} transactions</div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 20 }}>
        <div className="quick-grid">
          {quickActions.map((q, i) => (
            <Link key={i} to={q.to} className="quick-btn">
              <div className="quick-btn-icon" style={{ background: q.color }}>
                <span style={{ fontSize: 22, color: q.iconColor }}>{q.icon}</span>
              </div>
              <span className="quick-btn-label">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Chart + Categories */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="sec-head">
            <span className="sec-title">Activity (6 months)</span>
          </div>
          {stats?.monthly?.length > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grRecv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5a0" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f5a623" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-2)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-2)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="received" name="Received" stroke="#00e5a0" strokeWidth={2} fill="url(#grRecv)" />
                  <Area type="monotone" dataKey="sent" name="Sent" stroke="#f5a623" strokeWidth={2} fill="url(#grSent)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty"><div className="empty-icon">📊</div><div>No data yet</div></div>
          )}
        </div>

        <div className="card">
          <div className="sec-head"><span className="sec-title">Spending by Category</span></div>
          {stats?.categories?.length > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categories.slice(0,5)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: 'var(--text-2)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="category" tick={{ fill: 'var(--text-1)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="total" name="Spent" fill="var(--teal)" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty"><div className="empty-icon">🗂</div><div>No categories yet</div></div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="sec-head">
          <span className="sec-title">Recent Transactions</span>
          <Link to="/history" className="sec-link">View all →</Link>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 68 }} />)}
          </div>
        ) : recent.length > 0 ? (
          <div className="tx-list">
            {recent.map(tx => <TxItem key={tx.id} tx={tx} />)}
          </div>
        ) : (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <div className="empty-title">No transactions yet</div>
            <div className="empty-sub">Make your first transfer to get started</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
