import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',      flag: '🇺🇸', symbol: '$',  color: '#3b82f6', glow: 'rgba(59,130,246,0.1)',  bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
  { code: 'AZN', name: 'Azerbaijani Manat', flag: '🇦🇿', symbol: '₼', color: '#10b981', glow: 'rgba(16,185,129,0.1)',   bg: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' },
  { code: 'BTC', name: 'Bitcoin',         flag: '₿',    symbol: '₿',  color: '#f59e0b', glow: 'rgba(245,158,11,0.1)', bg: 'linear-gradient(135deg, #451a03 0%, #2a0e00 100%)' },
];

const CUR = Object.fromEntries(CURRENCIES.map(c => [c.code, c]));

function fmtBal(val, code) {
  if (code === 'BTC') return Number(val || 0).toFixed(8);
  return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Animated number ticker component
function Ticker({ value, code }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current;
    const end = value;
    const dur = 600;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (end - start) * ease);
      if (p < 1) requestAnimationFrame(step);
      else { setDisplay(end); prev.current = end; }
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span>{fmtBal(display, code)}</span>;
}

const Exchange = () => {
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [rates, setRates] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('AZN');
  const [amount, setAmount] = useState('');
  const [received, setReceived] = useState(0);
  const [converting, setConverting] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(true);
  const inputRef = useRef(null);

  const balances = user?.account?.balances || { USD: 0, AZN: 0, BTC: 0 };

  const loadRates = useCallback(async () => {
    try {
      const r = await api.get('/exchange/rates');
      setRates(r.data.rates);
      setLastUpdated(r.data.lastUpdated);
    } catch {
      toast.error('Could not load rates');
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  // Recalculate received whenever amount/from/to/rates change
  useEffect(() => {
    if (!rates || !amount || isNaN(parseFloat(amount))) { setReceived(0); return; }
    const rate = rates[from]?.[to] || 0;
    setReceived(parseFloat(amount) * rate);
  }, [amount, from, to, rates]);

  const handleSwap = () => { setFrom(to); setTo(from); setAmount(''); setReceived(0); };

  const handleConvert = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (amt > (balances[from] || 0)) return toast.error(`Insufficient ${from} balance`);
    setConverting(true);
    try {
      await api.post('/exchange/convert', { from, to, amount: amt });
      await refreshUser();
      toast.success(`✅ Converted ${amt} ${from} → ${to}`);
      setAmount('');
      setReceived(0);
      loadRates(); // refresh rates too
    } catch (err) {
      toast.error(err.response?.data?.error || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const rate = rates?.[from]?.[to] || 0;
  const fromMeta = CUR[from];
  const toMeta = CUR[to];

  return (
    <div className="exchange-full-page">
      <div className="ex-container">
        {/* Header */}
        <div className="ex-header">
          <div>
            <h1 className="ex-title">Currency Exchange</h1>
            <p className="ex-sub">
              {ratesLoading ? 'Fetching live rates…' :
                lastUpdated ? `Rates updated ${new Date(lastUpdated).toLocaleTimeString()}` :
                'Live rates unavailable — using cached'}
            </p>
          </div>
          <div className="ex-rate-pill" style={{ borderColor: fromMeta.color + '44' }}>
            <span className="ex-rate-pill-label">1 {from}</span>
            <span className="ex-rate-pill-eq" style={{ color: toMeta.color }}>
              = {rate ? (to === 'BTC' ? rate.toFixed(8) : rate.toFixed(4)) : '—'} {to}
            </span>
          </div>
        </div>

        <div className="ex-grid">
          {/* LEFT: converter */}
          <div className="ex-left">
            {/* FROM */}
            <div className="ex-block">
              <div className="ex-block-label">
                <span>You Send</span>
                <span className="ex-balance-hint">
                  Balance: <b>{fmtBal(balances[from], from)} {from}</b>
                </span>
              </div>
              <div className="ex-input-wrap">
                <select
                  className="ex-cur-sel"
                  value={from}
                  onChange={e => { setFrom(e.target.value); setAmount(''); }}
                  style={{ color: fromMeta.color }}
                >
                  {CURRENCIES.filter(c => c.code !== to).map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  ref={inputRef}
                  className="ex-amount-input"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min="0"
                  step={from === 'BTC' ? '0.00000001' : '0.01'}
                />
                <button
                  className="ex-max-btn"
                  onClick={() => setAmount(fmtBal(balances[from], from).replace(/,/g, ''))}
                  style={{ color: fromMeta.color }}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* SWAP */}
            <div className="ex-swap-row">
              <div className="ex-swap-line" />
              <button className="ex-swap-btn" onClick={handleSwap} title="Swap currencies">
                ⇅
              </button>
              <div className="ex-swap-line" />
            </div>

            {/* TO */}
            <div className="ex-block">
              <div className="ex-block-label">
                <span>You Receive</span>
                <span className="ex-balance-hint">
                  Balance: <b>{fmtBal(balances[to], to)} {to}</b>
                </span>
              </div>
              <div className="ex-output-wrap">
                <select
                  className="ex-cur-sel"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  style={{ color: toMeta.color }}
                >
                  {CURRENCIES.filter(c => c.code !== from).map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <div className="ex-output-val" style={{ color: toMeta.color }}>
                  <Ticker value={received} code={to} />
                </div>
              </div>
            </div>

            {/* Rate detail row */}
            {rate > 0 && amount && (
              <div className="ex-rate-detail">
                <span>Rate</span>
                <span>1 {from} = {to === 'BTC' ? rate.toFixed(8) : rate.toFixed(6)} {to}</span>
              </div>
            )}

            {/* CTA */}
            <button
              className="ex-confirm-btn"
              onClick={handleConvert}
              disabled={!amount || converting || !rate}
              style={{ background: `linear-gradient(135deg, ${fromMeta.color}, ${toMeta.color})` }}
            >
              {converting
                ? <><span className="spinner-sm" />Processing…</>
                : `Exchange ${from} → ${to}`}
            </button>
          </div>

          {/* RIGHT: wallets + rates board */}
          <div className="ex-right">
            {/* My Wallets */}
            <div className="ex-panel">
              <div className="ex-panel-title">My Wallets</div>
              {CURRENCIES.map(cur => (
                <div key={cur.code} className={`ex-wallet-row ${from === cur.code ? 'active' : ''}`}
                  onClick={() => { if (cur.code !== to) setFrom(cur.code); }}
                  style={{ '--cur-color': cur.color }}>
                  <span className="ex-wallet-flag">{cur.flag}</span>
                  <div className="ex-wallet-info">
                    <span className="ex-wallet-code">{cur.code}</span>
                    <span className="ex-wallet-name">{cur.name}</span>
                  </div>
                  <div className="ex-wallet-bal" style={{ color: cur.color }}>
                    <Ticker value={balances[cur.code] || 0} code={cur.code} />
                    <span className="ex-wallet-sym"> {cur.symbol}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Rates Board */}
            <div className="ex-panel">
              <div className="ex-panel-title">Live Rates</div>
              {ratesLoading ? (
                <div className="ex-rates-loading">
                  <span className="spinner-sm" /> Fetching rates…
                </div>
              ) : (
                <div className="ex-rates-board">
                  {[
                    ['USD', 'AZN'], ['AZN', 'USD'],
                    ['BTC', 'USD'], ['BTC', 'AZN'],
                  ].map(([b, t]) => {
                    const r = rates?.[b]?.[t];
                    const bm = CUR[b]; const tm = CUR[t];
                    return r ? (
                      <div key={`${b}${t}`} className="ex-rate-row"
                        onClick={() => { setFrom(b); setTo(t); }}>
                        <span className="ex-rate-pair">
                          {bm.flag} {b} / {tm.flag} {t}
                        </span>
                        <span className="ex-rate-val" style={{ color: tm.color }}>
                          {t === 'BTC' ? r.toFixed(8) : r.toFixed(4)}
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exchange;
