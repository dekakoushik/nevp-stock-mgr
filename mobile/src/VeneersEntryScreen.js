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

const VENEER_PRODUCTS = ['Full core', 'half core', 'fali'];
const VENEER_GRADES = [
  'DRY VPT CORE',
  'TAPPING PANEL',
  'DRY WHITE CORE',
  'DRY SHUTTERING CORE COMPOSER',
  'DRY FALI',
  'GREEN FALI'
];
const VENEER_THICKNESSES = ['1.65 mm', '2.5 mm'];
const PACKING_MODES = ['Loose', 'Bundle'];

export default function VeneersEntryScreen({ user }) {
  const [lotNo, setLotNo] = useState('');
  const [lotNotes, setLotNotes] = useState('');
  const [lotStatus, setLotStatus] = useState(null);

  const [productName, setProductName] = useState(VENEER_PRODUCTS[0]);
  const [grade, setGrade] = useState(VENEER_GRADES[0]);
  const [thickness, setThickness] = useState(VENEER_THICKNESSES[0]);
  const [lengthFt, setLengthFt] = useState('');
  const [widthInch, setWidthInch] = useState('');
  const [qty, setQty] = useState('');
  const [packingType, setPackingType] = useState('Loose');
  const [comment, setComment] = useState('');
  const [remarks, setRemarks] = useState('');

  const [lotItems, setLotItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Auto sqft calculation
  const l = parseFloat(lengthFt) || 0;
  const w = parseFloat(widthInch) || 0;
  const q = parseInt(qty, 10) || 0;
  const liveSqft = (l > 0 && w > 0 && q > 0)
    ? parseFloat(((l * (w / 12)) * q).toFixed(2))
    : 0;

  const handleCheckLot = async () => {
    if (!lotNo.trim()) return;
    try {
      setLotStatus('checking');
      const res = await apiRequest(`/veneer-entry/check-lot/${encodeURIComponent(lotNo.trim())}`);
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
    if (!lengthFt || !widthInch) {
      Alert.alert('Required', 'Please enter length (ft) and width (inch).');
      return;
    }
    if (!qty || parseInt(qty, 10) <= 0) {
      Alert.alert('Required', 'Please enter quantity in pieces.');
      return;
    }

    const newItem = {
      productName,
      grade,
      thickness,
      lengthFt: parseFloat(lengthFt),
      widthInch: parseFloat(widthInch),
      qty: parseInt(qty, 10),
      totalSqft: liveSqft,
      packingType,
      comment: comment.trim() || null,
      remarks: remarks.trim() || null
    };

    setLotItems([...lotItems, newItem]);
    Alert.alert('Added', `${qty} pcs (${liveSqft} sqft) added to lot.`);

    setLengthFt('');
    setWidthInch('');
    setQty('');
    setComment('');
    setRemarks('');
  };

  const handleFinalSubmit = async () => {
    if (!lotNo.trim() || lotItems.length === 0) {
      Alert.alert('Cannot Submit', 'Please enter a Lot No. and add at least one line item.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/veneer-entry/submit-lot', {
        method: 'POST',
        body: JSON.stringify({
          lotNo: lotNo.trim(),
          notes: lotNotes.trim(),
          items: lotItems
        })
      });

      Alert.alert('Success!', `Veneer Lot #${res.lotNo} submitted with ${res.itemCount} items (${res.totalQty} pcs, ${res.totalSqft} sqft).`);
      setLotNo('');
      setLotNotes('');
      setLotItems([]);
      setLotStatus(null);
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit veneer lot');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPieces = lotItems.reduce((acc, it) => acc + it.qty, 0);
  const totalSqft = parseFloat(lotItems.reduce((acc, it) => acc + it.totalSqft, 0).toFixed(2));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Veneers Lot Header</Text>
        <Text style={styles.label}>Lot No. * (Manual)</Text>
        <TextInput
          style={[styles.input, lotStatus === 'duplicate' && styles.inputError, lotStatus === 'available' && styles.inputSuccess]}
          placeholder="e.g. VEN-LOT-001"
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
          placeholder="Log batch, peeling line, etc."
          placeholderTextColor="#94a3b8"
          value={lotNotes}
          onChangeText={setLotNotes}
        />
      </View>

      {/* Specifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Veneer Specifications</Text>

        <Text style={styles.label}>Product Type</Text>
        <View style={styles.chipRow}>
          {VENEER_PRODUCTS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, productName === p && styles.chipActive]}
              onPress={() => setProductName(p)}
            >
              <Text style={[styles.chipText, productName === p && styles.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Grade</Text>
        <View style={styles.chipRow}>
          {VENEER_GRADES.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.chipSmall, grade === g && styles.chipActive]}
              onPress={() => setGrade(g)}
            >
              <Text style={[styles.chipText, grade === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Thickness</Text>
        <View style={styles.chipRow}>
          {VENEER_THICKNESSES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chipSmall, thickness === t && styles.chipActive]}
              onPress={() => setThickness(t)}
            >
              <Text style={[styles.chipText, thickness === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Packing Mode</Text>
        <View style={styles.chipRow}>
          {PACKING_MODES.map(pk => (
            <TouchableOpacity
              key={pk}
              style={[styles.chipSmall, packingType === pk && styles.chipActive]}
              onPress={() => setPackingType(pk)}
            >
              <Text style={[styles.chipText, packingType === pk && styles.chipTextActive]}>{pk}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dimensionsRow}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={styles.label}>Length (ft) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="8"
              placeholderTextColor="#94a3b8"
              value={lengthFt}
              onChangeText={setLengthFt}
            />
          </View>
          <View style={{ flex: 1, marginHorizontal: 3 }}>
            <Text style={styles.label}>Width (inch) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor="#94a3b8"
              value={widthInch}
              onChangeText={setWidthInch}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.label}>Qty (pcs) *</Text>
            <TextInput
              style={[styles.input, { fontWeight: '700' }]}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94a3b8"
              value={qty}
              onChangeText={setQty}
            />
          </View>
        </View>

        {/* Live Sqft Box */}
        <View style={styles.sqftBox}>
          <Text style={styles.sqftLabel}>Auto Computed Square Feet:</Text>
          <Text style={styles.sqftValue}>{liveSqft} sqft</Text>
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Comment (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Defect, stack note, etc."
          placeholderTextColor="#94a3b8"
          value={comment}
          onChangeText={setComment}
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Remarks (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Moisture, bundle ID"
          placeholderTextColor="#94a3b8"
          value={remarks}
          onChangeText={setRemarks}
        />

        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
          <Text style={styles.addBtnText}>+ Add to Veneer Lot</Text>
        </TouchableOpacity>
      </View>

      {/* Staged */}
      <View style={styles.card}>
        <View style={styles.stagedHeader}>
          <Text style={styles.cardTitle}>3. Staged Items ({lotItems.length})</Text>
          <Text style={styles.totalBadge}>{totalPieces} pcs | {totalSqft} sqft</Text>
        </View>

        {lotItems.length === 0 ? (
          <Text style={styles.emptyNote}>No veneer items staged yet.</Text>
        ) : (
          lotItems.map((item, index) => (
            <View key={index} style={styles.stagedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stagedTitle}>{item.productName} • {item.grade}</Text>
                <Text style={styles.stagedSub}>
                  {item.lengthFt}ft × {item.widthInch}in | {item.thickness} | {item.packingType}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.stagedQty}>{item.qty} pcs</Text>
                <Text style={styles.stagedSqft}>{item.totalSqft} sqft</Text>
              </View>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  chipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b'
  },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },
  dimensionsRow: { flexDirection: 'row', marginTop: 10 },
  sqftBox: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sqftLabel: { fontSize: 12, color: '#92400e', fontWeight: '600' },
  sqftValue: { fontSize: 15, color: '#b45309', fontWeight: '800' },
  addBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14
  },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  stagedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalBadge: { fontSize: 12, fontWeight: '700', color: '#b45309', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
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
  stagedQty: { fontSize: 14, fontWeight: '700', color: '#f59e0b' },
  stagedSqft: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#d97706',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14
  },
  submitBtnDisabled: { backgroundColor: '#fde68a' },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' }
});
