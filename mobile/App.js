import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from './src/storage';

import LoginScreen from './src/LoginScreen';
import MobileDashboard from './src/MobileDashboard';
import FinishedGoodsScreen from './src/FinishedGoodsScreen';
import MatteEntryScreen from './src/MatteEntryScreen';
import ChemicalEntryScreen from './src/ChemicalEntryScreen';
import VeneersEntryScreen from './src/VeneersEntryScreen';
import FaceVeneerEntryScreen from './src/FaceVeneerEntryScreen';
import MobileUsersScreen from './src/MobileUsersScreen';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: '📊', color: '#6366f1' },
  { id: 'finished-goods', label: 'Finished Goods', icon: '📦', color: '#10b981' },
  { id: 'matte-entry', label: 'Matte Entry Point', icon: '🪵', color: '#f59e0b' },
  { id: 'chemical-entry', label: 'Chemical Entry', icon: '🧪', color: '#ec4899' },
  { id: 'veneer-entry', label: 'Core Veneer Entry', icon: '🌲', color: '#06b6d4' },
  { id: 'face-veneer-entry', label: 'Face Veneer Entry', icon: '🪵', color: '#8b5cf6' },
  { id: 'users', label: 'User Directory', icon: '👥', color: '#3b82f6', superAdminOnly: true },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_session');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    await AsyncStorage.setItem('user_session', JSON.stringify(user));
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out from NEVP Mobile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user_session');
          setCurrentUser(null);
          setCurrentScreen('dashboard');
          setMenuVisible(false);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.splashBrandCard}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.splashLogo}
            resizeMode="cover"
          />
          <Text style={styles.loadingLogo}>NEVP PLYWOOD</Text>
          <Text style={styles.loadingSubtitle}>Industrial Stock & Production Suite</Text>
        </View>
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 32 }} />
        <Text style={styles.loadingText}>Initializing Workspace...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const activeNavItem = NAV_ITEMS.find((n) => n.id === currentScreen) || NAV_ITEMS[0];
  const isSuperAdmin = currentUser?.role?.toLowerCase() === 'superadmin';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Top App Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeNavItem.label}
          </Text>
          <Text style={styles.headerSub}>
            NEVP Stock Manager • {currentUser.username}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.userBadge}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.userInitial}>
            {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Screen Body */}
      <View style={styles.body}>
        {currentScreen === 'dashboard' && (
          <MobileDashboard
            user={currentUser}
            onNavigate={(screen) => {
              // Map internal dashboard IDs to App screen IDs
              const screenMap = {
                'finished_goods': 'finished-goods',
                'matte_entry': 'matte-entry',
                'chemical_entry': 'chemical-entry',
                'veneers_entry': 'veneer-entry',
                'face_veneer_entry': 'face-veneer-entry',
              };
              setCurrentScreen(screenMap[screen] || screen);
            }}
          />
        )}
        {currentScreen === 'finished-goods' && <FinishedGoodsScreen />}
        {currentScreen === 'matte-entry' && <MatteEntryScreen />}
        {currentScreen === 'chemical-entry' && <ChemicalEntryScreen />}
        {currentScreen === 'veneer-entry' && <VeneersEntryScreen />}
        {currentScreen === 'face-veneer-entry' && <FaceVeneerEntryScreen />}
        {currentScreen === 'users' && <MobileUsersScreen />}
      </View>

      {/* Bottom Bar for quick navigation */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomTab, currentScreen === 'dashboard' && styles.bottomTabActive]}
          onPress={() => setCurrentScreen('dashboard')}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomIcon}>📊</Text>
          <Text style={[styles.bottomLabel, currentScreen === 'dashboard' && styles.bottomLabelActive]}>
            Dashboard
          </Text>
          {currentScreen === 'dashboard' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomTab, currentScreen === 'finished-goods' && styles.bottomTabActive]}
          onPress={() => setCurrentScreen('finished-goods')}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomIcon}>📦</Text>
          <Text style={[styles.bottomLabel, currentScreen === 'finished-goods' && styles.bottomLabelActive]}>
            Goods
          </Text>
          {currentScreen === 'finished-goods' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomTab, currentScreen === 'matte-entry' && styles.bottomTabActive]}
          onPress={() => setCurrentScreen('matte-entry')}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomIcon}>🪵</Text>
          <Text style={[styles.bottomLabel, currentScreen === 'matte-entry' && styles.bottomLabelActive]}>
            Matte
          </Text>
          {currentScreen === 'matte-entry' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomTab, currentScreen === 'chemical-entry' && styles.bottomTabActive]}
          onPress={() => setCurrentScreen('chemical-entry')}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomIcon}>🧪</Text>
          <Text style={[styles.bottomLabel, currentScreen === 'chemical-entry' && styles.bottomLabelActive]}>
            Chemical
          </Text>
          {currentScreen === 'chemical-entry' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomIcon}>☰</Text>
          <Text style={styles.bottomLabel}>More</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Drawer Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.overlayDismiss}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />
          <View style={styles.drawerSheet}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>NEVP Mobile Hub</Text>
                <Text style={styles.drawerUser}>
                  Signed in as <Text style={styles.highlight}>{currentUser.username}</Text> ({currentUser.role})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.navSectionLabel}>CORE OPERATIONS</Text>
              {NAV_ITEMS.map((item) => {
                if (item.superAdminOnly && !isSuperAdmin) return null;
                const isSelected = currentScreen === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.drawerNavItem,
                      isSelected && styles.drawerNavItemActive,
                    ]}
                    onPress={() => {
                      setCurrentScreen(item.id);
                      setMenuVisible(false);
                    }}
                  >
                    <View style={[styles.drawerNavIconWrap, { backgroundColor: item.color + '22' }]}>
                      <Text style={styles.drawerNavIcon}>{item.icon}</Text>
                    </View>
                    <Text
                      style={[
                        styles.drawerNavText,
                        isSelected && styles.drawerNavTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Text style={styles.activeCheck}>●</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#6366f1',
    letterSpacing: 2,
    marginBottom: 8,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  menuIcon: {
    fontSize: 22,
    color: '#f8fafc',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  userBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  userInitial: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  body: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1.5,
    borderTopColor: '#334155',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 24 : 20,
    justifyContent: 'space-around',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  bottomTab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  bottomTabActive: {
    opacity: 1,
  },
  bottomIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  bottomLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bottomLabelActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38bdf8',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
  },
  overlayDismiss: {
    flex: 1,
  },
  drawerSheet: {
    width: '82%',
    maxWidth: 360,
    backgroundColor: '#0f172a',
    height: '100%',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 50,
    borderLeftWidth: 1,
    borderLeftColor: '#1e293b',
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 16,
    marginBottom: 16,
  },
  drawerTitle: {
    color: '#f8fafc',
    fontSize: 19,
    fontWeight: '800',
  },
  drawerUser: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  highlight: {
    color: '#818cf8',
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  closeText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 'bold',
  },
  drawerNavList: {
    flex: 1,
  },
  navSectionLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  drawerNavItemActive: {
    backgroundColor: '#1e293b',
  },
  drawerNavIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawerNavIcon: {
    fontSize: 16,
  },
  drawerNavText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  drawerNavTextActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  activeCheck: {
    color: '#6366f1',
    fontSize: 10,
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444433',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  splashBrandCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 110,
    height: 110,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#38bdf840',
  },
  loadingLogo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 2,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
});
