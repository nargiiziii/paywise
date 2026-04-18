import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { $, fmtIBAN } from '../../utils/format';

const CATEGORIES = ['transfer','food','housing','travel','health','entertainment','technology','work','finance','shopping','education','gifts','charity','personal'];

const Transfer = () => {
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ iban: '', amount: '', note: '', category: 'transfer', save: false });
  const [errors, setErrors] = useState({});
  const [receiver, setReceiver] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const debounce = useRef(null);

  const balance = user?.account?.balance || 0;

  useEffect(() => {
    api.get('/beneficiaries').then(r => setBeneficiaries(r.data)).catch(() => {});
  }, []);

  // IBAN verification debounce
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    setReceiver(null);
    if (form.iban.trim().length < 8) return;
    debounce.current = setTimeout(async () => {
      setVerifying(true);
      try {
        const r = await api.get(`/accounts/verify/${form.iban.trim().toUpperCase()}`);
        setReceiver(r.data);
        setErrors(p => ({ ...p, iban: null }));
      } catch (err) {
        if (err.response?.status === 404) setErrors(p => ({ ...p, iban: 'Account not found' }));
        else if (err.response?.status === 400) setErrors(p => ({ ...p, iban: err.response.data.error }));
      } finally { setVerifying(false); }
    }, 500);
  }, [form.iban]);

  const validate = () => {
    const e = {};
    if (!form.iban.trim()) e.iban = 'IBAN is required';
    else if (!receiver) e.iban = 'Account not verified';
    if (!form.amount) e.amount = 'Amount required';
    else {
      const a = parseFloat(form.amount);
      if (isNaN(a) || a <= 0) e.amount = 'Invalid amount';
      else if (a > balance) e.amount = `Insufficient balance (${$(balance)})`;
      else if (a > 50000) e.amount = 'Max transfer: $50,000';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const r = await api.post('/transactions/transfer', {
        receiverIban: form.iban.trim().toUpperCase(),
        amount: parseFloat(form.amount),
        note: form.note,
        category: form.category,
        saveAsBeneficiary: form.save,
      });
      updateBalance(r.data.newBalance);
      toast.success(`${$(parseFloat(form.amount))} sent to ${receiver?.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed');
      setStep(1);
    } finally { setSubmitting(false); }
  };

  const QUICK = [50, 100, 200, 500];

  if (step === 2) return (
    <div className="page-wrap" style={{ maxWidth: 520 }}>
      <div className="page-header">
        <h1 className="page-title">Confirm Transfer</h1>
        <p className="page-sub">Review your transaction before confirming</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>{receiver?.avatar || '👤'}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-0)' }}>{receiver?.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{fmtIBAN(form.iban.toUpperCase())}</div>
        </div>

        <div style={{ background: 'var(--bg-0)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
          {[
            { lbl: 'Amount', val: $(parseFloat(form.amount)), big: true, color: 'var(--text-0)' },
            { lbl: 'Fee', val: parseFloat(form.amount) >= 500 ? '$0.50' : '$0.00', color: 'var(--text-1)' },
            { lbl: 'Category', val: form.category, color: 'var(--text-1)' },
            form.note && { lbl: 'Note', val: form.note, color: 'var(--text-1)' },
            { lbl: 'Balance after', val: $(balance - parseFloat(form.amount)), color: 'var(--teal)' },
          ].filter(Boolean).map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < 4 ? 12 : 0, paddingTop: i === 4 ? 12 : 0, borderTop: i === 4 ? '1px solid var(--border-0)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{r.lbl}</span>
              <span style={{ fontSize: r.big ? 24 : 14, fontWeight: r.big ? 900 : 600, color: r.color, fontFamily: r.big ? 'var(--font)' : 'var(--mono)' }}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitting}>
          {submitting ? <><div className="spinner" style={{ borderTopColor: 'var(--bg-0)', borderColor: 'rgba(0,0,0,0.2)' }} /> Sending...</> : '✓ Confirm & Send'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-wrap" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">Send Money</h1>
        <p className="page-sub">Transfer funds to any PayWise account instantly</p>
      </div>

      {/* Balance pill */}
      <div className="card card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Your Balance</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 800, color: 'var(--teal)' }}>{$(balance)}</div>
        </div>
        {user?.account?.card_frozen && (
          <span className="badge badge-red">🔒 Card Frozen</span>
        )}
      </div>

      {/* Saved beneficiaries */}
      {beneficiaries.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="card-label" style={{ marginBottom: 10 }}>Saved Contacts</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {beneficiaries.map(b => (
              <button key={b.id} className="bene-card" style={{ border: 'none', cursor: 'pointer', width: 'auto' }}
                onClick={() => setForm(p => ({ ...p, iban: b.iban }))}>
                <div className="bene-ava">{b.avatar || '👤'}</div>
                <div>
                  <div className="bene-name">{b.name}</div>
                  <div className="bene-iban">{b.iban.slice(0,8)}...</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        {/* IBAN */}
        <div className="form-group">
          <label className="form-label">Recipient IBAN</label>
          <div className="input-wrap">
            <input
              className={`form-input ${errors.iban ? 'error' : ''}`}
              value={form.iban}
              onChange={e => setForm(p => ({ ...p, iban: e.target.value }))}
              placeholder="US00 0000 0000 0000 0000"
              style={{ fontFamily: 'var(--mono)', letterSpacing: 1.5, paddingRight: verifying ? 44 : 16 }}
              autoComplete="off"
            />
            {verifying && <div className="input-suffix"><div className="spinner" style={{ width: 16, height: 16 }} /></div>}
          </div>
          {errors.iban && <div className="form-error">⚠ {errors.iban}</div>}
          {receiver && (
            <div className="recv-preview">
              <span style={{ fontSize: 28 }}>{receiver.avatar}</span>
              <div>
                <div className="recv-name">{receiver.name}</div>
                <div className="recv-iban">{receiver.iban}</div>
              </div>
              <span className="badge badge-green" style={{ marginLeft: 'auto' }}>✓ Verified</span>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="form-group">
          <label className="form-label">Amount (USD)</label>
          <div className="input-wrap">
            <span className="input-prefix">$</span>
            <input
              className={`form-input ${errors.amount ? 'error' : ''}`}
              type="number" step="0.01" min="0.01"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          {errors.amount && <div className="form-error">⚠ {errors.amount}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {QUICK.map(a => (
              <button key={a} className={`filter-chip ${parseFloat(form.amount) === a ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, amount: String(a) }))}>
                ${a}
              </button>
            ))}
            <button className="filter-chip"
              onClick={() => setForm(p => ({ ...p, amount: String(Math.floor(balance * 0.5)) }))}>
              Half
            </button>
            <button className="filter-chip"
              onClick={() => setForm(p => ({ ...p, amount: String(Math.floor(balance)) }))}>
              Max
            </button>
          </div>
        </div>

        <div className="grid-2">
          {/* Note */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Note (optional)</label>
            <input className="form-input" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="What's this for?" maxLength={100} />
          </div>

          {/* Category */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Category</label>
            <select className="form-input form-select" value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Save beneficiary */}
        {receiver && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <label className="toggle">
              <input type="checkbox" checked={form.save} onChange={e => setForm(p => ({ ...p, save: e.target.checked }))} />
              <span className="toggle-slider" />
            </label>
            <span style={{ fontSize: 13, color: 'var(--text-1)' }}>Save {receiver.name} as a contact</span>
          </div>
        )}

        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: 20 }}
          onClick={() => { if (validate()) setStep(2); }}
          disabled={!receiver || !form.amount}
        >
          Continue →
        </button>
      </div>
    </div>
  );
};

export default Transfer;
