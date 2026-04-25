import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { $ } from '../../utils/format';

const STATUS_META = {
  active:  { label: 'Active',   color: 'var(--teal)',   icon: '●' },
  used:    { label: 'Used',     color: 'var(--amber)',  icon: '◆' },
  expired: { label: 'Expired',  color: 'var(--red)',    icon: '✕' },
};

// Mask card number — only show last 4 by default
function maskCard(num) {
  const parts = num.split(' ');
  return parts.map((p, i) => i === parts.length - 1 ? p : '••••').join(' ');
}

const CardItem = ({ card, onDestroy, revealed }) => {
  const meta = STATUS_META[card.status] || STATUS_META.active;
  const timeLeft = card.status === 'active'
    ? (() => {
        const diff = new Date(card.expires_at) - Date.now();
        if (diff <= 0) return 'Expiring...';
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return `${h}h ${m}m left`;
      })()
    : null;

  return (
    <div className={`vc-card ${card.status}`}>

      <div className="vc-top">
        <div className="vc-chip">
          <div className="vc-chip-line" /><div className="vc-chip-line" /><div className="vc-chip-line" />
        </div>
        <div className="vc-logo">PW</div>
      </div>

      <div className="vc-number">
        {revealed ? card.card_number : maskCard(card.card_number)}
      </div>

      <div className="vc-bottom">
        <div>
          <div className="vc-field-label">Card Holder</div>
          <div className="vc-field-val">{card.label}</div>
        </div>
        <div>
          <div className="vc-field-label">Expires</div>
          <div className="vc-field-val">{card.expiry_month}/{card.expiry_year.slice(2)}</div>
        </div>
        <div>
          <div className="vc-field-label">CVV</div>
          <div className="vc-field-val">{revealed && card.cvv_plain ? card.cvv_plain : '•••'}</div>
        </div>
        <div className="vc-status-badge" style={{ color: meta.color }}>
          {meta.icon} {meta.label}
        </div>
      </div>

      {timeLeft && (
        <div className="vc-timer">⏱ {timeLeft}</div>
      )}

      {card.status === 'active' && (
        <button
          className="vc-destroy-btn"
          onClick={() => onDestroy(card.id)}
          title="Destroy this card"
        >
          🗑 Destroy
        </button>
      )}
    </div>
  );
};

const VirtualCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [label, setLabel] = useState('');
  const [revealedId, setRevealedId] = useState(null);
  const [newCard, setNewCard] = useState(null); // just-created card with plain CVV
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeForm, setChargeForm] = useState({ cardNumber: '', cvv: '', amount: '' });
  const [charging, setCharging] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/virtual-cards');
      setCards(r.data);
    } catch {
      toast.error('Failed to load virtual cards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60s to update timers
  useEffect(() => {
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await api.post('/virtual-cards', { label: label || 'Virtual Card' });
      setNewCard(r.data);
      setRevealedId(r.data.id);
      setLabel('');
      await load();
      toast.success('Virtual card generated! Save the CVV — it will not be shown again.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDestroy = async (id) => {
    if (!window.confirm('Permanently destroy this card?')) return;
    try {
      await api.delete(`/virtual-cards/${id}`);
      toast.success('Card destroyed');
      if (revealedId === id) setRevealedId(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to destroy');
    }
  };

  const handleCharge = async () => {
    if (!chargeForm.cardNumber || !chargeForm.cvv || !chargeForm.amount) {
      return toast.error('Fill in all fields');
    }
    setCharging(true);
    try {
      const r = await api.post('/virtual-cards/charge', {
        cardNumber: chargeForm.cardNumber.replace(/\s/g, ' '),
        cvv: chargeForm.cvv,
        amount: parseFloat(chargeForm.amount),
      });
      toast.success(r.data.message);
      setShowChargeModal(false);
      setChargeForm({ cardNumber: '', cvv: '', amount: '' });
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Charge failed');
    } finally {
      setCharging(false);
    }
  };

  const activeCards = cards.filter(c => c.status === 'active');
  const historyCards = cards.filter(c => c.status !== 'active');

  // Merge plain CVV into the card list for the new card
  const enrichedCards = cards.map(c =>
    newCard && c.id === newCard.id ? { ...c, cvv_plain: newCard.cvv } : c
  );
  const enrichedActive = enrichedCards.filter(c => c.status === 'active');
  const enrichedHistory = enrichedCards.filter(c => c.status !== 'active');

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Virtual Cards</h1>
            <p className="page-sub">Disposable cards that self-destruct after one use</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowChargeModal(true)}
            style={{ borderRadius: 12 }}
          >
            ⚡ Simulate Charge
          </button>
        </div>
      </div>

      {/* Generator Panel */}
      <div className="vc-generator card">
        <div className="vc-gen-left">
          <div className="vc-gen-icon">🔐</div>
          <div>
            <div className="vc-gen-title">Generate a Disposable Card</div>
            <div className="vc-gen-sub">
              Valid for 24 hours · Luhn-verified · Self-destructs after 1 use
            </div>
          </div>
        </div>
        <div className="vc-gen-right">
          <input
            className="form-input"
            placeholder="Label (e.g. Netflix, Amazon…)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            maxLength={60}
            style={{ minWidth: 200 }}
          />
          <button
            className="btn btn-teal"
            onClick={handleGenerate}
            disabled={generating || activeCards.length >= 5}
          >
            {generating
              ? <><span className="spinner-sm" />Generating…</>
              : '+ New Card'}
          </button>
        </div>
      </div>

      {/* Active cards */}
      <div className="sec-head" style={{ marginTop: 28 }}>
        <span className="sec-title">
          Active Cards
          <span className="vc-count">{activeCards.length}/5</span>
        </span>
        {newCard && (
          <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 700 }}>
            ⚠ Save the CVV — shown only once!
          </span>
        )}
      </div>

      {loading ? (
        <div className="vc-grid">
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 20 }} />)}
        </div>
      ) : enrichedActive.length === 0 ? (
        <div className="empty" style={{ minHeight: 160 }}>
          <div className="empty-icon">💳</div>
          <div className="empty-title">No active virtual cards</div>
          <div className="empty-sub">Generate one above to get started</div>
        </div>
      ) : (
        <div className="vc-grid">
          {enrichedActive.map(card => (
            <div key={card.id}>
              <CardItem
                card={card}
                onDestroy={handleDestroy}
                revealed={revealedId === card.id}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setRevealedId(revealedId === card.id ? null : card.id)}
                >
                  {revealedId === card.id ? '🙈 Hide' : '👁 Reveal'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const info = `${card.card_number}\nExp: ${card.expiry_month}/${card.expiry_year}\n${card.cvv_plain ? `CVV: ${card.cvv_plain}` : ''}`;
                    navigator.clipboard.writeText(info);
                    toast.success('Card details copied!');
                  }}
                >
                  📋 Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {enrichedHistory.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: 32 }}>
            <span className="sec-title">History</span>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {enrichedHistory.map((card, i) => {
              const meta = STATUS_META[card.status];
              return (
                <div
                  key={card.id}
                  className="vc-history-row"
                  style={{ borderBottom: i < enrichedHistory.length - 1 ? '1px solid var(--border-0)' : 'none' }}
                >
                  <div className="vc-hist-left">
                    <div className="vc-hist-num">••••{card.card_number.slice(-4)}</div>
                    <div className="vc-hist-label">{card.label}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {card.used_at && (
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        Used {new Date(card.used_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="vc-pill" style={{ background: meta.color + '22', color: meta.color }}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Security Info */}
      <div className="vc-info-grid" style={{ marginTop: 28 }}>
        {[
          { icon: '🔢', title: 'Luhn Algorithm', desc: 'Every card number passes cryptographic checksum validation used by real banks.' },
          { icon: '💀', title: 'Self-Destruct', desc: 'After the first charge, the card is permanently destroyed. No replay attacks possible.' },
          { icon: '🔒', title: 'Hashed CVV', desc: 'CVV codes are hashed with SHA-256 in the database — never stored in plain text.' },
          { icon: '⏱', title: '24h Lifetime', desc: 'Unused cards automatically expire after 24 hours to minimize exposure.' },
        ].map((item, i) => (
          <div key={i} className="vc-info-card">
            <span className="vc-info-icon">{item.icon}</span>
            <div>
              <div className="vc-info-title">{item.title}</div>
              <div className="vc-info-desc">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charge Modal */}
      {showChargeModal && (
        <div className="modal-overlay" onClick={() => setShowChargeModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontSize: 20 }}>⚡</span>
              <h3>Simulate Card Charge</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
              Simulate a merchant charging your virtual card. The card will self-destruct immediately after.
            </p>
            <div className="form-group">
              <label className="form-label">Card Number</label>
              <input
                className="form-input"
                placeholder="4532 •••• •••• ••••"
                value={chargeForm.cardNumber}
                onChange={e => setChargeForm(p => ({ ...p, cardNumber: e.target.value }))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">CVV</label>
                <input
                  className="form-input"
                  placeholder="•••"
                  maxLength={3}
                  value={chargeForm.cvv}
                  onChange={e => setChargeForm(p => ({ ...p, cvv: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="0.00"
                  value={chargeForm.amount}
                  onChange={e => setChargeForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowChargeModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCharge} disabled={charging}>
                {charging ? <><span className="spinner-sm" />Processing…</> : '⚡ Charge Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualCards;
