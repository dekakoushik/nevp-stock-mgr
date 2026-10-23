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

export default function MobileUsersScreen({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // New user form
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/users');
      setUsers(res.users || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async () => {
    if (!username.trim() || !fullName.trim() || !password.trim()) {
      Alert.alert('Required', 'Please fill username, full name, and password.');
      return;
    }
    try {
      setCreating(true);
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          fullName: fullName.trim(),
          password: password.trim(),
          role
        })
      });
      Alert.alert('Success', `User ${username} created successfully!`);
      setUsername('');
      setFullName('');
      setPassword('');
      loadUsers();
    } catch (err) {
      Alert.alert('Creation Failed', err.message || 'Error creating user');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const newStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    try {
      await apiRequest(`/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      Alert.alert('Updated', `User is now ${newStatus}.`);
      loadUsers();
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Error updating status');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Create User Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create New Account</Text>

        <Text style={styles.label}>Username *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. operator1"
          placeholderTextColor="#94a3b8"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          placeholderTextColor="#94a3b8"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Minimum 4 characters"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Role</Text>
        <View style={styles.chipRow}>
          {['user', 'admin', 'superadmin'].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, role === r && styles.chipActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.chipText, role === r && styles.chipTextActive]}>
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.createBtn, creating && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.createBtnText}>+ Create Account</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Existing Users List */}
      <View style={styles.card}>
        <View style={styles.listHeader}>
          <Text style={styles.cardTitle}>Registered Accounts ({users.length})</Text>
          <TouchableOpacity onPress={loadUsers}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#2563eb" style={{ marginVertical: 20 }} />
        ) : (
          users.map(u => (
            <View key={u.id} style={styles.userRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{u.fullName}</Text>
                <Text style={styles.userSub}>@{u.username} • {u.role.toUpperCase()}</Text>
              </View>
              <TouchableOpacity
                style={[styles.statusBtn, u.status === 'active' ? styles.statusBtnActive : styles.statusBtnInactive]}
                onPress={() => handleToggleStatus(u)}
              >
                <Text style={[styles.statusBtnText, u.status === 'active' ? styles.statusTextActive : styles.statusTextInactive]}>
                  {u.status.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          ))
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
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },
  createBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14
  },
  createBtnDisabled: { backgroundColor: '#93c5fd' },
  createBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  refreshText: { color: '#2563eb', fontSize: 12, fontWeight: '600' },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  userName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  userSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusBtnActive: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  statusBtnInactive: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  statusBtnText: { fontSize: 10, fontWeight: '700' },
  statusTextActive: { color: '#16a34a' },
  statusTextInactive: { color: '#dc2626' }
});
