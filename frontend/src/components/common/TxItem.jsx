import { $, fmtDate } from '../../utils/format';

const CATEGORY_COLORS = {
  food: '#f59e0b', travel: '#38bdf8', health: '#34d399',
  housing: '#a78bfa', entertainment: '#f472b6', income: '#10d9a0',
  technology: '#60a5fa', work: '#94a3b8', finance: '#fbbf24',
  shopping: '#fb7185', transport: '#6ee7b7', education: '#c084fc',
  gifts: '#f9a8d4', charity: '#86efac', personal: '#7dd3fc', transfer: '#00c9a7',
};

const TxItem = ({ tx }) => {
  const isSent = tx.direction === 'sent';
  const dir = isSent ? 'sent' : 'received';
  const name = isSent ? tx.receiver_name : tx.sender_name;
  const avatar = isSent ? tx.receiver_avatar : tx.sender_avatar;
  const catColor = CATEGORY_COLORS[tx.category] || 'var(--teal)';

  return (
    <div className="tx-item">
      <div className={`tx-ava ${dir}`} style={{ fontSize: 20 }}>
        {avatar || (isSent ? '↑' : '↓')}
      </div>
      <div className="tx-info">
        <div className="tx-name">{name || 'Unknown'}</div>
        <div className="tx-note" style={{ color: catColor, fontSize: 11, fontWeight: 600 }}>
          {tx.note || (isSent ? 'Transfer sent' : 'Transfer received')}
        </div>
        <div className="tx-date">{fmtDate(tx.created_at)}</div>
      </div>
      <div className="tx-right">
        <div className={`tx-amt ${dir}`}>
          {isSent ? '−' : '+'}{$(tx.amount)}
        </div>
        <span className={`tx-cat ${tx.status}`}>{tx.status}</span>
      </div>
    </div>
  );
};

export default TxItem;
