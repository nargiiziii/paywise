import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import TxItem from '../common/TxItem';
import api from '../../utils/api';
import { $, fmtIBAN } from '../../utils/format';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',         symbol: '$',  flag: '🇺🇸',
    color: '#3b82f6', glow: 'rgba(59,130,246,0.1)',
    bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼', flag: '🇦🇿',
    color: '#10b981', glow: 'rgba(16,185,129,0.1)',
    bg: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' },
  { code: 'BTC', name: 'Bitcoin',            symbol: '₿', flag: '₿',
    color: '#f59e0b', glow: 'rgba(245,158,11,0.1)',
    bg: 'linear-gradient(135deg, #451a03 0%, #2a0e00 100%)' },
];

function fmtBal(val, code) {
  if (code === 'BTC') return Number(val || 0).toFixed(8);
  return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

// Horizontal balance card carousel
const BalanceSlider = ({ balances, rates }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const [copied, setCopied] = useState(false);

  const iban = user?.account?.iban || 'AZ00PAYW0000000000000000';

  // Calculate total AZN value
  const totalAZN = CURRENCIES.reduce((sum, c) => {
    const bal = balances?.[c.code] || 0;
    const rate = rates?.[c.code]?.['AZN'] || (c.code === 'AZN' ? 1 : 0);
    return sum + bal * rate;
  }, 0);

  const onPointerDown = (e) => { setDragging(false); startX.current = e.clientX; };
  const onPointerUp = (e) => {
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 40) setActive(prev => dx < 0 ? Math.min(CURRENCIES.length - 1, prev + 1) : Math.max(0, prev - 1));
  };

  const copyIBAN = () => {
    navigator.clipboard.writeText(iban);
    setCopied(true);
    toast.success('IBAN copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const cur = CURRENCIES[active];
  const bal = balances?.[cur.code] || 0;

  const cardBg = theme === 'light' 
    ? `linear-gradient(135deg, ${cur.color} 0%, ${cur.color}cc 100%)` 
    : cur.bg;

  return (
    <div className="balance-slider-wrap">
      {/* Total AZN */}
      {rates && (
        <div className="total-azn-strip">
          <span className="total-azn-label">Total Portfolio</span>
          <span className="total-azn-val">₼ {totalAZN.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      )}

      {/* Card */}
      <div
        className="bal-card"
        style={{ 
          background: cardBg, 
          boxShadow: theme === 'light' ? '0 15px 35px rgba(0,0,0,0.15)' : '0 15px 40px rgba(0,0,0,0.4)',
          border: theme === 'light' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)'
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >

        <div className="bal-card-top">
          <div className="bal-card-flag">{cur.flag}</div>
          <div className="bal-card-name">{cur.name}</div>
        </div>

        <div className="bal-card-amount">
          <span className="bal-card-sym" style={{ color: cur.color }}>{cur.symbol}</span>
          <span className="bal-card-num">{fmtBal(bal, cur.code)}</span>
        </div>

        <div className="bal-card-footer">
          <div className="bal-card-iban" onClick={copyIBAN}>
            <span className="bal-card-iban-label">IBAN</span>
            <span className="bal-card-iban-num">{fmtIBAN(iban)}</span>
            <span className="bal-card-iban-copy">{copied ? '✓' : '⎘'}</span>
          </div>
          <div className="bal-card-savings">
            <span className="bal-card-iban-label">Savings</span>
            <span className="bal-card-iban-num">{$(user?.account?.savings_balance || 0)}</span>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="slider-dots">
        {CURRENCIES.map((c, i) => (
          <button
            key={c.code}
            className={`slider-dot ${i === active ? 'active' : ''}`}
            onClick={() => setActive(i)}
            style={{ background: i === active ? c.color : undefined }}
          />
        ))}
      </div>

      {/* Mini wallet pills */}
      <div className="mini-wallets">
        {CURRENCIES.map((c, i) => (
          <button
            key={c.code}
            className={`mini-wallet ${i === active ? 'active' : ''}`}
            onClick={() => setActive(i)}
            style={{ borderColor: i === active ? c.color : undefined, color: i === active ? c.color : undefined }}
          >
            {c.flag} {c.code}
            <span className="mini-wallet-bal"> {fmtBal(balances?.[c.code] || 0, c.code)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/transactions/recent'),
      api.get('/transactions/stats'),
      api.get('/transactions/forecast'),
      api.get('/exchange/rates'),
    ])
      .then(([tx, st, fc, rt]) => {
        setRecent(tx.data);
        setStats(st.data);
        setForecast(fc.data);
        setRates(rt.data.rates);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const balances = user?.account?.balances || { USD: user?.account?.balance || 0, AZN: 0, BTC: 0 };

  const quickActions = [
    { icon: '↗', label: 'Send Money',  to: '/transfer',      color: 'var(--teal-dim)',  iconColor: 'var(--teal)'  },
    { icon: '💱', label: 'Exchange',   to: '/exchange',      color: 'var(--amber-dim)', iconColor: 'var(--amber)' },
    { icon: '🪙', label: 'Savings',    to: '/savings',       color: 'var(--blue-dim)',  iconColor: 'var(--blue)'  },
    { icon: '🔐', label: 'V-Cards',    to: '/virtual-cards', color: 'var(--green-dim)', iconColor: 'var(--green)' },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Hey, {user?.name?.split(' ')[0]} {user?.avatar} 👋</h1>
        <p className="page-sub">Here's your financial overview for today</p>
      </div>

      {/* Balance Slider + Stats */}
      <div className="grid-2" style={{ marginBottom: 20, alignItems: 'start' }}>
        <BalanceSlider balances={balances} rates={rates} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="stat-card stagger-1">
            <div className="stat-icon green">↙</div>
            <div className="stat-val" style={{ color: 'var(--green)' }}>{$(stats?.totals?.total_received || 0)}</div>
            <div className="stat-lbl">Total Received</div>
            <div className="stat-delta up">↑ {stats?.totals?.received_count || 0} transactions</div>
          </div>

          {/* Smart Forecast */}
          <div className="forecast-card stagger-2">
            <div className="forecast-header">
              <span className="forecast-title">Smart Forecast</span>
            </div>
            <div className="forecast-body">
              <div className="forecast-row">
                <span className="lbl">Avg. Daily Spending</span>
                <span className="val">{$(forecast?.avgDailySpend || 0)}</span>
              </div>
              <div className="forecast-main">
                <div className="lbl">Estimated Balance ({forecast?.monthName} {forecast?.lastDay})</div>
                <div className="val">{$(forecast?.predictedBalance || 0)}</div>
              </div>
              <div className="forecast-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, (forecast?.predictedBalance / (forecast?.currentBalance || 1)) * 100)}%` }}
                  />
                </div>
                <div className="progress-labels">
                  <span>Current</span>
                  <span>Predicted</span>
                </div>
              </div>
            </div>
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

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="sec-head"><span className="sec-title">Activity (6 months)</span></div>
          {stats?.monthly?.length > 0 ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grRecv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00e5a0" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f5a623" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-2)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-2)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="received" name="Received" stroke="#00e5a0" strokeWidth={2} fill="url(#grRecv)" />
                  <Area type="monotone" dataKey="sent"     name="Sent"     stroke="#f5a623" strokeWidth={2} fill="url(#grSent)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="empty"><div className="empty-icon">📊</div><div>No data yet</div></div>}
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
          ) : <div className="empty"><div className="empty-icon">🗂</div><div>No categories yet</div></div>}
        </div>
      </div>

      {/* Recent */}
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
          <div className="tx-list">{recent.map(tx => <TxItem key={tx.id} tx={tx} />)}</div>
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
