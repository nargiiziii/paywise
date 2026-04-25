import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { $, pct } from '../../utils/format';

const EMOJIS = ['🎯','💻','🌍','🏠','🚗','🎓','⛵','💍','📈','🛡️','🏖️','🎸','🐶','✈️','📱'];

const Savings = () => {
  const { user, updateBalance } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', target_amount: '', emoji: '🎯', deadline: '' });
  const [contribId, setContribId] = useState(null);
  const [contribAmt, setContribAmt] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/savings'); setGoals(r.data); }
    catch { toast.error('Failed to load goals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createGoal = async () => {
    if (!form.name || !form.target_amount) { toast.error('Name and target required'); return; }
    setSaving(true);
    try {
      await api.post('/savings', { ...form, target_amount: parseFloat(form.target_amount) });
      toast.success('Goal created!');
      setShowNew(false);
      setForm({ name: '', target_amount: '', emoji: '🎯', deadline: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const contribute = async (id) => {
    const amt = parseFloat(contribAmt);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      const r = await api.post(`/savings/${id}/contribute`, { amount: amt });
      updateBalance(r.data.balance, r.data.savings_balance);
      toast.success('Contribution added!');
      setContribId(null); setContribAmt('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm('Remove this goal?')) return;
    await api.delete(`/savings/${id}`);
    toast.success('Goal removed');
    load();
  };

  const totalSavings = user?.account?.savings_balance || 0;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Savings Goals</h1>
            <p className="page-sub">Track your financial targets and grow your wealth</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(p => !p)}>
            {showNew ? '✕ Cancel' : '+ New Goal'}
          </button>
        </div>
      </div>

      {/* Savings balance */}
      <div className="card savings-hero" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ fontSize: 48 }}>🪙</div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Savings Vault</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 900, color: 'var(--amber)' }}>{$(totalSavings)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>Earning 2.4% APY</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>Main Balance</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--teal)' }}>{$(user?.account?.balance || 0)}</div>
        </div>
      </div>

      {/* New goal form */}
      {showNew && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid var(--border-2)', animation: 'fadeUp 0.2s ease' }}>
          <div className="card-label" style={{ marginBottom: 16 }}>Create New Goal</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Goal Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Europe Trip" />
            </div>
            <div className="form-group">
              <label className="form-label">Target Amount ($)</label>
              <div className="input-wrap">
                <span className="input-prefix">$</span>
                <input className="form-input" type="number" min="1" value={form.target_amount} onChange={e => setForm(p => ({...p, target_amount: e.target.value}))} placeholder="5,000" />
              </div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Deadline (optional)</label>
              <input className="form-input" type="date" value={form.deadline} onChange={e => setForm(p => ({...p, deadline: e.target.value}))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Emoji</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: 'var(--bg-0)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', padding: 10 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm(p => ({...p, emoji: e}))}
                    style={{ fontSize: 20, background: form.emoji === e ? 'var(--teal-dim)' : 'none', border: '1px solid', borderColor: form.emoji === e ? 'var(--border-2)' : 'transparent', borderRadius: 6, padding: '2px 4px', cursor: 'pointer' }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="btn btn-amber" style={{ marginTop: 16 }} onClick={createGoal} disabled={saving}>
            {saving ? <><div className="spinner" style={{borderTopColor:'var(--bg-0)',borderColor:'rgba(0,0,0,0.2)'}} /> Creating...</> : '🎯 Create Goal'}
          </button>
        </div>
      )}

      {/* Goals grid */}
      {loading ? (
        <div className="grid-3">{Array(3).fill(0).map((_,i) => <div key={i} className="skeleton" style={{height:180}} />)}</div>
      ) : goals.length > 0 ? (
        <div className="grid-3">
          {goals.map(goal => {
            const p = pct(goal.current_amount, goal.target_amount);
            const complete = p >= 100;
            return (
              <div key={goal.id} className="goal-card">
                <div className="goal-header">
                  <span className="goal-emoji">{goal.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div className="goal-name">{goal.name}</div>
                    {goal.deadline && <div className="goal-deadline">📅 {new Date(goal.deadline).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}</div>}
                  </div>
                  {complete && <span className="badge badge-amber">✓ Done!</span>}
                </div>

                <div className="goal-nums" style={{ marginBottom: 6 }}>
                  <span className="goal-current">{$(goal.current_amount)}</span>
                  <span className="goal-pct">{p}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${complete ? 'complete' : ''}`} style={{ width: `${p}%` }} />
                </div>
                <div className="goal-target">{$(goal.target_amount)} target</div>

                {!complete && (
                  contribId === goal.id ? (
                    <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                      <div className="input-wrap" style={{ flex: 1 }}>
                        <span className="input-prefix">$</span>
                        <input className="form-input" type="number" min="1" value={contribAmt}
                          onChange={e => setContribAmt(e.target.value)}
                          placeholder="Amount" style={{ padding: '8px 8px 8px 28px', fontSize: 13 }} />
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => contribute(goal.id)} disabled={saving}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setContribId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setContribId(goal.id); setContribAmt(''); }}>
                        + Add Funds
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteGoal(goal.id)}>🗑</button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">🪙</div>
          <div className="empty-title">No savings goals yet</div>
          <div className="empty-sub">Create your first goal to start saving!</div>
        </div>
      )}
    </div>
  );
};

export default Savings;
