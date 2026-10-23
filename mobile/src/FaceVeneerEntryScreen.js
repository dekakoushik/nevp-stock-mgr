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

const FACE_VENEER_TYPES = [
  'Recon Face',
  'Film Face',
  'Gurjan Face',
  'Okoume Face'
];

export default function FaceVeneerEntryScreen({ user }) {
  const [lotNo, setLotNo] = useState('');
  const [lotNotes, setLotNotes] = useState('');
  const [lotStatus, setLotStatus] = useState(null);

  const [veneerType, setVeneerType] = useState(FACE_VENEER_TYPES[0]);
  const [lengthFt, setLengthFt] = useState('');
  const [widthFt, setWidthFt] = useState('');
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');

  const [lotItems, setLotItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Auto Area calculation (Length ft * Width ft * Qty pcs)
  const l = parseFloat(lengthFt) || 0;
  const w = parseFloat(widthFt) || 0;
  const q = parseInt(qty, 10) || 0;
  const liveArea = (l > 0 && w > 0 && q > 0)
    ? parseFloat(((l * w) * q).toFixed(2))
    : 0;

  const handleCheckLot = async () => {
    if (!lotNo.trim()) return;
    try {
      setLotStatus('checking');
      const res = await apiRequest(`/face-veneer-entry/check-lot/${encodeURIComponent(lotNo.trim())}`);
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
    if (!lengthFt || !widthFt) {
      Alert.alert('Required', 'Please enter length and width in feet.');
      return;
    }
    if (!qty || parseInt(qty, 10) <= 0) {
      Alert.alert('Required', 'Please enter quantity in pieces.');
      return;
    }

    const newItem = {
      veneerType,
      lengthFt: parseFloat(lengthFt),
      widthFt: parseFloat(widthFt),
      qty: parseInt(qty, 10),
      totalArea: liveArea,
      remarks: remarks.trim() || null
    };

    setLotItems([...lotItems, newItem]);
    Alert.alert('Added', `${qty} pcs (${liveArea} sqft) added to lot.`);

    setLengthFt('');
    setWidthFt('');
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
      const res = await apiRequest('/face-veneer-entry/submit-lot', {
        method: 'POST',
        body: JSON.stringify({
          lotNo: lotNo.trim(),
          notes: lotNotes.trim(),
          items: lotItems
        })
      });

      Alert.alert('Success!', `Face Veneer Lot #${res.lotNo} submitted with ${res.itemCount} items (${res.totalQty} pcs, ${res.totalArea} sqft).`);
      setLotNo('');
      setLotNotes('');
      setLotItems([]);
      setLotStatus(null);
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit face veneer lot');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPieces = lotItems.reduce((acc, it) => acc + it.qty, 0);
  const totalArea = parseFloat(lotItems.reduce((acc, it) => acc + it.totalArea, 0).toFixed(2));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Face Veneer Lot Header</Text>
        <Text style={styles.label}>Lot No. * (Manual)</Text>
        <TextInput
          style={[styles.input, lotStatus === 'duplicate' && styles.inputError, lotStatus === 'available' && styles.inputSuccess]}
          placeholder="e.g. FACE-LOT-001"
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
          placeholder="Splicing batch, log grade, etc."
          placeholderTextColor="#94a3b8"
          value={lotNotes}
          onChangeText={setLotNotes}
        />
      </View>

      {/* Specifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Item Specifications</Text>

        <Text style={styles.label}>Face Veneer Type</Text>
        <View style={styles.chipRow}>
          {FACE_VENEER_TYPES.map(vt => (
            <TouchableOpacity
              key={vt}
              style={[styles.chip, veneerType === vt && styles.chipActive]}
              onPress={() => setVeneerType(vt)}
            >
              <Text style={[styles.chipText, veneerType === vt && styles.chipTextActive]}>{vt}</Text>
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
            <Text style={styles.label}>Width (ft) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="4"
              placeholderTextColor="#94a3b8"
              value={widthFt}
              onChangeText={setWidthFt}
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

        {/* Live Area Box */}
        <View style={styles.areaBox}>
          <Text style={styles.areaLabel}>Auto Computed Total Area:</Text>
          <Text style={styles.areaValue}>{liveArea} sqft</Text>
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Remarks (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Grain, bundle identifier, defect note"
          placeholderTextColor="#94a3b8"
          value={remarks}
          onChangeText={setRemarks}
        />

        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
          <Text style={styles.addBtnText}>+ Add to Face Veneer Lot</Text>
        </TouchableOpacity>
      </View>

      {/* Staged */}
      <View style={styles.card}>
        <View style={styles.stagedHeader}>
          <Text style={styles.cardTitle}>3. Staged Items ({lotItems.length})</Text>
          <Text style={styles.totalBadge}>{totalPieces} pcs | {totalArea} sqft</Text>
        </View>

        {lotItems.length === 0 ? (
          <Text style={styles.emptyNote}>No face veneer sheets staged yet.</Text>
        ) : (
          lotItems.map((item, index) => (
            <View key={index} style={styles.stagedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stagedTitle}>{item.veneerType}</Text>
                <Text style={styles.stagedSub}>
                  {item.lengthFt}ft × {item.widthFt}ft {item.remarks ? ` | ${item.remarks}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.stagedQty}>{item.qty} pcs</Text>
                <Text style={styles.stagedArea}>{item.totalArea} sqft</Text>
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
  chipActive: {
    backgroundColor: '#ec4899',
    borderColor: '#ec4899'
  },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },
  dimensionsRow: { flexDirection: 'row', marginTop: 10 },
  areaBox: {
    backgroundColor: '#fdf2f8',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fce7f3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  areaLabel: { fontSize: 12, color: '#9d174d', fontWeight: '600' },
  areaValue: { fontSize: 15, color: '#db2777', fontWeight: '800' },
  addBtn: {
    backgroundColor: '#ec4899',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14
  },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  stagedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalBadge: { fontSize: 12, fontWeight: '700', color: '#db2777', backgroundColor: '#fdf2f8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
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
  stagedQty: { fontSize: 14, fontWeight: '700', color: '#ec4899' },
  stagedArea: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#db2777',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14
  },
  submitBtnDisabled: { backgroundColor: '#fbcfe8' },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' }
});
