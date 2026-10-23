import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { apiRequest } from './api';

export default function MobileDashboard({ user, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest('/dashboard/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats on mobile:', err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const summary = stats?.summary || {};
  const recentLots = stats?.recentLots || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} />}
    >
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerHeader}>
          <Text style={styles.bannerTitle}>Operational Overview</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>ONLINE</Text>
          </View>
        </View>
        <Text style={styles.bannerSub}>
          Signed in as <Text style={styles.bold}>{user?.fullName || user?.username || 'Operator'}</Text> {user?.role ? `(${user.role})` : ''}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* 5 KPI Metric Cards */}
      <Text style={styles.sectionTitle}>Module Summaries</Text>

      {/* Finished Goods */}
      <TouchableOpacity
        style={[styles.kpiCard, { borderLeftColor: '#3b82f6' }]}
        onPress={() => onNavigate('finished_goods')}
      >
        <View style={styles.kpiRow}>
          <Text style={styles.kpiLabel}>Finished Goods</Text>
          <Text style={styles.kpiAction}>Open →</Text>
        </View>
        <Text style={styles.kpiValue}>
          {summary.finishedGoods?.totalPieces || 0} <Text style={styles.kpiUnit}>pcs</Text>
        </Text>
        <Text style={styles.kpiSub}>
          {summary.finishedGoods?.lotCount || 0} batches registered
        </Text>
      </TouchableOpacity>

      {/* Matte Entry */}
      <TouchableOpacity
        style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}
        onPress={() => onNavigate('matte_entry')}
      >
        <View style={styles.kpiRow}>
          <Text style={styles.kpiLabel}>Matte Press Stock</Text>
          <Text style={styles.kpiAction}>Open →</Text>
        </View>
        <Text style={styles.kpiValue}>
          {summary.matte?.totalPieces || 0} <Text style={styles.kpiUnit}>pcs</Text>
        </Text>
        <Text style={styles.kpiSub}>
          {summary.matte?.lotCount || 0} batches registered
        </Text>
      </TouchableOpacity>

      {/* Chemicals */}
      <TouchableOpacity
        style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}
        onPress={() => onNavigate('chemical_entry')}
      >
        <View style={styles.kpiRow}>
          <Text style={styles.kpiLabel}>Chemical Inventory</Text>
          <Text style={styles.kpiAction}>Open →</Text>
        </View>
        <Text style={styles.kpiValue}>
          {summary.chemicals?.totalUnits || 0} <Text style={styles.kpiUnit}>units</Text>
        </Text>
        <Text style={styles.kpiSub}>
          {summary.chemicals?.lotCount || 0} consignments logged
        </Text>
      </TouchableOpacity>

      {/* Veneers */}
      <TouchableOpacity
        style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}
        onPress={() => onNavigate('veneers_entry')}
      >
        <View style={styles.kpiRow}>
          <Text style={styles.kpiLabel}>Core & Fali Veneers</Text>
          <Text style={styles.kpiAction}>Open →</Text>
        </View>
        <Text style={styles.kpiValue}>
          {summary.veneers?.totalSqft || 0} <Text style={styles.kpiUnit}>sqft</Text>
        </Text>
        <Text style={styles.kpiSub}>
          {summary.veneers?.totalPieces || 0} pcs across {summary.veneers?.lotCount || 0} lots
        </Text>
      </TouchableOpacity>

      {/* Face Veneers */}
      <TouchableOpacity
        style={[styles.kpiCard, { borderLeftColor: '#ec4899' }]}
        onPress={() => onNavigate('face_veneer_entry')}
      >
        <View style={styles.kpiRow}>
          <Text style={styles.kpiLabel}>Decorative Face Veneers</Text>
          <Text style={styles.kpiAction}>Open →</Text>
        </View>
        <Text style={styles.kpiValue}>
          {summary.faceVeneers?.totalArea || 0} <Text style={styles.kpiUnit}>sqft</Text>
        </Text>
        <Text style={styles.kpiSub}>
          {summary.faceVeneers?.totalPieces || 0} pcs across {summary.faceVeneers?.lotCount || 0} lots
        </Text>
      </TouchableOpacity>

      {/* Recent Production Entries */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Recent Production Batches</Text>
      {recentLots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recent lots recorded yet.</Text>
        </View>
      ) : (
        recentLots.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.recentItem}
            onPress={() => onNavigate(item.moduleId)}
          >
            <View style={styles.recentTop}>
              <Text style={styles.recentLot}>#{item.lotNo}</Text>
              <Text style={styles.recentModule}>{item.module}</Text>
            </View>
            <View style={styles.recentBottom}>
              <Text style={styles.recentMeta}>
                {item.itemCount} items • {item.totalQty} total
              </Text>
              <Text style={styles.recentTime}>
                {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  banner: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  statusPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusPillText: {
    color: '#16a34a',
    fontSize: 10,
    fontWeight: '700'
  },
  bannerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  bold: {
    fontWeight: '700',
    color: '#334155'
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155'
  },
  kpiAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb'
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 4
  },
  kpiUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b'
  },
  kpiSub: {
    fontSize: 12,
    color: '#64748b'
  },
  recentItem: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  recentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recentLot: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb'
  },
  recentModule: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  recentBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  recentMeta: {
    fontSize: 12,
    color: '#64748b'
  },
  recentTime: {
    fontSize: 11,
    color: '#94a3b8'
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed'
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13
  }
});
