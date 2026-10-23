import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, 
  Send, RefreshCw, Hash, Edit2, Eye, X, FileSpreadsheet, Calculator
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiRequest } from './api';

// Face Veneer Types as requested: Recon Face, Film Face, Gurjan Face, Okoume Face
const FACE_VENEER_TYPES = [
  'Recon Face',
  'Film Face',
  'Gurjan Face',
  'Okoume Face'
];

export default function FaceVeneerEntry({ user, showToast }) {
  // Lot Header state (Manual Entry)
  const [lotNo, setLotNo] = useState('');
  const [lotNotes, setLotNotes] = useState('');
  const [lotStatus, setLotStatus] = useState(null); // 'checking' | 'available' | 'duplicate' | null
  const [lotError, setLotError] = useState('');

  // Item Form states: Face Veneer type, Length (ft), Width (ft), Qty (pcs), Remarks
  const [veneerType, setVeneerType] = useState(FACE_VENEER_TYPES[0]);
  const [lengthFt, setLengthFt] = useState('');
  const [widthFt, setWidthFt] = useState('');
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');

  // Staged Lot Items
  const [lotItems, setLotItems] = useState([]);
  const [submittingLot, setSubmittingLot] = useState(false);
  const [recentLots, setRecentLots] = useState([]);
  const [submittedLotSuccess, setSubmittedLotSuccess] = useState(null);

  // Edit / Delete / View Modal states for Superadmin and Admin
  const [selectedLotForItems, setSelectedLotForItems] = useState(null);
  const [loadingLotItems, setLoadingLotItems] = useState(false);
  const [editLotModal, setEditLotModal] = useState(null);
  const [editItemModal, setEditItemModal] = useState(null);
  const [deleteLotModal, setDeleteLotModal] = useState(null);
  const [deleteItemModal, setDeleteItemModal] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  const canManage = user?.role === 'superadmin' || user?.role === 'admin';

  // Live Auto-calculated total area:
  // length (ft) * width (ft) * qty (pcs)
  const l = parseFloat(lengthFt) || 0;
  const w = parseFloat(widthFt) || 0;
  const q = parseInt(qty, 10) || 0;
  const liveTotalArea = (l > 0 && w > 0 && q > 0)
    ? parseFloat(((l * w) * q).toFixed(2))
    : 0;

  const loadRecentLots = async () => {
    try {
      const data = await apiRequest('/face-veneer-entry/lots');
      setRecentLots(data.lots || []);
    } catch (e) {
      console.error('Failed to load recent face veneer lots', e);
    }
  };

  useEffect(() => {
    loadRecentLots();
  }, []);

  // Check Lot No uniqueness on blur
  const handleCheckLotNo = async (val) => {
    const trimmed = (val !== undefined ? val : lotNo).trim();
    if (!trimmed) {
      setLotStatus(null);
      setLotError('');
      return;
    }

    try {
      setLotStatus('checking');
      const res = await apiRequest(`/face-veneer-entry/check-lot/${encodeURIComponent(trimmed)}`);
      if (res.exists) {
        setLotStatus('duplicate');
        setLotError(`Lot No. "${trimmed}" is already registered. Please enter a unique Lot No.`);
      } else {
        setLotStatus('available');
        setLotError('');
      }
    } catch (err) {
      setLotStatus(null);
    }
  };

  // Add Item to Staged Lot List
  const handleAddToLot = (e) => {
    e.preventDefault();

    const currentLotNo = lotNo.trim();
    if (!currentLotNo) {
      showToast('Lot No. is mandatory. Please enter a Lot No. first.', 'error');
      alert('Please enter a Lot No. first.');
      return;
    }

    if (lotStatus === 'duplicate') {
      showToast('Cannot add item: Lot No. already exists in system.', 'error');
      alert('Cannot add item: Lot No. already exists. Use a distinct Lot No.');
      return;
    }

    if (!lengthFt || parseFloat(lengthFt) <= 0) {
      showToast('Please enter a valid Length in ft.', 'error');
      return;
    }

    if (!widthFt || parseFloat(widthFt) <= 0) {
      showToast('Please enter a valid Width in ft.', 'error');
      return;
    }

    const parsedQty = parseInt(qty, 10);
    if (!parsedQty || parsedQty <= 0) {
      showToast('Please enter a valid Quantity in pieces.', 'error');
      return;
    }

    // Duplicate check within this staged lot
    const isDuplicate = lotItems.some(it =>
      it.veneerType === veneerType &&
      parseFloat(it.lengthFt) === parseFloat(lengthFt) &&
      parseFloat(it.widthFt) === parseFloat(widthFt)
    );

    if (isDuplicate) {
      showToast('An identical face veneer item is already staged in this lot.', 'warning');
      alert('An identical face veneer item is already in this lot. Adjust its quantity or update specifications.');
      return;
    }

    const newItem = {
      veneerType,
      lengthFt: parseFloat(lengthFt),
      widthFt: parseFloat(widthFt),
      qty: parsedQty,
      totalArea: liveTotalArea,
      remarks: remarks.trim() || null
    };

    setLotItems([...lotItems, newItem]);
    showToast(`Added ${parsedQty} pcs (${liveTotalArea} sqft) of ${veneerType} to lot.`, 'success');

    // Clear item fields after adding
    setLengthFt('');
    setWidthFt('');
    setQty('');
    setRemarks('');
  };

  const handleRemoveItem = (index) => {
    setLotItems(lotItems.filter((_, idx) => idx !== index));
  };

  // Final Submit with Preloader & Duplicate Lot Lock
  const handleFinalSubmitLot = async () => {
    const currentLotNo = lotNo.trim();
    if (!currentLotNo) {
      showToast('Lot No. is mandatory', 'error');
      alert('Please enter a Lot No.');
      return;
    }

    if (lotItems.length === 0) {
      showToast('Please add at least one item into this lot using "Add to Lot"', 'error');
      alert('Please add at least one item into this lot using "Add to Lot" before submitting.');
      return;
    }

    try {
      setSubmittingLot(true);
      // Double check lot uniqueness before committing
      const checkRes = await apiRequest(`/face-veneer-entry/check-lot/${encodeURIComponent(currentLotNo)}`);
      if (checkRes.exists) {
        setLotStatus('duplicate');
        setLotError(`Lot No. "${currentLotNo}" was already submitted by another user. Choose a distinct Lot No.`);
        showToast('Duplicate Lot No. detected! Submission blocked.', 'error');
        alert(`Duplicate Lot No. "${currentLotNo}" already exists in the system. Submission blocked.`);
        setSubmittingLot(false);
        return;
      }

      const res = await apiRequest('/face-veneer-entry/submit-lot', {
        method: 'POST',
        body: JSON.stringify({
          lotNo: currentLotNo,
          items: lotItems,
          notes: lotNotes.trim()
        })
      });

      setSubmittedLotSuccess({
        lotNo: currentLotNo,
        itemCount: lotItems.length,
        totalQty: res.totalQty || totalLotPieces,
        totalArea: res.totalArea || totalLotArea,
        time: new Date().toLocaleTimeString()
      });

      showToast(`Success: Lot #${currentLotNo} with ${lotItems.length} items (${res.totalQty || totalLotPieces} pcs, ${res.totalArea || totalLotArea} sqft total) registered!`, 'success');

      // Clear full lot form
      setLotNo('');
      setLotNotes('');
      setLotItems([]);
      setLotStatus(null);
      setLotError('');
      setLengthFt('');
      setWidthFt('');
      setQty('');
      setRemarks('');

      loadRecentLots();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission error:', err);
      showToast(err.message || 'Submission failed', 'error');
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingLot(false);
    }
  };

  // View lot items modal
  const handleViewLotItems = async (lot) => {
    try {
      setLoadingLotItems(true);
      const data = await apiRequest(`/face-veneer-entry/lots/${lot.id}/items`);
      setSelectedLotForItems({ ...lot, items: data.items || [] });
    } catch (err) {
      showToast(err.message || 'Failed to load lot items', 'error');
    } finally {
      setLoadingLotItems(false);
    }
  };

  // Delete entire lot
  const handleConfirmDeleteLot = async () => {
    if (!deleteLotModal) return;
    try {
      const res = await apiRequest(`/face-veneer-entry/lots/${deleteLotModal.id}`, {
        method: 'DELETE'
      });
      showToast(res.message, 'success');
      setDeleteLotModal(null);
      if (selectedLotForItems?.id === deleteLotModal.id) {
        setSelectedLotForItems(null);
      }
      loadRecentLots();
    } catch (err) {
      showToast(err.message || 'Failed to delete lot', 'error');
    }
  };

  // Update lot header
  const handleSaveLotEdit = async (e) => {
    e.preventDefault();
    if (!editLotModal) return;
    try {
      const res = await apiRequest(`/face-veneer-entry/lots/${editLotModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          lotNo: editLotModal.lotNo,
          notes: editLotModal.notes
        })
      });
      showToast(res.message, 'success');
      setEditLotModal(null);
      loadRecentLots();
      if (selectedLotForItems?.id === editLotModal.id) {
        handleViewLotItems({ ...selectedLotForItems, lotNo: editLotModal.lotNo });
      }
    } catch (err) {
      showToast(err.message || 'Failed to update lot', 'error');
    }
  };

  // Update single item
  const handleSaveItemEdit = async (e) => {
    e.preventDefault();
    if (!editItemModal) return;
    try {
      const res = await apiRequest(`/face-veneer-entry/items/${editItemModal.id}`, {
        method: 'PUT',
        body: JSON.stringify(editItemModal)
      });
      showToast(res.message, 'success');
      setEditItemModal(null);
      if (selectedLotForItems) {
        handleViewLotItems(selectedLotForItems);
      }
      loadRecentLots();
    } catch (err) {
      showToast(err.message || 'Failed to update item', 'error');
    }
  };

  // Delete single item
  const handleConfirmDeleteItem = async () => {
    if (!deleteItemModal) return;
    try {
      const res = await apiRequest(`/face-veneer-entry/items/${deleteItemModal.id}`, {
        method: 'DELETE'
      });
      showToast(res.message, 'success');
      setDeleteItemModal(null);
      if (selectedLotForItems) {
        handleViewLotItems(selectedLotForItems);
      }
      loadRecentLots();
    } catch (err) {
      showToast(err.message || 'Failed to delete item', 'error');
    }
  };

  // Export Face Veneer Entry Report to Excel (Superadmin & Admin)
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const res = await apiRequest('/face-veneer-entry/export-report');
      const data = res.report || [];

      if (data.length === 0) {
        showToast('No face veneer entry records found to export.', 'error');
        setExportingExcel(false);
        return;
      }

      const excelRows = data.map((r, idx) => ({
        'SL No': idx + 1,
        'Lot No': r.lotNo,
        'Date Registered': new Date(r.lotDate).toLocaleDateString(),
        'Time Registered': new Date(r.lotDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        'Operator': r.enteredBy,
        'Face Veneer Type': r.veneerType,
        'Length (ft)': r.lengthFt,
        'Width (ft)': r.widthFt,
        'Quantity (pcs)': r.qty,
        'Total Area (sqft)': r.totalArea,
        'Remarks': r.remarks || '-',
        'Lot Batch Notes': r.lotBatchNotes || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const colWidths = Object.keys(excelRows[0] || {}).map(key => ({
        wch: Math.max(key.length, 14)
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Face Veneer Stock Report');

      const todayStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `NEVP_Face_Veneer_Report_${todayStr}.xlsx`);

      showToast('Face veneer stock report exported to Excel successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export Excel report', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const totalLotPieces = lotItems.reduce((acc, it) => acc + it.qty, 0);
  const totalLotArea = parseFloat(lotItems.reduce((acc, it) => acc + it.totalArea, 0).toFixed(2));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* SUCCESS CONFIRMATION BANNER */}
      {submittedLotSuccess && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '2px solid #10b981',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#065f46' }}>
                Lot #{submittedLotSuccess.lotNo} Registered Successfully!
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#047857', marginTop: '0.15rem' }}>
                Committed {submittedLotSuccess.itemCount} items with a total of {submittedLotSuccess.totalQty} pieces ({submittedLotSuccess.totalArea} sqft) to inventory at {submittedLotSuccess.time}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmittedLotSuccess(null)}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', borderColor: '#a7f3d0' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* LOT HEADER SECTION (Identical Corporate Theme) */}
      <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash size={18} color="#2563eb" /> Face Veneer Entry Point - Lot Master Entry
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
              Enter manual Lot No., stage face veneer sheets with automated sqft area calculation, and commit to inventory.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', background: '#eff6ff', color: '#1e40af', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: '600' }}>
              Items: {lotItems.length} | Pcs: {totalLotPieces} | Total Area: {totalLotArea} sqft
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {/* Lot No Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.35rem' }}>
              Lot No. <span style={{ color: '#dc2626' }}>* (Manual Entry)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                placeholder="e.g. FACE-LOT-2026-001"
                className="form-input"
                style={{
                  fontWeight: '700',
                  letterSpacing: '0.02em',
                  paddingRight: '2.5rem',
                  borderColor: lotStatus === 'duplicate' ? '#ef4444' : lotStatus === 'available' ? '#10b981' : 'var(--border-light)',
                  backgroundColor: lotStatus === 'duplicate' ? '#fef2f2' : lotStatus === 'available' ? '#f0fdf4' : '#ffffff'
                }}
                value={lotNo}
                onChange={(e) => {
                  setLotNo(e.target.value);
                  setLotStatus(null);
                  setLotError('');
                }}
                onBlur={(e) => handleCheckLotNo(e.target.value)}
              />
              <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                {lotStatus === 'checking' && <RefreshCw size={16} className="spin" color="#64748b" />}
                {lotStatus === 'available' && <CheckCircle2 size={18} color="#10b981" />}
                {lotStatus === 'duplicate' && <AlertCircle size={18} color="#dc2626" />}
              </div>
            </div>

            {lotError ? (
              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600', display: 'block', marginTop: '0.3rem' }}>
                {lotError}
              </span>
            ) : lotStatus === 'available' ? (
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600', display: 'block', marginTop: '0.3rem' }}>
                ✓ Lot No. is available and unique
              </span>
            ) : (
              <span style={{ fontSize: '0.725rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                Type Lot No. and unfocus to verify uniqueness
              </span>
            )}
          </div>

          {/* Lot Header Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '0.35rem' }}>
              Lot Batch Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Splicing line batch, import consignment, flitch reference"
              className="form-input"
              value={lotNotes}
              onChange={(e) => setLotNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ITEM ENTRY SPECIFICATION FORM */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={17} color="#2563eb" /> Face Veneer Specifications & Area Calculator
        </h3>

        <form onSubmit={handleAddToLot} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Row 1: Face Veneer Type, Length (ft), Width (ft), Qty (pcs), Total Area (Auto) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.3fr) minmax(130px, 1fr) minmax(130px, 1fr) minmax(130px, 1fr) minmax(160px, 1.1fr)', gap: '1rem' }}>
            
            {/* Face Veneer Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                Face Veneer Type <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="form-input"
                style={{ fontWeight: '600', height: '42px' }}
                value={veneerType}
                onChange={(e) => setVeneerType(e.target.value)}
              >
                {FACE_VENEER_TYPES.map(vt => (
                  <option key={vt} value={vt}>{vt}</option>
                ))}
              </select>
            </div>

            {/* Length (ft) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                Length (ft) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                className="form-input"
                style={{ height: '42px' }}
                placeholder="e.g. 8"
                value={lengthFt}
                onChange={(e) => setLengthFt(e.target.value)}
              />
            </div>

            {/* Width (ft) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                Width (ft) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                className="form-input"
                style={{ height: '42px' }}
                placeholder="e.g. 4"
                value={widthFt}
                onChange={(e) => setWidthFt(e.target.value)}
              />
            </div>

            {/* Qty (pcs) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                Qty (pcs) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                style={{ fontWeight: '700', fontSize: '1.05rem', color: '#2563eb', height: '42px' }}
                placeholder="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>

            {/* Total Area (Auto calculate) */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                <span>Total Area (Auto)</span>
                <Calculator size={13} color="#059669" />
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '700',
                  fontSize: '1.05rem',
                  color: '#15803d',
                  height: '42px'
                }}
              >
                {liveTotalArea} sqft
              </div>
            </div>

          </div>

          {/* Remarks (optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
              Remarks (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Spliced sheets, grain pattern, thickness note, bundle number"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          {/* ADD TO LOT BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={lotStatus === 'duplicate'}
              className="btn-secondary"
              style={{
                backgroundColor: '#f1f5f9',
                borderColor: '#cbd5e1',
                padding: '0.75rem 1.75rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                color: '#1e293b'
              }}
            >
              <Plus size={18} color="#2563eb" /> Add to Lot
            </button>
          </div>

        </form>
      </div>

      {/* STAGED LOT ITEMS TABLE (Exact Corporate Layout) */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
              Staged Lot Breakdown {lotNo.trim() && <span style={{ color: '#2563eb' }}>({lotNo.trim()})</span>}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Review staged face veneer line items. Final submit writes this lot into persistent database.
            </p>
          </div>

          {/* FINAL SUBMIT BUTTON WITH PRELOADER & DUPLICATE RESTRICTION */}
          <button
            type="button"
            onClick={handleFinalSubmitLot}
            disabled={submittingLot || lotItems.length === 0 || lotStatus === 'duplicate'}
            className="btn-primary"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: '700',
              backgroundColor: '#059669',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
            }}
          >
            {submittingLot ? (
              <>
                <RefreshCw size={18} className="spin" />
                <span>Submitting Lot...</span>
              </>
            ) : (
              <>
                <Send size={17} />
                <span>Final Submit Lot ({lotItems.length} items)</span>
              </>
            )}
          </button>
        </div>

        <div className="table-container">
          <table className="corp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Face Veneer Type</th>
                <th>Dimensions</th>
                <th style={{ textAlign: 'right' }}>Qty (pcs)</th>
                <th style={{ textAlign: 'right' }}>Total Area (sqft)</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lotItems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                    No face veneer items staged in this lot yet. Specify details above and click <strong>"Add to Lot"</strong>.
                  </td>
                </tr>
              ) : (
                lotItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '700', color: '#1e293b' }}>{item.veneerType}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {item.lengthFt} ft × {item.widthFt} ft
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#2563eb' }}>
                      {item.qty}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#059669' }}>
                      {item.totalArea} sqft
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.remarks || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="btn-danger"
                        style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                        title="Remove Item from Lot"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {lotItems.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                  <td colSpan="3" style={{ textAlign: 'right', padding: '0.85rem 1rem' }}>
                    Lot Totals:
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: '#2563eb' }}>
                    {totalLotPieces} pcs
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: '#059669' }}>
                    {totalLotArea} sqft
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* RECENTLY REGISTERED FACE VENEER LOTS AUDIT VIEW */}
      {recentLots.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Recently Registered Face Veneer Lots ({recentLots.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Confirmed face veneer inventory lots saved in database
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {canManage && (
                <button
                  onClick={handleExportExcel}
                  disabled={exportingExcel}
                  className="btn-primary"
                  style={{
                    backgroundColor: '#15803d',
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.825rem',
                    boxShadow: '0 1px 3px rgba(21, 128, 61, 0.3)'
                  }}
                  title="Export all Face Veneer Entry records to Excel spreadsheet"
                >
                  {exportingExcel ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Generating Excel...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet size={15} />
                      <span>Export Report (Excel)</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={loadRecentLots}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.825rem' }}
                title="Refresh lots list"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="corp-table">
              <thead>
                <tr>
                  <th>Lot No.</th>
                  <th>Created At</th>
                  <th>Operator</th>
                  <th style={{ textAlign: 'center' }}>Total Line Items</th>
                  <th style={{ textAlign: 'right' }}>Total Pieces</th>
                  <th style={{ textAlign: 'right' }}>Total Area</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentLots.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#2563eb' }}>
                      {l.lotNo}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(l.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{l.createdBy}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                      {l.itemCount} items
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#2563eb', fontSize: '0.95rem' }}>
                      {l.totalQty} pcs
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#059669', fontSize: '0.95rem' }}>
                      {l.totalArea} sqft
                    </td>
                    <td>
                      <span className="badge badge-active">COMMITTED</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleViewLotItems(l)}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          title="View / Edit Line Items"
                        >
                          <Eye size={13} color="#2563eb" /> View Items
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => setEditLotModal(l)}
                              className="btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                              title="Edit Lot Header"
                            >
                              <Edit2 size={13} color="#0f172a" />
                            </button>
                            <button
                              onClick={() => setDeleteLotModal(l)}
                              className="btn-danger"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                              title="Delete Lot Permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW & MANAGE LINE ITEMS MODAL */}
      {selectedLotForItems && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
                  Face Veneer Lot #{selectedLotForItems.lotNo} Details
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Registered by {selectedLotForItems.createdBy} on {new Date(selectedLotForItems.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedLotForItems(null)} className="btn-secondary" style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            {loadingLotItems ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading lot items...</p>
            ) : selectedLotForItems.items?.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No items found in this lot.</p>
            ) : (
              <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="corp-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Face Veneer Type</th>
                      <th>Dimensions</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Total Area</th>
                      <th>Remarks</th>
                      {canManage && <th style={{ textAlign: 'center' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLotForItems.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '700' }}>{it.veneerType}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{it.lengthFt} ft × {it.widthFt} ft</td>
                        <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#2563eb' }}>
                          {it.qty}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#059669' }}>
                          {it.totalArea} sqft
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{it.remarks || '-'}</td>
                        {canManage && (
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => setEditItemModal(it)}
                                className="btn-secondary"
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                title="Edit Line Item"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => setDeleteItemModal(it)}
                                className="btn-danger"
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                title="Delete Line Item"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setSelectedLotForItems(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT LOT HEADER MODAL */}
      {editLotModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#0f172a' }}>
              Edit Face Veneer Lot #{editLotModal.lotNo}
            </h3>
            <form onSubmit={handleSaveLotEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Lot Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editLotModal.lotNo}
                  onChange={(e) => setEditLotModal({ ...editLotModal, lotNo: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Batch Notes / Remarks
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editLotModal.notes || ''}
                  onChange={(e) => setEditLotModal({ ...editLotModal, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditLotModal(null)} className="btn-secondary">
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

      {/* EDIT LINE ITEM MODAL */}
      {editItemModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#0f172a' }}>
              Edit Item in Lot #{editItemModal.lotNo}
            </h3>
            <form onSubmit={handleSaveItemEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  Face Veneer Type
                </label>
                <select
                  className="form-input"
                  value={editItemModal.veneerType}
                  onChange={(e) => setEditItemModal({ ...editItemModal, veneerType: e.target.value })}
                >
                  {FACE_VENEER_TYPES.map(vt => (
                    <option key={vt} value={vt}>{vt}</option>
                  ))}
                </select>
              </div>

              {/* Dimensions, Qty, and Computed Area */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                    Length (ft)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-input"
                    value={editItemModal.lengthFt}
                    onChange={(e) => {
                      const newL = e.target.value;
                      const lVal = parseFloat(newL) || 0;
                      const wVal = parseFloat(editItemModal.widthFt) || 0;
                      const qVal = parseInt(editItemModal.qty, 10) || 0;
                      const newArea = parseFloat(((lVal * wVal) * qVal).toFixed(2));
                      setEditItemModal({ ...editItemModal, lengthFt: newL, totalArea: newArea });
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                    Width (ft)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-input"
                    value={editItemModal.widthFt}
                    onChange={(e) => {
                      const newW = e.target.value;
                      const lVal = parseFloat(editItemModal.lengthFt) || 0;
                      const wVal = parseFloat(newW) || 0;
                      const qVal = parseInt(editItemModal.qty, 10) || 0;
                      const newArea = parseFloat(((lVal * wVal) * qVal).toFixed(2));
                      setEditItemModal({ ...editItemModal, widthFt: newW, totalArea: newArea });
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                    Quantity (pcs)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-input"
                    style={{ fontWeight: '700', color: '#2563eb' }}
                    value={editItemModal.qty}
                    onChange={(e) => {
                      const newQ = e.target.value;
                      const lVal = parseFloat(editItemModal.lengthFt) || 0;
                      const wVal = parseFloat(editItemModal.widthFt) || 0;
                      const qVal = parseInt(newQ, 10) || 0;
                      const newArea = parseFloat(((lVal * wVal) * qVal).toFixed(2));
                      setEditItemModal({ ...editItemModal, qty: newQ, totalArea: newArea });
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                    Total Area (Auto)
                  </label>
                  <div style={{ padding: '0.55rem 0.75rem', backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: '700', borderRadius: '4px', border: '1px solid #bbf7d0', height: '40px', display: 'flex', alignItems: 'center' }}>
                    {editItemModal.totalArea} sqft
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  Remarks
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editItemModal.remarks || ''}
                  onChange={(e) => setEditItemModal({ ...editItemModal, remarks: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditItemModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Line Item
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE LOT MODAL */}
      {deleteLotModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
              Delete Lot #{deleteLotModal.lotNo}?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              This will permanently delete Lot #{deleteLotModal.lotNo} and all associated face veneer line items ({deleteLotModal.itemCount} items, {deleteLotModal.totalQty} pcs, {deleteLotModal.totalArea} sqft). This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button onClick={() => setDeleteLotModal(null)} className="btn-secondary" style={{ minWidth: '90px' }}>
                Cancel
              </button>
              <button onClick={handleConfirmDeleteLot} className="btn-danger" style={{ minWidth: '110px' }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SINGLE ITEM MODAL */}
      {deleteItemModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertCircle size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
              Delete Item from Lot #{deleteItemModal.lotNo}?
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              Delete <strong>{deleteItemModal.veneerType} ({deleteItemModal.qty} pcs, {deleteItemModal.totalArea} sqft)</strong>? The lot total will automatically update.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button onClick={() => setDeleteItemModal(null)} className="btn-secondary" style={{ minWidth: '80px' }}>
                Cancel
              </button>
              <button onClick={handleConfirmDeleteItem} className="btn-danger" style={{ minWidth: '100px' }}>
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
