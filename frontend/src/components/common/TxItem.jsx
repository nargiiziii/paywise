import { $, fmtDate } from '../../utils/format';
import { generateTransactionPDF } from '../../utils/generateReceipt';

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

  const handleDownloadPDF = (e) => {
    e.stopPropagation();
    generateTransactionPDF(tx);
  };

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
      <button
        className="tx-pdf-btn"
        onClick={handleDownloadPDF}
        title="Download PDF receipt"
        id={`pdf-btn-${tx.id}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <polyline points="9 15 12 18 15 15" />
        </svg>
        <span>PDF</span>
      </button>
    </div>
  );
};

export default TxItem;
