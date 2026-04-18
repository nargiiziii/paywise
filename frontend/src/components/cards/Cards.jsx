import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { $, maskCard } from '../../utils/format';

const Cards = () => {
  const { user, updateCardFreeze, updateBalance } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [savingsForm, setSavingsForm] = useState({ amount: '', direction: 'to_savings', show: false });
  const [moving, setMoving] = useState(false);

  const acct = user?.account;
  const frozen = acct?.card_frozen;

  const toggleFreeze = async () => {
    setFreezing(true);
    try {
      const r = await api.post('/accounts/freeze-card');
      updateCardFreeze(r.data.card_frozen);
      toast.success(r.data.message);
    } catch { toast.error('Failed'); }
    finally { setFreezing(false); }
  };

  const moveSavings = async () => {
    const amt = parseFloat(savingsForm.amount);
    if (!amt || amt <= 0) { toast.error('Invalid amount'); return; }
    setMoving(true);
    try {
      const r = await api.post('/accounts/savings-transfer', { amount: amt, direction: savingsForm.direction });
      updateBalance(r.data.balance, r.data.savings_balance);
      toast.success(r.data.message);
      setSavingsForm(p => ({ ...p, show: false, amount: '' }));
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setMoving(false); }
  };

  return (
    <div className="page-wrap" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1 className="page-title">My Card</h1>
        <p className="page-sub">Manage your virtual debit card and savings vault</p>
      </div>

      {/* Virtual Card */}
      <div style={{ maxWidth: 380, marginBottom: 24 }}>
        <div className="virtual-card">
          {frozen && (
            <div className="card-frozen-overlay">
              <div style={{ fontSize: 32 }}>🔒</div>
              <div className="lbl">Frozen</div>
              <div style={{ fontSize: 12, color: 'var(--text-1)' }}>Card is temporarily disabled</div>
            </div>
          )}
          <div className="card-chip" />
          <div className="card-num">
            {showDetails ? acct?.card_number || '•••• •••• •••• ••••' : maskCard(acct?.card_number)}
          </div>
          <div className="card-row">
            <div>
              <div className="card-holder">{user?.name || 'CARD HOLDER'}</div>
              <div style={{ marginTop: 4 }}>
                <div className="card-expiry-lbl">Expires</div>
                <div className="card-expiry-val">{showDetails ? acct?.card_expiry : '••/••'}</div>
              </div>
            </div>
            <div className="card-network">VISA</div>
          </div>
        </div>

        {/* Card actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowDetails(p => !p)}>
            {showDetails ? '🙈 Hide' : '👁 Show'} Details
          </button>
          <button className={`btn btn-sm ${frozen ? 'btn-primary' : 'btn-danger'}`} style={{ flex: 1 }}
            onClick={toggleFreeze} disabled={freezing}>
            {freezing ? <div className="spinner" style={{ width: 14, height: 14 }} /> : null}
            {frozen ? '🔓 Unfreeze' : '🔒 Freeze'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon teal">💳</div>
          <div className="stat-val">{$(acct?.balance || 0)}</div>
          <div className="stat-lbl">Main Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">🪙</div>
          <div className="stat-val">{$(acct?.savings_balance || 0)}</div>
          <div className="stat-lbl">Savings Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">📊</div>
          <div className="stat-val">{$(acct?.monthly_spent || 0)}</div>
          <div className="stat-lbl">Spent this month</div>
          <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, marginTop: 8 }}>
            <div style={{ height: '100%', width: `${Math.min(100, ((acct?.monthly_spent || 0) / (acct?.spending_limit || 1)) * 100)}%`, background: 'var(--red)', borderRadius: 2, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 3 }}>Limit: {$(acct?.spending_limit || 0)}</div>
        </div>
      </div>

      {/* Move money between accounts */}
      <div className="card">
        <div className="sec-head">
          <span className="sec-title">Move Money</span>
          <button className="sec-link" onClick={() => setSavingsForm(p => ({ ...p, show: !p.show }))}>
            {savingsForm.show ? 'Cancel' : '↔ Transfer between accounts'}
          </button>
        </div>

        {savingsForm.show ? (
          <div style={{ animation: 'fadeUp 0.2s ease' }}>
            <div className="tab-row" style={{ marginBottom: 16 }}>
              <button className={`tab-btn ${savingsForm.direction === 'to_savings' ? 'active' : ''}`}
                onClick={() => setSavingsForm(p => ({ ...p, direction: 'to_savings' }))}>
                Main → Savings
              </button>
              <button className={`tab-btn ${savingsForm.direction === 'from_savings' ? 'active' : ''}`}
                onClick={() => setSavingsForm(p => ({ ...p, direction: 'from_savings' }))}>
                Savings → Main
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="input-wrap" style={{ flex: 1 }}>
                <span className="input-prefix">$</span>
                <input className="form-input" type="number" min="0.01" value={savingsForm.amount}
                  onChange={e => setSavingsForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00" />
              </div>
              <button className="btn btn-amber" onClick={moveSavings} disabled={moving}>
                {moving ? <div className="spinner" style={{ borderTopColor: 'var(--bg-0)', borderColor: 'rgba(0,0,0,0.2)' }} /> : '↔ Move'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8 }}>
              Available: {savingsForm.direction === 'to_savings' ? $(acct?.balance || 0) : $(acct?.savings_balance || 0)}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Move funds between your main account and savings vault instantly with no fees.
          </div>
        )}
      </div>

      {/* Account details */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-label">Account Information</div>
        {[
          { lbl: 'Account Number', val: acct?.account_number || '—', mono: true },
          { lbl: 'IBAN', val: acct?.iban || '—', mono: true },
          { lbl: 'Currency', val: acct?.currency || 'USD' },
          { lbl: 'Account Type', val: acct?.account_type || 'Checking' },
          { lbl: 'Status', val: frozen ? '🔒 Frozen' : '✓ Active', color: frozen ? 'var(--red)' : 'var(--green)' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: i < 4 ? '1px solid var(--border-0)' : 'none' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{r.lbl}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: r.color || 'var(--text-1)', fontFamily: r.mono ? 'var(--mono)' : 'var(--font)', letterSpacing: r.mono ? 1 : 0 }}>
              {r.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Cards;
