import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, Plus, Trash2, CheckCircle2, AlertCircle, 
  Send, RefreshCw, Layers, Hash, Sparkles, Check, ChevronDown, Search,
  Edit2, Eye, X, FileSpreadsheet, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiRequest } from './api';

// Design codes list for Membrane
const MEMBRANE_DESIGN_CODES = [
  'PMD-01','PMD-02','PMD-03','PMD-04','PMD-05','PMD-06','PMD-07','PMD-08','PMD-09','PMD-10',
  'PMD-11','PMD-12','PMD-13','PMD-14','PMD-15','PMD-16','PMD-17','PMD-18','PMD-19','PMD-20',
  'PMD-21','PMD-22','PMD-23','PMD-24','PMD-25','PMD-26','PMD-27','PMD-28','PMD-29','PMD-30',
  'PMD-31','PMD-32','PMD-33','PMD-34','PMD-35','PMD-36','PMD-37','PMD-38','PMD-39','PMD-40',
  'PMD-41','PMD-42','PMD-43','PMD-44','PMD-45',
  'PMD-PVC-1001','PMD-PVC-1002','PMD-PVC-1003','PMD-PVC-1004','PMD-PVC-1005','PMD-PVC-1006'
];

// Shuttering Brands list
const SHUTTERING_BRANDS = [
  'Ply Story Ultra', 'Ply Story Platinum', 'Ply Story Ultra Plus', 'Everest',
  'Chequered', 'Plain', 'Protocore', 'Sikta', 'Sashakt', 'Qmax',
  'Ajaran Platinum', 'Duborg', 'Balaji', 'Quantum', 'Plystory Gold', 'JD',
  'Everun', 'Hydrotech', 'MGH', 'Quest Gold', 'Alphen', 'Arious',
  'Qcraft', 'Royal Platinum', 'Powerplex Gold', 'Element-O Gold', 'Alkane',
  'Akane', 'Ajaran', 'Element-O', 'Powerplex', 'Luan Ply', 'Suprimos Gold',
  'Black Karban', 'Build Core', 'Vangaurd', 'Royal Gold', 'Bhutan Dralha',
  'Mayank', 'Plystory Tres', 'Bira Gold', 'Orvyn'
];

// Shuttering Weights list
const SHUTTERING_WEIGHTS = ['25', '30', '32', '34', '45', '52'];

export default function FinishedGoodsEntry({ user, showToast }) {
  // Lot Header state
  const [lotNo, setLotNo] = useState('');
  const [lotNotes, setLotNotes] = useState('');
  const [lotStatus, setLotStatus] = useState(null); // 'checking' | 'available' | 'duplicate' | null
  const [lotError, setLotError] = useState('');

  // Item Form states
  const [product, setProduct] = useState('Plywood');
  const [grade, setGrade] = useState('A');
  const [glue, setGlue] = useState('PF');
  const [face, setFace] = useState('okume');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [thickness, setThickness] = useState('');
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');

  // Conditional fields
  const [frame, setFrame] = useState('H/W');
  const [filler, setFiller] = useState('H/W');
  const [designCode, setDesignCode] = useState('');
  const [colour, setColour] = useState('Rose wood');
  const [brand, setBrand] = useState('Ply Story Ultra');
  const [weightKg, setWeightKg] = useState('25');

  // Searchable Design Code dropdown state
  const [designSearch, setDesignSearch] = useState('');
  const [isDesignOpen, setIsDesignOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Searchable Shuttering Brand dropdown state
  const [brandSearch, setBrandSearch] = useState('');
  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const brandDropdownRef = useRef(null);

  // Staged Lot Items
  const [lotItems, setLotItems] = useState([]);
  const [submittingLot, setSubmittingLot] = useState(false);
  const [recentLots, setRecentLots] = useState([]);
  const [submittedLotSuccess, setSubmittedLotSuccess] = useState(null);

  // Edit / Delete / View Modal states for Superadmin and Admin
  const [selectedLotForItems, setSelectedLotForItems] = useState(null); // { id, lotNo, items: [] }
  const [loadingLotItems, setLoadingLotItems] = useState(false);
  const [editLotModal, setEditLotModal] = useState(null); // { id, lotNo, notes }
  const [editItemModal, setEditItemModal] = useState(null); // item object being edited
  const [deleteLotModal, setDeleteLotModal] = useState(null); // lot to delete
  const [deleteItemModal, setDeleteItemModal] = useState(null); // item to delete

  const canManage = user?.role === 'superadmin' || user?.role === 'admin';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDesignOpen(false);
      }
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target)) {
        setIsBrandOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadRecentLots = async () => {
    try {
      const data = await apiRequest('/finished-goods/lots');
      setRecentLots(data.lots || []);
    } catch (e) {
      console.error('Failed to load recent lots', e);
    }
  };

  useEffect(() => {
    loadRecentLots();
  }, []);

  // View items for a registered lot
  const handleViewLotItems = async (lot) => {
    try {
      setLoadingLotItems(true);
      const data = await apiRequest(`/finished-goods/lots/${lot.id}/items`);
      setSelectedLotForItems({ ...lot, items: data.items || [] });
    } catch (err) {
      showToast(err.message || 'Failed to load lot items', 'error');
    } finally {
      setLoadingLotItems(false);
    }
  };

  // Delete an entire lot
  const handleConfirmDeleteLot = async () => {
    if (!deleteLotModal) return;
    try {
      const res = await apiRequest(`/finished-goods/lots/${deleteLotModal.id}`, {
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

  // Update lot header details
  const handleSaveLotEdit = async (e) => {
    e.preventDefault();
    if (!editLotModal) return;
    try {
      const res = await apiRequest(`/finished-goods/lots/${editLotModal.id}`, {
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

  // Update a single line item
  const handleSaveItemEdit = async (e) => {
    e.preventDefault();
    if (!editItemModal) return;
    try {
      const res = await apiRequest(`/finished-goods/items/${editItemModal.id}`, {
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

  // Delete a single line item
  const handleConfirmDeleteItem = async () => {
    if (!deleteItemModal) return;
    try {
      const res = await apiRequest(`/finished-goods/items/${deleteItemModal.id}`, {
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

  // Export Finished Goods Report to Excel (Superadmin & Admin)
  const [exportingExcel, setExportingExcel] = useState(false);
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const res = await apiRequest('/finished-goods/export-report');
      const data = res.report || [];

      if (data.length === 0) {
        showToast('No finished goods records found to export.', 'error');
        setExportingExcel(false);
        return;
      }

      // Format clean data for Excel
      const excelRows = data.map((r, idx) => ({
        'SL No': idx + 1,
        'Lot No': r.lotNo,
        'Date Registered': new Date(r.lotDate).toLocaleDateString(),
        'Time Registered': new Date(r.lotDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        'Operator': r.enteredBy,
        'Product': r.productType,
        'Grade': r.grade,
        'Glue': r.glue,
        'Face': r.face || '-',
        'Length': r.length ? `${r.length} ${r.dimensionUnit}` : '-',
        'Width': r.width ? `${r.width} ${r.dimensionUnit}` : '-',
        'Thickness (mm)': r.thickness || '-',
        'Quantity (pcs)': r.qty,
        'Frame': r.frame || '-',
        'Filler': r.filler || '-',
        'Design Code': r.designCode || '-',
        'Colour': r.colour || '-',
        'Brand': r.brand || '-',
        'Weight (KG)': r.weightKg ? `${r.weightKg} KG` : '-',
        'Item Remarks': r.remarks || '-',
        'Lot Batch Notes': r.lotBatchNotes || '-'
      }));

      // Create Worksheet & Workbook
      const ws = XLSX.utils.json_to_sheet(excelRows);

      // Auto-fit column widths
      const colWidths = Object.keys(excelRows[0] || {}).map(key => ({
        wch: Math.max(key.length, 12)
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Finished Goods Report');

      // Generate date-stamped filename
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `NEVP_Finished_Goods_Report_${dateStr}.xlsx`);

      showToast(`Exported ${excelRows.length} finished goods records to Excel!`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast(err.message || 'Failed to export Excel report', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  // Set default fixed dimensions for shuttering
  useEffect(() => {
    if (product === 'shuttering') {
      setLength('8');
      setWidth('4');
    }
    if (product === 'membrane') {
      setFiller('P/C');
      if (!designCode) setDesignCode('PMD-01');
    } else if (product === 'blockboard' || product === 'flushdoor') {
      setFiller('H/W');
    }
  }, [product]);

  // Check duplicate Lot No on blur
  const handleCheckLotNo = async (val) => {
    const trimmed = (val !== undefined ? val : lotNo).trim();
    if (!trimmed) {
      setLotStatus(null);
      setLotError('');
      return;
    }

    try {
      setLotStatus('checking');
      const res = await apiRequest(`/finished-goods/check-lot/${encodeURIComponent(trimmed)}`);
      if (res.exists) {
        setLotStatus('duplicate');
        setLotError(`Lot No. "${trimmed}" already exists in records! Duplicate lot entry is restricted.`);
      } else {
        setLotStatus('available');
        setLotError('');
      }
    } catch (err) {
      setLotStatus(null);
    }
  };

  // Add Item to Current Staged Lot
  const handleAddToLot = (e) => {
    e.preventDefault();

    if (!lotNo.trim()) {
      showToast('Please enter a Lot No. first', 'error');
      return;
    }

    if (lotStatus === 'duplicate') {
      showToast('Cannot add items to a duplicate Lot No. Change Lot No. first.', 'error');
      return;
    }

    const parsedQty = parseInt(qty, 10);
    if (!parsedQty || parsedQty <= 0) {
      showToast('Please enter a valid positive Quantity (pcs)', 'error');
      return;
    }

    // Determine dimensions & unit
    let itemLength = length;
    let itemWidth = width;
    let dimensionUnit = 'ft';

    if (product === 'flushdoor' || product === 'membrane') {
      dimensionUnit = 'inch';
    } else if (product === 'shuttering') {
      itemLength = '8';
      itemWidth = '4';
      dimensionUnit = 'ft';
    }

    if (!itemLength || !itemWidth) {
      showToast(`Length and Width are required (${dimensionUnit})`, 'error');
      return;
    }

    if (product !== 'shuttering' && !thickness) {
      showToast('Thickness (mm) is required', 'error');
      return;
    }

    if (product === 'membrane' && !designCode) {
      showToast('Please select a valid Design Code for Membrane', 'error');
      return;
    }

    // Check for identical duplicate item already in this lot to prevent accidental double clicks
    const isDuplicateItem = lotItems.some(it => 
      it.productType === product &&
      it.grade === grade &&
      it.glue === glue &&
      it.face === (product === 'shuttering' ? null : face) &&
      String(it.length) === String(itemLength) &&
      String(it.width) === String(itemWidth) &&
      String(it.thickness || '') === String(product === 'shuttering' ? '' : thickness) &&
      String(it.qty) === String(parsedQty) &&
      String(it.frame || '') === String((product === 'blockboard' || product === 'flushdoor' || product === 'membrane') ? frame : '') &&
      String(it.filler || '') === String((product === 'blockboard' || product === 'flushdoor' || product === 'membrane') ? filler : '') &&
      String(it.designCode || '') === String(product === 'membrane' ? designCode : '') &&
      String(it.colour || '') === String(product === 'membrane' ? colour : '') &&
      String(it.brand || '') === String(product === 'shuttering' ? brand : '') &&
      String(it.weightKg || '') === String(product === 'shuttering' ? weightKg : '')
    );

    if (isDuplicateItem) {
      const confirmAdd = window.confirm(`An identical entry for ${product} (${parsedQty} pcs, ${itemLength}×${itemWidth}) already exists in this lot. Do you really want to add another identical line item?`);
      if (!confirmAdd) return;
    }

    const newItem = {
      productType: product,
      grade,
      glue,
      face: product === 'shuttering' ? null : face,
      length: itemLength,
      width: itemWidth,
      dimensionUnit,
      thickness: product === 'shuttering' ? null : thickness,
      qty: parsedQty,
      remarks: remarks.trim(),
      frame: (product === 'blockboard' || product === 'flushdoor' || product === 'membrane') ? frame : null,
      filler: (product === 'blockboard' || product === 'flushdoor' || product === 'membrane') ? filler : null,
      designCode: product === 'membrane' ? designCode : null,
      colour: product === 'membrane' ? colour : null,
      brand: product === 'shuttering' ? brand : null,
      weightKg: product === 'shuttering' ? weightKg : null
    };

    setLotItems([...lotItems, newItem]);
    showToast(`Added ${product} (${parsedQty} pcs) to Lot #${lotNo.trim()}`, 'success');

    // Completely clear item form fields so user doesn't accidentally add the same item again
    setQty('');
    setRemarks('');
    setThickness('');
    if (product !== 'shuttering') {
      setLength('');
      setWidth('');
    }
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
      // Double check lot existence right before commit
      const checkRes = await apiRequest(`/finished-goods/check-lot/${encodeURIComponent(currentLotNo)}`);
      if (checkRes.exists) {
        setLotStatus('duplicate');
        setLotError(`Lot No. "${currentLotNo}" was already submitted by another user. Choose a distinct Lot No.`);
        showToast(`Duplicate Lot No. detected! Submission blocked.`, 'error');
        alert(`Duplicate Lot No. "${currentLotNo}" already exists in the system. Submission blocked.`);
        setSubmittingLot(false);
        return;
      }

      const res = await apiRequest('/finished-goods/submit-lot', {
        method: 'POST',
        body: JSON.stringify({
          lotNo: currentLotNo,
          items: lotItems,
          notes: lotNotes.trim()
        })
      });

      // Show persistent success banner & alert
      setSubmittedLotSuccess({
        lotNo: currentLotNo,
        itemCount: lotItems.length,
        totalQty: res.totalQty || totalLotPieces,
        time: new Date().toLocaleTimeString()
      });

      showToast(`Success: Lot #${currentLotNo} with ${lotItems.length} items (${res.totalQty || totalLotPieces} pcs total) permanently registered!`, 'success');

      // Clear full lot form after successful submission
      setLotNo('');
      setLotNotes('');
      setLotItems([]);
      setLotStatus(null);
      setLotError('');
      setQty('');
      setRemarks('');
      setThickness('');
      if (product !== 'shuttering') {
        setLength('');
        setWidth('');
      }

      // Reload recent lots list
      loadRecentLots();

      // Scroll to top to see confirmation
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission error:', err);
      showToast(err.message || 'Submission failed', 'error');
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingLot(false);
    }
  };

  const filteredDesigns = MEMBRANE_DESIGN_CODES.filter(d => 
    d.toLowerCase().includes(designSearch.toLowerCase())
  );

  const totalLotPieces = lotItems.reduce((acc, it) => acc + it.qty, 0);

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
                Committed {submittedLotSuccess.itemCount} items with a total of {submittedLotSuccess.totalQty} pieces to inventory at {submittedLotSuccess.time}.
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

      {/* LOT HEADER SECTION (Not auto generated, strict uniqueness) */}
      <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash size={18} color="#2563eb" /> Finished Goods - Lot Master Entry
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
              Enter manual Lot No., stage item details, and commit the complete lot to inventory.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', background: '#eff6ff', color: '#1e40af', padding: '0.35rem 0.75rem', borderRadius: '6px', fontWeight: '600' }}>
              Lot Items: {lotItems.length} | Total Pcs: {totalLotPieces}
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
                placeholder="e.g. LOT-2026-008"
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
              placeholder="e.g. Morning pressing batch - Press Line #2"
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
          <Package size={17} color="#2563eb" /> Item Specifications & Dynamic Attributes
        </h3>

        <form onSubmit={handleAddToLot} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Row 1: Product, Grade, Glue, Face */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            
            {/* Product List */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                Product Type <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="form-input"
                style={{ fontWeight: '600' }}
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              >
                <option value="Plywood">Plywood</option>
                <option value="blockboard">Blockboard</option>
                <option value="flushdoor">Flushdoor</option>
                <option value="membrane">Membrane</option>
                <option value="shuttering">Shuttering</option>
              </select>
            </div>

            {/* Grade */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                Grade <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="form-input"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="STP">STP</option>
                <option value="Rejected">Rejected</option>
                <option value="Repairable">Repairable</option>
              </select>
            </div>

            {/* Glue */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                Glue <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                className="form-input"
                value={glue}
                onChange={(e) => setGlue(e.target.value)}
              >
                <option value="PF">PF (Phenol Formaldehyde)</option>
                <option value="MR">MR (Moisture Resistant)</option>
              </select>
            </div>

            {/* Face (Not required for shuttering) */}
            {product !== 'shuttering' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Face
                </label>
                <select
                  className="form-input"
                  value={face}
                  onChange={(e) => setFace(e.target.value)}
                >
                  <option value="okume">Okume</option>
                  <option value="gurjan">Gurjan</option>
                  <option value="recon">Recon</option>
                </select>
              </div>
            )}

          </div>

          {/* CONDITIONAL SPECIFICATIONS SECTION */}
          
          {/* CASE A: Blockboard or Flushdoor (Frame & Filler) */}
          {(product === 'blockboard' || product === 'flushdoor') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Frame (H/W, Pine)
                </label>
                <select
                  className="form-input"
                  value={frame}
                  onChange={(e) => setFrame(e.target.value)}
                >
                  <option value="H/W">H/W (Hardwood)</option>
                  <option value="Pine">Pine</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Filler (H/W, Pine)
                </label>
                <select
                  className="form-input"
                  value={filler}
                  onChange={(e) => setFiller(e.target.value)}
                >
                  <option value="H/W">H/W (Hardwood)</option>
                  <option value="Pine">Pine</option>
                </select>
              </div>
            </div>
          )}

          {/* CASE B: Membrane (Design code searchable dropdown, Colour, Frame, Filler P/C or RC) */}
          {product === 'membrane' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', background: '#fdf4ff', padding: '1rem', borderRadius: '8px', border: '1px solid #f5d0fe' }}>
              
              {/* Searchable Design Code */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#701a75', marginBottom: '0.35rem' }}>
                  Design Code (Searchable) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div 
                  onClick={() => setIsDesignOpen(!isDesignOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                    {designCode || 'Select Design Code...'}
                  </span>
                  <ChevronDown size={16} color="#64748b" />
                </div>

                {isDesignOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 200,
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    marginTop: '4px',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#ffffff' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="text"
                          placeholder="Search PMD code..."
                          className="form-input"
                          style={{ paddingLeft: '1.8rem', padding: '0.4rem 0.5rem 0.4rem 1.8rem', fontSize: '0.85rem' }}
                          value={designSearch}
                          onChange={(e) => setDesignSearch(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {filteredDesigns.map((code) => (
                        <div
                          key={code}
                          onClick={() => {
                            setDesignCode(code);
                            setIsDesignOpen(false);
                            setDesignSearch('');
                          }}
                          style={{
                            padding: '0.55rem 0.85rem',
                            fontSize: '0.85rem',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: designCode === code ? '#eff6ff' : 'transparent',
                            color: designCode === code ? '#2563eb' : '#1e293b'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = designCode === code ? '#eff6ff' : 'transparent'}
                        >
                          <span>{code}</span>
                          {designCode === code && <Check size={14} color="#2563eb" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Membrane Colour */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#701a75', marginBottom: '0.35rem' }}>
                  Colour
                </label>
                <select
                  className="form-input"
                  value={colour}
                  onChange={(e) => setColour(e.target.value)}
                >
                  <option value="Rose wood">Rose wood</option>
                  <option value="Andra Teak">Andra Teak</option>
                </select>
              </div>

              {/* Membrane Frame */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#701a75', marginBottom: '0.35rem' }}>
                  Frame (H/W, Pine)
                </label>
                <select
                  className="form-input"
                  value={frame}
                  onChange={(e) => setFrame(e.target.value)}
                >
                  <option value="H/W">H/W (Hardwood)</option>
                  <option value="Pine">Pine</option>
                </select>
              </div>

              {/* Membrane Filler (P/C, RC) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#701a75', marginBottom: '0.35rem' }}>
                  Filler (P/C, RC)
                </label>
                <select
                  className="form-input"
                  value={filler}
                  onChange={(e) => setFiller(e.target.value)}
                >
                  <option value="P/C">P/C</option>
                  <option value="RC">RC</option>
                </select>
              </div>

            </div>
          )}

          {/* CASE C: Shuttering (Searchable Brand, Weight 25-52 kg, Fixed Length 8 & Width 4 ft, No frame/filler/thickness) */}
          {product === 'shuttering' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: '#ecfdf5', padding: '1rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              
              {/* Searchable Brand Dropdown */}
              <div ref={brandDropdownRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#065f46', marginBottom: '0.35rem' }}>
                  Brand (Searchable) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div 
                  onClick={() => setIsBrandOpen(!isBrandOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>
                    {brand || 'Select Brand...'}
                  </span>
                  <ChevronDown size={16} color="#64748b" />
                </div>

                {isBrandOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 200,
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    marginTop: '4px',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}>
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#ffffff' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="text"
                          placeholder="Search brand name..."
                          className="form-input"
                          style={{ paddingLeft: '1.8rem', padding: '0.4rem 0.5rem 0.4rem 1.8rem', fontSize: '0.85rem' }}
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {SHUTTERING_BRANDS.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase())).map((b) => (
                        <div
                          key={b}
                          onClick={() => {
                            setBrand(b);
                            setIsBrandOpen(false);
                            setBrandSearch('');
                          }}
                          style={{
                            padding: '0.55rem 0.85rem',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: brand === b ? '#ecfdf5' : 'transparent',
                            color: brand === b ? '#065f46' : '#1e293b',
                            fontWeight: brand === b ? '600' : '400'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brand === b ? '#ecfdf5' : 'transparent'}
                        >
                          <span>{b}</span>
                          {brand === b && <Check size={14} color="#059669" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#065f46', marginBottom: '0.35rem' }}>
                  Weight in KG <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  className="form-input"
                  style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                >
                  {SHUTTERING_WEIGHTS.map((w) => (
                    <option key={w} value={w}>{w} KG</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#065f46', background: '#d1fae5', padding: '0.45rem 0.75rem', borderRadius: '6px', fontWeight: '600' }}>
                  Fixed Size: 8 ft × 4 ft (Thickness & Frame/Filler not applicable)
                </span>
              </div>
            </div>
          )}

          {/* Row: Dimensions (Length, Width, Thickness), Qty, Remarks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            
            {/* Length */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                Length ({(product === 'flushdoor' || product === 'membrane') ? 'inch' : 'ft'}) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                disabled={product === 'shuttering'}
                className="form-input"
                placeholder={(product === 'flushdoor' || product === 'membrane') ? 'e.g. 78' : 'e.g. 8'}
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
            </div>

            {/* Width */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                Width ({(product === 'flushdoor' || product === 'membrane') ? 'inch' : 'ft'}) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                disabled={product === 'shuttering'}
                className="form-input"
                placeholder={(product === 'flushdoor' || product === 'membrane') ? 'e.g. 32' : 'e.g. 4'}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>

            {/* Thickness (Not required for shuttering) */}
            {product !== 'shuttering' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Thickness (mm) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  className="form-input"
                  placeholder="e.g. 19, 12, 6"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                />
              </div>
            )}

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
                style={{ fontWeight: '700', fontSize: '1.05rem', color: '#2563eb' }}
                placeholder="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>

          </div>

          {/* Remarks */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
              Item Remarks / Notes
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Customer order mark, calibration notes, or bundle detail"
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

      {/* STAGED LOT ITEMS TABLE (Items ready for Final Submit) */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
              Staged Lot Breakdown {lotNo.trim() && <span style={{ color: '#2563eb' }}>({lotNo.trim()})</span>}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Review staged line items. Final submit writes this lot into persistent database.
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
                <th>Product</th>
                <th>Grade</th>
                <th>Glue</th>
                <th>Face</th>
                <th>Dimensions</th>
                <th>Thickness</th>
                <th>Frame / Filler</th>
                <th>Specifics</th>
                <th style={{ textAlign: 'right' }}>Qty (pcs)</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lotItems.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                    No items staged in this lot yet. Fill the specifications above and click <strong>"Add to Lot"</strong>.
                  </td>
                </tr>
              ) : (
                lotItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '700', color: '#1e293b' }}>{item.productType}</td>
                    <td><span className="badge badge-user">{item.grade}</span></td>
                    <td>{item.glue}</td>
                    <td>{item.face || '-'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {item.length} × {item.width} {item.dimensionUnit}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {item.thickness ? `${item.thickness} mm` : '-'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {item.frame || item.filler ? `${item.frame || '-'}/${item.filler || '-'}` : '-'}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {item.designCode && <div>Code: <strong>{item.designCode}</strong></div>}
                      {item.colour && <div>Col: {item.colour}</div>}
                      {item.brand && <div>Brand: <strong>{item.brand}</strong></div>}
                      {item.weightKg && <div>Wt: {item.weightKg} KG</div>}
                      {!item.designCode && !item.brand && '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#2563eb' }}>
                      {item.qty}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                  <td colSpan="9" style={{ textAlign: 'right', padding: '0.85rem 1rem' }}>
                    Total Quantity in Lot:
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: '#059669' }}>
                    {totalLotPieces} pcs
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* RECENTLY REGISTERED LOTS AUDIT VIEW */}
      {recentLots.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Recently Registered Lots ({recentLots.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Confirmed inventory lots saved in database
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
                  title="Export all Finished Goods records to Excel spreadsheet"
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
                    <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#059669', fontSize: '0.95rem' }}>
                      {l.totalQty} pcs
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
          <div className="modal-content" style={{ maxWidth: '960px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
                  Lot #{selectedLotForItems.lotNo} Details
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
                      <th>Product</th>
                      <th>Grade</th>
                      <th>Glue</th>
                      <th>Face</th>
                      <th>Dimensions</th>
                      <th>Thickness</th>
                      <th>Specifics</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th>Remarks</th>
                      {canManage && <th style={{ textAlign: 'center' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLotForItems.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '700' }}>{it.productType}</td>
                        <td><span className="badge badge-user">{it.grade}</span></td>
                        <td>{it.glue}</td>
                        <td>{it.face || '-'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{it.length} × {it.width} {it.dimensionUnit}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{it.thickness ? `${it.thickness} mm` : '-'}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {it.brand && <div>Brand: <strong>{it.brand}</strong> ({it.weightKg}kg)</div>}
                          {it.designCode && <div>Code: <strong>{it.designCode}</strong> ({it.colour})</div>}
                          {it.frame && <div>F/F: {it.frame}/{it.filler}</div>}
                          {!it.brand && !it.designCode && !it.frame && '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#2563eb' }}>
                          {it.qty}
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
          <div className="modal-content">
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem' }}>
              Edit Lot: <span style={{ color: '#2563eb' }}>#{editLotModal.lotNo}</span>
            </h3>
            <form onSubmit={handleSaveLotEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                  Batch Remarks
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editLotModal.notes || ''}
                  onChange={(e) => setEditLotModal({ ...editLotModal, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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

      {/* DELETE LOT CONFIRM MODAL */}
      {deleteLotModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#b91c1c' }}>
              <AlertCircle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Delete Entire Lot</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to permanently delete <strong>Lot #{deleteLotModal.lotNo}</strong> ({deleteLotModal.itemCount} items, {deleteLotModal.totalQty} pcs)?
              <br/><br/>
              This will remove the lot and all its associated line items permanently from inventory.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setDeleteLotModal(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleConfirmDeleteLot} className="btn-danger" style={{ padding: '0.65rem 1.25rem' }}>
                Delete Lot Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT LINE ITEM MODAL */}
      {editItemModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem' }}>
              Edit Line Item ({editItemModal.productType} in Lot #{editItemModal.lotNo})
            </h3>
            <form onSubmit={handleSaveItemEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.2rem' }}>Grade</label>
                  <select
                    className="form-input"
                    value={editItemModal.grade}
                    onChange={(e) => setEditItemModal({ ...editItemModal, grade: e.target.value })}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="STP">STP</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Repairable">Repairable</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.2rem' }}>Glue</label>
                  <select
                    className="form-input"
                    value={editItemModal.glue}
                    onChange={(e) => setEditItemModal({ ...editItemModal, glue: e.target.value })}
                  >
                    <option value="PF">PF</option>
                    <option value="MR">MR</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.2rem' }}>Qty (pcs) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="form-input"
                    style={{ fontWeight: '700' }}
                    value={editItemModal.qty}
                    onChange={(e) => setEditItemModal({ ...editItemModal, qty: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.2rem' }}>
                    Length ({editItemModal.dimensionUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-input"
                    value={editItemModal.length || ''}
                    onChange={(e) => setEditItemModal({ ...editItemModal, length: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.2rem' }}>
                    Width ({editItemModal.dimensionUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-input"
                    value={editItemModal.width || ''}
                    onChange={(e) => setEditItemModal({ ...editItemModal, width: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.2rem' }}>
                    Thickness (mm)
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={editItemModal.thickness || ''}
                    onChange={(e) => setEditItemModal({ ...editItemModal, thickness: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.2rem' }}>Remarks</label>
                <input
                  type="text"
                  className="form-input"
                  value={editItemModal.remarks || ''}
                  onChange={(e) => setEditItemModal({ ...editItemModal, remarks: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setEditItemModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Item Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE LINE ITEM CONFIRM MODAL */}
      {deleteItemModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#b91c1c' }}>
              <AlertCircle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Delete Line Item</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to delete this line item: <strong>{deleteItemModal.productType} ({deleteItemModal.qty} pcs, {deleteItemModal.length}×{deleteItemModal.width})</strong> from Lot #{deleteItemModal.lotNo}?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setDeleteItemModal(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleConfirmDeleteItem} className="btn-danger" style={{ padding: '0.65rem 1.25rem' }}>
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spinAnim {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spinAnim 0.9s linear infinite;
        }
      `}</style>

    </div>
  );
}
