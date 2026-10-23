import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { apiRequest } from './api';

const CHEMICAL_PRODUCTS = [
  'Ammonium Chloride',
  'BIO ADDITIVE',
  'Borex Powder',
  'Boric Acid',
  'Chromic Acid',
  'Copper Sulphate',
  'CROSS LINKER FOR BIO ADHESIVE',
  'FRM 222',
  'FRM 333',
  'Gaur Gum Powder',
  'Gurgen',
  'HOT MELT ADHESIVE (SUPER MELT 122U)',
  'IN 1462 - PH Booster',
  'Janata Putty MD',
  'LR CHEMICAL',
  'MPU999-MEMBRANE DOOR RESIN',
  'NKS-5',
  'Polymate 666 (Mixed Tannin)',
  'Polymate 888 (Booster Additive)',
  'PVC Foil MD',
  'Repairing Plastic MD',
  'Resin White MD',
  'Sodium Dichromate',
  'SPCP POWDER',
  'Super-X For MPF Resin',
  'V-COL 25',
  'V-COL 25 B'
];

const CHEMICAL_UNITS = ['kg', 'gm', 'ltr', 'Pcs', 'Nos', 'Bags', 'Drums', 'Bottles'];

export default function ChemicalEntryScreen({ user }) {
  const [lotNo, setLotNo] = useState('');
  const [lotNotes, setLotNotes] = useState('');
  const [lotStatus, setLotStatus] = useState(null);

  const [productName, setProductName] = useState(CHEMICAL_PRODUCTS[0]);
  const [unit, setUnit] = useState('kg');
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');

  // Search filter
  const [search, setSearch] = useState('');

  // Staged
  const [lotItems, setLotItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleCheckLot = async () => {
    if (!lotNo.trim()) return;
    try {
      setLotStatus('checking');
      const res = await apiRequest(`/chemical-entry/check-lot/${encodeURIComponent(lotNo.trim())}`);
      setLotStatus(res.exists ? 'duplicate' : 'available');
    } catch (e) {
      setLotStatus(null);
    }
  };

  const handleAddItem = () => {
    if (!lotNo.trim()) {
      Alert.alert('Required', 'Please enter a Lot No. first.');
      return;
    }
    if (lotStatus === 'duplicate') {
      Alert.alert('Duplicate Lot', 'This Lot No. already exists.');
      return;
    }
    const parsedQty = parseFloat(qty);
    if (!parsedQty || parsedQty <= 0) {
      Alert.alert('Required', 'Please enter a valid quantity.');
      return;
    }

    const newItem = {
      productName,
      unit,
      qty: parsedQty,
      remarks: remarks.trim() || null
    };

    setLotItems([...lotItems, newItem]);
    Alert.alert('Added', `${parsedQty} ${unit} of ${productName} added.`);
    setQty('');
    setRemarks('');
  };

  const handleFinalSubmit = async () => {
    if (!lotNo.trim() || lotItems.length === 0) {
      Alert.alert('Cannot Submit', 'Please enter a Lot No. and add at least one line item.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/chemical-entry/submit-lot', {
        method: 'POST',
        body: JSON.stringify({
          lotNo: lotNo.trim(),
          notes: lotNotes.trim(),
          items: lotItems
        })
      });

      Alert.alert('Success!', `Chemical Lot #${res.lotNo} submitted with ${res.itemCount} items.`);
      setLotNo('');
      setLotNotes('');
      setLotItems([]);
      setLotStatus(null);
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit chemical lot');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = CHEMICAL_PRODUCTS.filter(p => p.toLowerCase().includes(search.toLowerCase()));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Chemical Lot Header</Text>
        <Text style={styles.label}>Lot No. * (Manual)</Text>
        <TextInput
          style={[styles.input, lotStatus === 'duplicate' && styles.inputError, lotStatus === 'available' && styles.inputSuccess]}
          placeholder="e.g. CHEM-LOT-001"
          placeholderTextColor="#94a3b8"
          value={lotNo}
          onChangeText={t => { setLotNo(t); setLotStatus(null); }}
          onBlur={handleCheckLot}
        />
        {lotStatus === 'duplicate' && <Text style={styles.errorText}>⚠ Lot No. already exists in database!</Text>}
        {lotStatus === 'available' && <Text style={styles.successText}>✓ Lot No. is available</Text>}

        <Text style={[styles.label, { marginTop: 10 }]}>Batch Remarks (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Supplier, delivery note, etc."
          placeholderTextColor="#94a3b8"
          value={lotNotes}
          onChangeText={setLotNotes}
        />
      </View>

      {/* Specifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Select Chemical Product</Text>
        
        {/* Selected banner */}
        <View style={styles.selectedBanner}>
          <Text style={styles.selectedLabel}>Selected:</Text>
          <Text style={styles.selectedValue}>{productName}</Text>
        </View>

        {/* Quick Search */}
        <TextInput
          style={[styles.input, { marginBottom: 8 }]}
          placeholder="🔍 Search chemical name..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />

        {/* Horizontal scroll list of products */}
        <ScrollView style={styles.productList} nestedScrollEnabled>
          {filtered.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.productItem, productName === p && styles.productItemActive]}
              onPress={() => setProductName(p)}
            >
              <Text style={[styles.productItemText, productName === p && styles.productItemTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Unit Selector */}
        <Text style={[styles.label, { marginTop: 12 }]}>Unit</Text>
        <View style={styles.chipRow}>
          {CHEMICAL_UNITS.map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.chipSmall, unit === u && styles.chipActive]}
              onPress={() => setUnit(u)}
            >
              <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Qty & Remarks */}
        <Text style={[styles.label, { marginTop: 12 }]}>Quantity ({unit}) *</Text>
        <TextInput
          style={[styles.input, { fontWeight: '700', fontSize: 16 }]}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#94a3b8"
          value={qty}
          onChangeText={setQty}
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Remarks (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Batch expiry, tank number, etc."
          placeholderTextColor="#94a3b8"
          value={remarks}
          onChangeText={setRemarks}
        />

        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
          <Text style={styles.addBtnText}>+ Add to Chemical Lot</Text>
        </TouchableOpacity>
      </View>

      {/* Staged Items */}
      <View style={styles.card}>
        <View style={styles.stagedHeader}>
          <Text style={styles.cardTitle}>3. Staged Breakdown ({lotItems.length})</Text>
        </View>

        {lotItems.length === 0 ? (
          <Text style={styles.emptyNote}>No chemical items staged yet.</Text>
        ) : (
          lotItems.map((item, index) => (
            <View key={index} style={styles.stagedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stagedTitle}>{item.productName}</Text>
                {item.remarks ? <Text style={styles.stagedSub}>{item.remarks}</Text> : null}
              </View>
              <Text style={styles.stagedQty}>{item.qty} {item.unit}</Text>
            </View>
          ))
        )}

        {lotItems.length > 0 && (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleFinalSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Final Submit Lot ({lotItems.length} items)</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff'
  },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  inputSuccess: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  errorText: { color: '#dc2626', fontSize: 11, marginTop: 4, fontWeight: '600' },
  successText: { color: '#059669', fontSize: 11, marginTop: 4, fontWeight: '600' },
  selectedBanner: {
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 10
  },
  selectedLabel: { fontSize: 11, color: '#047857', fontWeight: '600' },
  selectedValue: { fontSize: 14, color: '#065f46', fontWeight: '800', marginTop: 2 },
  productList: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc'
  },
  productItem: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  productItemActive: {
    backgroundColor: '#10b981'
  },
  productItemText: {
    fontSize: 13,
    color: '#1e293b'
  },
  productItemTextActive: {
    color: '#ffffff',
    fontWeight: '700'
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  chipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981'
  },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },
  addBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14
  },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  stagedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  emptyNote: { fontSize: 12, color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },
  stagedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  stagedTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  stagedSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  stagedQty: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14
  },
  submitBtnDisabled: { backgroundColor: '#6ee7b7' },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' }
});
