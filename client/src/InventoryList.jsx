import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Edit2, RefreshCw, AlertTriangle, 
  MapPin, Tag, DollarSign, Layers
} from 'lucide-react';
import { apiRequest } from './api';

export default function InventoryList({ currentUser, showToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);

  const [formData, setFormData] = useState({
    sku: '', name: '', category: '', unit: 'pcs', minStock: 10, currentStock: 0, unitPrice: 0, location: 'Warehouse A'
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      let query = `?lowStockOnly=${lowStockOnly}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (categoryFilter) query += `&category=${encodeURIComponent(categoryFilter)}`;

      const data = await apiRequest(`/products${query}`);
      setProducts(data.products || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, lowStockOnly]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast(`SKU '${formData.sku}' added to catalog!`, 'success');
      setCreateModal(false);
      setFormData({ sku: '', name: '', category: '', unit: 'pcs', minStock: 10, currentStock: 0, unitPrice: 0, location: 'Warehouse A' });
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/products/${editModal.id}`, {
        method: 'PUT',
        body: JSON.stringify(editModal)
      });
      showToast(`Item '${editModal.sku}' updated!`, 'success');
      setEditModal(null);
      loadProducts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const canManage = currentUser.role === 'superadmin' || currentUser.role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Controls */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Catalog & Stock Registry</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Complete item inventory with re-order thresholds</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {canManage && (
            <button onClick={() => setCreateModal(true)} className="btn-primary">
              <Plus size={16} /> New Product SKU
            </button>
          )}
          <button onClick={loadProducts} className="btn-secondary" title="Refresh list">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search SKU, name, rack location..." 
            className="form-input" 
            style={{ paddingLeft: '2.25rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadProducts()}
          />
        </div>

        <select 
          className="form-input" 
          style={{ width: 'auto', minWidth: '160px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '500', color: '#475569' }}>
          <input 
            type="checkbox" 
            checked={lowStockOnly} 
            onChange={(e) => setLowStockOnly(e.target.checked)} 
            style={{ accentColor: '#dc2626' }}
          />
          Show Low Stock Only
        </label>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="corp-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Description</th>
                <th>Category</th>
                <th>Storage Location</th>
                <th>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Current Stock</th>
                <th style={{ textAlign: 'right' }}>Status</th>
                {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Loading inventory records...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.currentStock <= p.minStock;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: '#2563eb' }}>
                        {p.sku}
                      </td>
                      <td style={{ fontWeight: '600', color: '#1e293b' }}>
                        {p.name}
                      </td>
                      <td>
                        <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: '#475569' }}>
                          {p.category}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        <MapPin size={13} style={{ display: 'inline', marginRight: '3px', verticalAlign: '-1px' }} />
                        {p.location}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                        ${p.unitPrice ? p.unitPrice.toFixed(2) : '0.00'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '700', fontSize: '1rem', fontFamily: 'var(--font-mono)', color: isLow ? '#dc2626' : '#0f172a' }}>
                        {p.currentStock} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b' }}>{p.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isLow ? (
                          <span className="badge badge-inactive" style={{ color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2' }}>
                            Low (Min {p.minStock})
                          </span>
                        ) : (
                          <span className="badge badge-active">
                            Optimal
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                            title="Edit Product Details"
                            onClick={() => setEditModal(p)}
                          >
                            <Edit2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {createModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.25rem' }}>Add New Product SKU</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>SKU Code *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. SKU-9001"
                    value={formData.sku} 
                    onChange={e => setFormData({ ...formData, sku: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Unit of Measure</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. pcs, kg, box"
                    value={formData.unit} 
                    onChange={e => setFormData({ ...formData, unit: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Product Name / Description *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="e.g. Steel Pipe 50mm"
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Category *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Metals & Hardware"
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Warehouse Location</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Rack C-2"
                    value={formData.location} 
                    onChange={e => setFormData({ ...formData, location: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Initial Stock</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.currentStock} 
                    onChange={e => setFormData({ ...formData, currentStock: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Min Alert Threshold</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.minStock} 
                    onChange={e => setFormData({ ...formData, minStock: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Unit Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    value={formData.unitPrice} 
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.25rem' }}>
              Edit Product: <span style={{ color: '#2563eb' }}>{editModal.sku}</span>
            </h3>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Product Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={editModal.name} 
                  onChange={e => setEditModal({ ...editModal, name: e.target.value })} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Category</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={editModal.category} 
                    onChange={e => setEditModal({ ...editModal, category: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Location</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editModal.location} 
                    onChange={e => setEditModal({ ...editModal, location: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Min Alert Threshold</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editModal.minStock} 
                    onChange={e => setEditModal({ ...editModal, minStock: parseInt(e.target.value, 10) })} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Unit Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    value={editModal.unitPrice} 
                    onChange={e => setEditModal({ ...editModal, unitPrice: parseFloat(e.target.value) })} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
