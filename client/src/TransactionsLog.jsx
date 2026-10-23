import React, { useState, useEffect } from 'react';
import { 
  History, ArrowDownRight, ArrowUpRight, Search, 
  RefreshCw, FileSpreadsheet, User, Calendar
} from 'lucide-react';
import { apiRequest } from './api';

export default function TransactionsLog({ showToast }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/stock/transactions?limit=100');
      setTransactions(res.transactions || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const filtered = transactions.filter(t => {
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesSearch = 
      t.productName.toLowerCase().includes(search.toLowerCase()) ||
      t.sku.toLowerCase().includes(search.toLowerCase()) ||
      t.enteredBy.toLowerCase().includes(search.toLowerCase()) ||
      (t.referenceNo && t.referenceNo.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Filter Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Stock Transaction History</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Comprehensive audit trail of all concurrent IN / OUT entries</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Movement Type Filter */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: 'var(--radius-sm)' }}>
            {['ALL', 'IN', 'OUT', 'ADJUST'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  borderRadius: '4px',
                  backgroundColor: filterType === t ? '#ffffff' : 'transparent',
                  color: filterType === t ? '#0f172a' : '#64748b',
                  boxShadow: filterType === t ? 'var(--shadow-sm)' : 'none'
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <button onClick={loadTransactions} className="btn-secondary" title="Sync live transactions">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search by SKU, product name, reference #, or staff user..." 
            className="form-input" 
            style={{ paddingLeft: '2.25rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="corp-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Timestamp</th>
                <th>Item / SKU</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Stock Progression</th>
                <th>Reference #</th>
                <th>Staff Operator</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No stock transaction records found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isPositive = t.type === 'IN';
                  return (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#64748b', fontSize: '0.85rem' }}>
                        #{t.id}
                      </td>
                      <td style={{ fontSize: '0.825rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(t.createdAt).toLocaleString([], { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{t.productName}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#2563eb' }}>{t.sku}</div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: isPositive ? '#ecfdf5' : t.type === 'OUT' ? '#fef2f2' : '#fffbeb',
                          color: isPositive ? '#065f46' : t.type === 'OUT' ? '#991b1b' : '#92400e',
                          border: `1px solid ${isPositive ? '#a7f3d0' : t.type === 'OUT' ? '#fecaca' : '#fde68a'}`
                        }}>
                          {isPositive ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                          {t.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                        {t.quantity} {t.unit}
                      </td>
                      <td style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                        {t.previousStock} → <strong style={{ color: '#0f172a' }}>{t.newStock}</strong>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {t.referenceNo || '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: '#1e293b' }}>
                          <User size={13} color="#64748b" />
                          <span>{t.enteredBy}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
