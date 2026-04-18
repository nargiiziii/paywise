import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import TxItem from '../common/TxItem';
import api from '../../utils/api';
import { $ } from '../../utils/format';

const TYPES = ['all','sent','received'];
const SORTS = [
  { k: 'newest', l: 'Newest' }, { k: 'oldest', l: 'Oldest' },
  { k: 'amount_desc', l: 'Highest $' }, { k: 'amount_asc', l: 'Lowest $' }
];
const CATS = ['all','food','housing','travel','health','entertainment','technology','finance','shopping','education','transfer'];

const History = () => {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await api.get('/transactions', { params: {
        type: type === 'all' ? undefined : type,
        sort, category: category === 'all' ? undefined : category,
        search: search || undefined, page: p, limit: 15
      }});
      setTxs(r.data.transactions);
      setPagination(r.data.pagination);
      setPage(p);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [type, sort, category, search]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Transaction History</h1>
        <p className="page-sub">{pagination.total} total transactions</p>
      </div>

      {/* Search */}
      <div className="card card-sm" style={{ marginBottom: 16 }}>
        <div className="input-wrap">
          <span className="input-prefix" style={{ fontSize: 16 }}>🔍</span>
          <input
            className="form-input"
            placeholder="Search by name, note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', boxShadow: 'none', paddingLeft: 36, fontSize: 14 }}
            onKeyDown={e => e.key === 'Enter' && load(1)}
          />
          {search && <button className="input-suffix" style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', transform: 'none' }} onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Type tabs */}
        <div className="tab-row" style={{ flex: 'none', marginBottom: 0, width: 'auto' }}>
          {TYPES.map(t => (
            <button key={t} className={`tab-btn ${type === t ? 'active' : ''}`}
              style={{ flex: 'none', padding: '7px 16px' }}
              onClick={() => setType(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Category */}
        <select className="form-input form-select"
          value={category} onChange={e => setCategory(e.target.value)}
          style={{ width: 'auto', padding: '8px 36px 8px 12px', fontSize: 13 }}>
          {CATS.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>

        {/* Sort */}
        <select className="form-input form-select"
          value={sort} onChange={e => setSort(e.target.value)}
          style={{ width: 'auto', padding: '8px 36px 8px 12px', fontSize: 13, marginLeft: 'auto' }}>
          {SORTS.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 68 }} />)}
          </div>
        ) : txs.length > 0 ? (
          <>
            <div className="tx-list">
              {txs.map(tx => <TxItem key={tx.id} tx={tx} />)}
            </div>
            {pagination.pages > 1 && (
              <div className="pagination">
                <button className="pag-btn" disabled={page === 1} onClick={() => load(page - 1)}>← Prev</button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - page) <= 2)
                  .map(p => (
                    <button key={p} className={`pag-btn ${p === page ? 'active' : ''}`} onClick={() => load(p)}>{p}</button>
                  ))}
                <button className="pag-btn" disabled={page === pagination.pages} onClick={() => load(page + 1)}>Next →</button>
              </div>
            )}
          </>
        ) : (
          <div className="empty">
            <div className="empty-icon">📭</div>
            <div className="empty-title">No transactions found</div>
            <div className="empty-sub">Try changing your filters</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
