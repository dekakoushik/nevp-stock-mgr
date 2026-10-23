import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList
} from 'react-native';
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

const SHUTTERING_WEIGHTS = ['25', '30', '32', '34', '45', '52'];

export default function FinishedGoodsScreen({ user }) {
  // Lot header
  const [lotNo, setLotNo] = useState('');
  const [lotNotes, setLotNotes] = useState('');
  const [lotStatus, setLotStatus] = useState(null);

  // Line item specifications
  const [product, setProduct] = useState('Plywood');
  const [grade, setGrade] = useState('A');
  const [glue, setGlue] = useState('PF');
  const [face, setFace] = useState('okume');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [thickness, setThickness] = useState('');
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');

  // Conditional specifications
  const [frame, setFrame] = useState('H/W');
  const [filler, setFiller] = useState('H/W');
  const [weightKg, setWeightKg] = useState('25');
  const [brand, setBrand] = useState('Ply Story Ultra');
  const [designCode, setDesignCode] = useState('PMD-01');
  const [colour, setColour] = useState('Rose wood');

  // Search Modals for Membrane Design Code & Shuttering Brand
  const [designModalVisible, setDesignModalVisible] = useState(false);
  const [designSearchText, setDesignSearchText] = useState('');
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [brandSearchText, setBrandSearchText] = useState('');

  // Staged items
  const [lotItems, setLotItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Unit calculation: Flushdoor and Membrane in inch, else ft
  const isInch = product === 'flushdoor' || product === 'membrane';
  const unitLabel = isInch ? 'inch' : 'ft';

  // Check lot number uniqueness on blur
  const handleCheckLot = async () => {
    if (!lotNo.trim()) return;
    try {
      setLotStatus('checking');
      const res = await apiRequest(`/finished-goods/check-lot/${encodeURIComponent(lotNo.trim())}`);
      if (res.exists) {
        setLotStatus('duplicate');
      } else {
        setLotStatus('available');
      }
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
      Alert.alert('Duplicate Lot', 'This Lot No. already exists in database.');
      return;
    }
    if (product !== 'shuttering' && (!length || !width)) {
      Alert.alert('Required', `Please enter length and width in ${unitLabel}.`);
      return;
    }
    if (product !== 'shuttering' && !thickness) {
      Alert.alert('Required', 'Please enter thickness in mm.');
      return;
    }
    if (product === 'membrane' && !designCode) {
      Alert.alert('Required', 'Please select a Design Code for Membrane.');
      return;
    }
    if (product === 'shuttering' && !brand) {
      Alert.alert('Required', 'Please select a Brand for Shuttering.');
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
      face: product !== 'shuttering' ? face : null,
      length: product === 'shuttering' ? 8 : parseFloat(length),
      width: product === 'shuttering' ? 4 : parseFloat(width),
      dimensionUnit: product === 'shuttering' ? 'ft' : unitLabel,
      thickness: product === 'shuttering' ? null : parseFloat(thickness),
      qty: parseInt(qty, 10),
      remarks: remarks.trim() || null,
      frame: (product === 'blockboard' || product === 'flushdoor' || product === 'membrane') ? frame : null,
      filler: (product === 'blockboard' || product === 'flushdoor' || product === 'membrane') ? filler : null,
      designCode: product === 'membrane' ? designCode : null,
      colour: product === 'membrane' ? colour : null,
      brand: product === 'shuttering' ? brand : null,
      weightKg: product === 'shuttering' ? parseFloat(weightKg) : null
    };

    setLotItems([...lotItems, newItem]);
    Alert.alert('Added', `${qty} pcs added to lot.`);

    // Clear inputs
    setQty('');
    setRemarks('');
    if (product !== 'shuttering') {
      setLength('');
      setWidth('');
      setThickness('');
    }
  };

  const handleFinalSubmit = async () => {
    if (!lotNo.trim() || lotItems.length === 0) {
      Alert.alert('Cannot Submit', 'Please enter a Lot No. and add at least one line item.');
      return;
    }

    try {
      setSubmitting(true);
      await apiRequest('/finished-goods/lot', {
        method: 'POST',
        body: JSON.stringify({
          lotNo: lotNo.trim(),
          notes: lotNotes.trim(),
          items: lotItems
        })
      });

      Alert.alert('Success', `Lot ${lotNo} with ${lotItems.length} items successfully recorded!`);
      // Reset form
      setLotNo('');
      setLotNotes('');
      setLotStatus(null);
      setLotItems([]);
    } catch (e) {
      Alert.alert('Submission Error', e.message || 'Failed to submit finished goods lot');
    } finally {
      setSubmitting(false);
    }
  };

  const totalLotPieces = lotItems.reduce((acc, it) => acc + (it.qty || 0), 0);

  const filteredDesigns = MEMBRANE_DESIGN_CODES.filter(d =>
    d.toLowerCase().includes(designSearchText.toLowerCase())
  );

  const filteredBrands = SHUTTERING_BRANDS.filter(b =>
    b.toLowerCase().includes(brandSearchText.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      
      {/* Lot Header */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Finished Goods Lot Header</Text>
        <Text style={styles.label}>Lot No. * (Manual)</Text>
        <TextInput
          style={[styles.input, lotStatus === 'duplicate' && styles.inputError, lotStatus === 'available' && styles.inputSuccess]}
          placeholder="e.g. FG-LOT-101"
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

      {/* Product Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Item Specifications</Text>
        <Text style={styles.label}>Product Type</Text>
        <View style={styles.chipRow}>
          {['Plywood', 'blockboard', 'flushdoor', 'membrane', 'shuttering'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, product === p && styles.chipActive]}
              onPress={() => {
                setProduct(p);
                // Adjust filler defaults based on product
                if (p === 'membrane') {
                  setFiller('P/C');
                } else if (p === 'blockboard' || p === 'flushdoor') {
                  setFiller('H/W');
                }
              }}
            >
              <Text style={[styles.chipText, product === p && styles.chipTextActive]}>
                {p === 'blockboard' ? 'Blockboard' : p === 'flushdoor' ? 'Flushdoor' : p === 'membrane' ? 'Membrane' : p === 'shuttering' ? 'Shuttering' : 'Plywood'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grade */}
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

        {/* Glue */}
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

        {/* Face */}
        {product !== 'shuttering' && (
          <>
            <Text style={[styles.label, { marginTop: 12 }]}>Face</Text>
            <View style={styles.chipRow}>
              {['okume', 'gurjan', 'recon'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chipSmall, face === f && styles.chipActive]}
                  onPress={() => setFace(f)}
                >
                  <Text style={[styles.chipText, face === f && styles.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ================= MEMBRANE CONDITIONAL SECTION ================= */}
        {product === 'membrane' && (
          <View style={styles.membraneBox}>
            <Text style={styles.conditionalTitle}>🎨 Membrane Options</Text>

            {/* Design Code Picker */}
            <Text style={[styles.label, { color: '#86198f', marginTop: 4 }]}>Design Code *</Text>
            <TouchableOpacity
              style={styles.pickerSelector}
              onPress={() => {
                setDesignSearchText('');
                setDesignModalVisible(true);
              }}
            >
              <Text style={styles.pickerSelectorText}>{designCode || 'Select Design Code...'}</Text>
              <Text style={styles.pickerArrow}>🔍 Select ▼</Text>
            </TouchableOpacity>

            {/* Colour Selector */}
            <Text style={[styles.label, { color: '#86198f', marginTop: 10 }]}>Colour *</Text>
            <View style={styles.chipRow}>
              {['Rose wood', 'Andra Teak'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chipSmall, colour === c && styles.chipMembraneActive]}
                  onPress={() => setColour(c)}
                >
                  <Text style={[styles.chipText, colour === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Membrane Frame */}
            <Text style={[styles.label, { color: '#86198f', marginTop: 10 }]}>Frame (H/W, Pine)</Text>
            <View style={styles.chipRow}>
              {['H/W', 'Pine'].map(fr => (
                <TouchableOpacity
                  key={fr}
                  style={[styles.chipSmall, frame === fr && styles.chipMembraneActive]}
                  onPress={() => setFrame(fr)}
                >
                  <Text style={[styles.chipText, frame === fr && styles.chipTextActive]}>{fr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Membrane Filler: P/C or RC */}
            <Text style={[styles.label, { color: '#86198f', marginTop: 10 }]}>Filler (P/C, RC)</Text>
            <View style={styles.chipRow}>
              {['P/C', 'RC'].map(fl => (
                <TouchableOpacity
                  key={fl}
                  style={[styles.chipSmall, filler === fl && styles.chipMembraneActive]}
                  onPress={() => setFiller(fl)}
                >
                  <Text style={[styles.chipText, filler === fl && styles.chipTextActive]}>{fl}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ================= SHUTTERING CONDITIONAL SECTION ================= */}
        {product === 'shuttering' && (
          <View style={styles.shutteringBox}>
            <Text style={styles.shutteringTitle}>🏗️ Shuttering Specifications</Text>

            {/* Searchable Brand */}
            <Text style={[styles.label, { color: '#065f46', marginTop: 4 }]}>Brand (Searchable) *</Text>
            <TouchableOpacity
              style={styles.pickerSelector}
              onPress={() => {
                setBrandSearchText('');
                setBrandModalVisible(true);
              }}
            >
              <Text style={styles.pickerSelectorText}>{brand || 'Select Brand...'}</Text>
              <Text style={styles.pickerArrow}>🔍 Select ▼</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: '#065f46', marginTop: 10 }]}>Weight (KG):</Text>
            <View style={styles.chipRow}>
              {SHUTTERING_WEIGHTS.map(w => (
                <TouchableOpacity
                  key={w}
                  style={[styles.chipSmall, weightKg === w && styles.chipShutteringActive]}
                  onPress={() => setWeightKg(w)}
                >
                  <Text style={[styles.chipText, weightKg === w && styles.chipTextActive]}>{w} kg</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fixedSizeNote}>Standard Shuttering Dimension: Fixed 8 ft × 4 ft</Text>
          </View>
        )}

        {/* ================= BLOCKBOARD & FLUSHDOOR FRAME/FILLER ================= */}
        {(product === 'blockboard' || product === 'flushdoor') && (
          <View style={styles.conditionalBox}>
            <Text style={styles.label}>Frame (H/W, Pine)</Text>
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

            <Text style={[styles.label, { marginTop: 10 }]}>Filler (H/W, Pine)</Text>
            <View style={styles.chipRow}>
              {['H/W', 'Pine'].map(fl => (
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

        {/* Dimensions (Length & Width) */}
        {product !== 'shuttering' && (
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
        )}

        {/* Quantity & Remarks */}
        <Text style={[styles.label, { marginTop: 12 }]}>Quantity (pcs) *</Text>
        <TextInput
          style={[styles.input, { fontWeight: '700', fontSize: 16 }]}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#94a3b8"
          value={qty}
          onChangeText={setQty}
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Item Remarks (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Customer tag, calibration note, etc."
          placeholderTextColor="#94a3b8"
          value={remarks}
          onChangeText={setRemarks}
        />

        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
          <Text style={styles.addBtnText}>+ Add to Lot Breakdown</Text>
        </TouchableOpacity>
      </View>

      {/* Staged Items */}
      <View style={styles.card}>
        <View style={styles.stagedHeader}>
          <Text style={styles.cardTitle}>3. Staged Breakdown ({lotItems.length})</Text>
          <Text style={styles.totalBadge}>{totalLotPieces} pcs</Text>
        </View>

        {lotItems.length === 0 ? (
          <Text style={styles.emptyNote}>No items staged yet. Fill above and tap Add.</Text>
        ) : (
          lotItems.map((item, index) => (
            <View key={index} style={styles.stagedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stagedTitle}>
                  {item.productType} • {item.grade} • {item.glue}
                  {item.brand ? ` • ${item.brand}` : ''}
                  {item.designCode ? ` • ${item.designCode}` : ''}
                </Text>
                <Text style={styles.stagedSub}>
                  {item.length}×{item.width} {item.dimensionUnit}
                  {item.thickness ? ` | ${item.thickness}mm` : ''}
                  {item.weightKg ? ` | ${item.weightKg}kg` : ''}
                  {item.colour ? ` | ${item.colour}` : ''}
                  {item.frame ? ` | Frame:${item.frame}` : ''}
                  {item.filler ? ` | Filler:${item.filler}` : ''}
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

      {/* ================= MODAL: Membrane Design Code Search ================= */}
      <Modal
        visible={designModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDesignModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select Membrane Design Code</Text>
              <TouchableOpacity onPress={() => setDesignModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search design (e.g. PMD-01, PVC)..."
              placeholderTextColor="#94a3b8"
              value={designSearchText}
              onChangeText={setDesignSearchText}
              autoCapitalize="none"
              autoFocus
            />

            <FlatList
              data={filteredDesigns}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, designCode === item && styles.modalItemActive]}
                  onPress={() => {
                    setDesignCode(item);
                    setDesignModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, designCode === item && styles.modalItemTextActive]}>
                    {item}
                  </Text>
                  {designCode === item && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: Shuttering Brand Search ================= */}
      <Modal
        visible={brandModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBrandModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select Shuttering Brand</Text>
              <TouchableOpacity onPress={() => setBrandModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search brand (e.g. Ply Story, Everest)..."
              placeholderTextColor="#94a3b8"
              value={brandSearchText}
              onChangeText={setBrandSearchText}
              autoCapitalize="none"
              autoFocus
            />

            <FlatList
              data={filteredBrands}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, brand === item && styles.modalItemActive]}
                  onPress={() => {
                    setBrand(item);
                    setBrandModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, brand === item && styles.modalItemTextActive]}>
                    {item}
                  </Text>
                  {brand === item && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  chipMembraneActive: {
    backgroundColor: '#a21caf',
    borderColor: '#86198f'
  },
  chipShutteringActive: {
    backgroundColor: '#059669',
    borderColor: '#047857'
  },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },
  conditionalBox: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 4
  },
  membraneBox: {
    backgroundColor: '#fdf4ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5d0fe',
    marginTop: 10,
    marginBottom: 4
  },
  conditionalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#86198f',
    marginBottom: 8
  },
  shutteringBox: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginTop: 10,
    marginBottom: 4
  },
  shutteringTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 8
  },
  fixedSizeNote: {
    fontSize: 11,
    color: '#047857',
    marginTop: 8,
    fontWeight: '600'
  },
  pickerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff'
  },
  pickerSelectorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  pickerArrow: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600'
  },
  dimensionsRow: { flexDirection: 'row', marginTop: 10 },
  addBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14
  },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  stagedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalBadge: { fontSize: 13, fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
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
  stagedQty: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  submitBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14
  },
  submitBtnDisabled: { backgroundColor: '#86efac' },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    maxHeight: '80%',
    padding: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  modalCloseBtn: {
    padding: 6
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700'
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
    backgroundColor: '#f8fafc'
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  modalItemActive: {
    backgroundColor: '#eff6ff'
  },
  modalItemText: {
    fontSize: 14,
    color: '#334155'
  },
  modalItemTextActive: {
    color: '#2563eb',
    fontWeight: '700'
  },
  modalCheck: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 16
  }
});
