import React, { useState, useEffect } from 'react';
import { 
  ArrowDownRight, ArrowUpRight, Plus, Check, RefreshCw, 
  Search, PackageCheck, AlertCircle, ShoppingCart, Send
} from 'lucide-react';
import { apiRequest } from './api';

export default function StockEntry({ currentUser, showToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Single fast-entry form
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [entryType, setEntryType] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  // Batch queue for high-volume entry without hanging
  const [queue, setQueue] = useState([]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/products');
      setProducts(data.products || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setQuantity('');
  };

  // Add item to fast batch queue
  const addToQueue = (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('Please pick an inventory item first', 'error');
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('Enter a valid positive quantity', 'error');
      return;
    }

    if (entryType === 'OUT' && selectedProduct.currentStock < qty) {
      showToast(`Warning: Current stock is only ${selectedProduct.currentStock} ${selectedProduct.unit}`, 'error');
      return;
    }

    const newItem = {
      productId: selectedProduct.id,
      sku: selectedProduct.sku,
      name: selectedProduct.name,
      unit: selectedProduct.unit,
      currentStock: selectedProduct.currentStock,
      type: entryType,
      quantity: qty,
      referenceNo: referenceNo.trim() || `REF-${Date.now().toString().slice(-6)}`,
      notes: notes.trim()
    };

    setQueue([newItem, ...queue]);
    setQuantity('');
    showToast(`Added ${newItem.name} (${entryType} ${qty}) to batch queue`, 'success');
  };

  const removeFromQueue = (index) => {
    setQueue(queue.filter((_, idx) => idx !== index));
  };

  // Immediate Single Entry submission
  const submitSingle = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    try {
      setSubmitting(true);
      const res = await apiRequest('/stock/entry', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          type: entryType,
          quantity: qty,
          referenceNo: referenceNo.trim() || `REF-${Date.now().toString().slice(-6)}`,
          notes: notes.trim()
        })
      });

      if (res.processed > 0) {
        showToast(`Stock updated! New balance for ${selectedProduct.name}: ${res.results[0].newStock} ${selectedProduct.unit}`, 'success');
        setQuantity('');
        setReferenceNo('');
        setNotes('');
        loadProducts();
      } else {
        showToast(res.errors[0]?.error || 'Failed to record entry', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Dispatch entire batch queue concurrently
  const submitBatchQueue = async () => {
    if (queue.length === 0) return;

    try {
      setSubmitting(true);
      const res = await apiRequest('/stock/entry', {
        method: 'POST',
        body: JSON.stringify({ entries: queue })
      });

      if (res.processed > 0) {
        showToast(`Successfully processed ${res.processed} entries simultaneously!`, 'success');
        setQueue([]);
        loadProducts();
      }
      if (res.failed > 0) {
        showToast(`${res.failed} entries could not be committed. Check logs.`, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
      
      {/* LEFT COLUMN: Fast Item Selector (Optimized for Mobile/Tablet) */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>1. Select Product / SKU</h2>
          <p style={{ fontSize: '0.825rem', color: '#64748b' }}>Tap any item from the catalog to record incoming or outgoing stock</p>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search SKU, item name or category..." 
            className="form-input" 
            style={{ paddingLeft: '2.25rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>Loading products catalog...</p>
          ) : filteredProducts.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>No matching products found.</p>
          ) : (
            filteredProducts.map((p) => {
              const isSelected = selectedProduct?.id === p.id;
              const isLow = p.currentStock <= p.minStock;

              return (
                <div 
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '2px solid #2563eb' : '1px solid var(--border-light)',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#2563eb', fontWeight: '600' }}>{p.sku}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{p.category}</span>
                    </div>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginTop: '0.2rem', fontSize: '0.95rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>Location: {p.location}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: '700', 
                      color: isLow ? '#b91c1c' : '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      justifyContent: 'flex-end'
                    }}>
                      {p.currentStock} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b' }}>{p.unit}</span>
                    </div>
                    {isLow && (
                      <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: '600', background: '#fef2f2', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        Low Stock (Min {p.minStock})
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Entry Terminal & Batch Multi-User Queue */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Quick Entry Form Card */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.25rem' }}>
            2. Record Movement (IN / OUT / ADJUST)
          </h2>
          <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Selected: <strong>{selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : 'None (Click a product on the left)'}</strong>
          </p>

          <form onSubmit={submitSingle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Movement Type Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setEntryType('IN')}
                style={{
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  backgroundColor: entryType === 'IN' ? '#10b981' : '#f8fafc',
                  color: entryType === 'IN' ? '#ffffff' : '#334155',
                  border: entryType === 'IN' ? '1px solid #059669' : '1px solid var(--border-light)'
                }}
              >
                <ArrowDownRight size={16} /> Stock IN (+)
              </button>

              <button
                type="button"
                onClick={() => setEntryType('OUT')}
                style={{
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  backgroundColor: entryType === 'OUT' ? '#ef4444' : '#f8fafc',
                  color: entryType === 'OUT' ? '#ffffff' : '#334155',
                  border: entryType === 'OUT' ? '1px solid #dc2626' : '1px solid var(--border-light)'
                }}
              >
                <ArrowUpRight size={16} /> Stock OUT (-)
              </button>

              <button
                type="button"
                onClick={() => setEntryType('ADJUST')}
                style={{
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  backgroundColor: entryType === 'ADJUST' ? '#f59e0b' : '#f8fafc',
                  color: entryType === 'ADJUST' ? '#ffffff' : '#334155',
                  border: entryType === 'ADJUST' ? '1px solid #d97706' : '1px solid var(--border-light)'
                }}
              >
                Set Exact Count
              </button>
            </div>

            {/* Quantity Input with large mobile touch targets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  Quantity ({selectedProduct ? selectedProduct.unit : 'Units'})
                </label>
                <input 
                  type="number" 
                  step="any"
                  min="0.01"
                  required
                  placeholder="0"
                  className="form-input" 
                  style={{ fontSize: '1.25rem', fontWeight: '700', padding: '0.5rem 0.75rem' }}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  PO / Bill / Ref #
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. PO-9841"
                  className="form-input" 
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                Transaction Notes (Optional)
              </label>
              <input 
                type="text" 
                placeholder="e.g. Supplier delivery or damage report"
                className="form-input" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={submitting || !selectedProduct || !quantity}
                className="btn-primary"
                style={{ flex: 1, padding: '0.75rem' }}
              >
                {submitting ? 'Saving...' : (
                  <>
                    <Check size={18} /> Commit Entry Now
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={addToQueue}
                disabled={!selectedProduct || !quantity}
                className="btn-secondary"
                style={{ padding: '0.75rem 1.25rem' }}
                title="Add to multi-item batch"
              >
                <Plus size={18} /> Add to Batch
              </button>
            </div>
          </form>
        </div>

        {/* Batch Queue Card for Simultaneous Multi-item entry */}
        {queue.length > 0 && (
          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#581c87' }}>
                  Staged Batch Queue ({queue.length} items ready)
                </h3>
                <p style={{ fontSize: '0.775rem', color: '#7e22ce' }}>Multiple line items ready to commit in a single ACID transaction</p>
              </div>
              <button onClick={submitBatchQueue} disabled={submitting} className="btn-primary" style={{ backgroundColor: '#7e22ce', fontSize: '0.85rem' }}>
                <Send size={15} /> Commit Batch ({queue.length})
              </button>
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {queue.map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: '#ffffff',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #f3e8ff',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <strong>{item.sku}</strong> - {item.name} 
                    <span style={{ marginLeft: '0.5rem', color: item.type === 'IN' ? '#059669' : '#dc2626', fontWeight: '600' }}>
                      [{item.type} {item.quantity} {item.unit}]
                    </span>
                  </div>
                  <button onClick={() => removeFromQueue(idx)} style={{ color: '#991b1b', cursor: 'pointer', fontSize: '0.8rem' }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
