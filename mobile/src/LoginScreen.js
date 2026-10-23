import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from './storage';
import { apiRequest, getApiUrl, setApiUrl, DEFAULT_API_URL } from './api';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Host configuration for connecting to PC from Expo Go
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrlState] = useState('');

  useEffect(() => {
    getApiUrl().then(url => setServerUrlState(url));
  }, []);

  const handleSaveConfig = async () => {
    await setApiUrl(serverUrl);
    Alert.alert('Server IP Updated', `Connecting to: ${serverUrl || DEFAULT_API_URL}`);
    setShowConfig(false);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      onLoginSuccess(data.user);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandBox}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.appTitle}>NEVP Stock Manager</Text>
          <Text style={styles.appSubtitle}>Enterprise Production & Inventory Entry</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardDesc}>Enter your enterprise credentials to access modules</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. superadmin"
              placeholderTextColor="#94a3b8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In to Workspace</Text>
            )}
          </TouchableOpacity>

          {/* Server Connection Config Accordion */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.configToggleText}>
              {showConfig ? '▲ Hide Server Settings' : '▼ Server Connection (IP)'}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>API Endpoint URL (LAN IP):</Text>
              <TextInput
                style={styles.configInput}
                value={serverUrl}
                onChangeText={setServerUrlState}
                placeholder={DEFAULT_API_URL}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.configSaveBtn} onPress={handleSaveConfig}>
                <Text style={styles.configSaveBtnText}>Save IP</Text>
              </TouchableOpacity>
              <Text style={styles.configHint}>
                Phone and PC must be on the same Wi-Fi. Default: {DEFAULT_API_URL}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.footerNote}>NEVP Stock Manager v2.0 • Android Mobile Edition</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6
  },
  logoText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800'
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a'
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 18
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
    fontSize: 13,
    fontWeight: '500'
  },
  fieldGroup: {
    marginBottom: 14
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc'
  },
  loginBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    elevation: 2
  },
  loginBtnDisabled: {
    backgroundColor: '#93c5fd'
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  configToggle: {
    marginTop: 18,
    alignItems: 'center'
  },
  configToggleText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  },
  configBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff'
  },
  configSaveBtn: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  configSaveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  configHint: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 14
  },
  footerNote: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 11,
    marginTop: 20
  }
});
