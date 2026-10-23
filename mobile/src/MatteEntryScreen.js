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

export default function MatteEntryScreen({ user }) {
  const [lotNo, setLotNo] = useState('');
  const [lotNotes, setLotNotes] = useState('');
  const [lotStatus, setLotStatus] = useState(null);

  // Specifications
  const [product, setProduct] = useState('Plywood');
  const [grade, setGrade] = useState('A');
  const [glue, setGlue] = useState('PF');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [thickness, setThickness] = useState('');
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');

  // Frame and Filler
  const [frame, setFrame] = useState('H/W');
  const [filler, setFiller] = useState('H/W');

  // Staged items
  const [lotItems, setLotItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const isInch = product === 'Flushdoor' || product === 'Membrane';
  const unitLabel = isInch ? 'inch' : 'ft';
  const requiresFrame = product === 'Blockboard' || product === 'Flushdoor' || product === 'Membrane';
  const requiresFiller = product === 'Blockboard' || product === 'Flushdoor' || product === 'Membrane';

  const handleCheckLot = async () => {
    if (!lotNo.trim()) return;
    try {
      setLotStatus('checking');
      const res = await apiRequest(`/matte-entry/check-lot/${encodeURIComponent(lotNo.trim())}`);
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
    if (!length || !width) {
      Alert.alert('Required', 'Please enter length and width.');
      return;
    }
    if (!thickness) {
      Alert.alert('Required', 'Please enter thickness in mm.');
      return;
    }
    if (!qty || parseInt(qty, 10) <= 0) {
      Alert.alert('Required', 'Please enter quantity in pieces.');
      return;
    }

    const newItem = {
      productType: product,
      grade,
      glue,
      length: parseFloat(length),
      width: parseFloat(width),
      dimensionUnit: unitLabel,
      thickness: parseFloat(thickness),
      qty: parseInt(qty, 10),
      frame: requiresFrame ? frame : null,
      filler: requiresFiller ? filler : null,
      remarks: remarks.trim() || null
    };

    setLotItems([...lotItems, newItem]);
    Alert.alert('Added', `${qty} pcs added to lot.`);

    setQty('');
    setRemarks('');
    setLength('');
    setWidth('');
    setThickness('');
  };

  const handleFinalSubmit = async () => {
    if (!lotNo.trim() || lotItems.length === 0) {
      Alert.alert('Cannot Submit', 'Please enter a Lot No. and add at least one line item.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/matte-entry/submit-lot', {
        method: 'POST',
        body: JSON.stringify({
          lotNo: lotNo.trim(),
          notes: lotNotes.trim(),
          items: lotItems
        })
      });

      Alert.alert('Success!', `Matte Lot #${res.lotNo} submitted with ${res.itemCount} items (${res.totalQty} pcs).`);
      setLotNo('');
      setLotNotes('');
      setLotItems([]);
      setLotStatus(null);
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit matte lot');
    } finally {
      setSubmitting(false);
    }
  };

  const totalLotPieces = lotItems.reduce((acc, it) => acc + it.qty, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Matte Lot Header</Text>
        <Text style={styles.label}>Lot No. * (Manual)</Text>
        <TextInput
          style={[styles.input, lotStatus === 'duplicate' && styles.inputError, lotStatus === 'available' && styles.inputSuccess]}
          placeholder="e.g. MAT-2026-001"
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
          placeholder="Shift, line operator, etc."
          placeholderTextColor="#94a3b8"
          value={lotNotes}
          onChangeText={setLotNotes}
        />
      </View>

      {/* Specifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Item Specifications</Text>

        <Text style={styles.label}>Product Type</Text>
        <View style={styles.chipRow}>
          {['Plywood', 'Blockboard', 'Flushdoor', 'Membrane'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, product === p && styles.chipActive]}
              onPress={() => {
                setProduct(p);
                if (p === 'Membrane') setFiller('P/C');
                else if (p === 'Blockboard' || p === 'Flushdoor') setFiller('H/W');
              }}
            >
              <Text style={[styles.chipText, product === p && styles.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Grade</Text>
        <View style={styles.chipRow}>
          {['A', 'B', 'STP', 'Rejected', 'Repairable'].map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.chipSmall, grade === g && styles.chipActive]}
              onPress={() => setGrade(g)}
            >
              <Text style={[styles.chipText, grade === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Glue</Text>
        <View style={styles.chipRow}>
          {['PF', 'MR'].map(gl => (
            <TouchableOpacity
              key={gl}
              style={[styles.chipSmall, glue === gl && styles.chipActive]}
              onPress={() => setGlue(gl)}
            >
              <Text style={[styles.chipText, glue === gl && styles.chipTextActive]}>{gl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {requiresFrame && (
          <View style={styles.conditionalBox}>
            <Text style={styles.label}>Frame</Text>
            <View style={styles.chipRow}>
              {['H/W', 'Pine'].map(fr => (
                <TouchableOpacity
                  key={fr}
                  style={[styles.chipSmall, frame === fr && styles.chipActive]}
                  onPress={() => setFrame(fr)}
                >
                  <Text style={[styles.chipText, frame === fr && styles.chipTextActive]}>{fr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 10 }]}>Filler</Text>
            <View style={styles.chipRow}>
              {(product === 'Membrane' ? ['P/C', 'RC'] : ['H/W', 'Pine']).map(fl => (
                <TouchableOpacity
                  key={fl}
                  style={[styles.chipSmall, filler === fl && styles.chipActive]}
                  onPress={() => setFiller(fl)}
                >
                  <Text style={[styles.chipText, filler === fl && styles.chipTextActive]}>{fl}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.dimensionsRow}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={styles.label}>Length ({unitLabel}) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder={isInch ? '78' : '8'}
              placeholderTextColor="#94a3b8"
              value={length}
              onChangeText={setLength}
            />
          </View>
          <View style={{ flex: 1, marginHorizontal: 3 }}>
            <Text style={styles.label}>Width ({unitLabel}) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder={isInch ? '32' : '4'}
              placeholderTextColor="#94a3b8"
              value={width}
              onChangeText={setWidth}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.label}>Thk (mm) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="19"
              placeholderTextColor="#94a3b8"
              value={thickness}
              onChangeText={setThickness}
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Quantity (pcs) *</Text>
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
          placeholder="Calibration, moisture, press note"
          placeholderTextColor="#94a3b8"
          value={remarks}
          onChangeText={setRemarks}
        />

        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
          <Text style={styles.addBtnText}>+ Add to Matte Lot</Text>
        </TouchableOpacity>
      </View>

      {/* Staged Items */}
      <View style={styles.card}>
        <View style={styles.stagedHeader}>
          <Text style={styles.cardTitle}>3. Staged Items ({lotItems.length})</Text>
          <Text style={styles.totalBadge}>{totalLotPieces} pcs</Text>
        </View>

        {lotItems.length === 0 ? (
          <Text style={styles.emptyNote}>No items staged yet.</Text>
        ) : (
          lotItems.map((item, index) => (
            <View key={index} style={styles.stagedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stagedTitle}>
                  {item.productType} • {item.grade} • {item.glue}
                </Text>
                <Text style={styles.stagedSub}>
                  {item.length}×{item.width} {item.dimensionUnit} | {item.thickness}mm
                  {item.frame ? ` | F:${item.frame}` : ''}
                  {item.filler ? ` | Fil:${item.filler}` : ''}
                </Text>
              </View>
              <Text style={styles.stagedQty}>{item.qty} pcs</Text>
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
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6'
  },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },
  conditionalBox: {
    backgroundColor: '#faf5ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#f3e8ff'
  },
  dimensionsRow: { flexDirection: 'row', marginTop: 10 },
  addBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14
  },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  stagedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalBadge: { fontSize: 13, fontWeight: '700', color: '#7c3aed', backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
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
  stagedQty: { fontSize: 14, fontWeight: '700', color: '#8b5cf6' },
  submitBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14
  },
  submitBtnDisabled: { backgroundColor: '#c4b5fd' },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' }
});
