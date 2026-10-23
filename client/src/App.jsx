import React, { useState } from 'react';
import { 
  Warehouse, LayoutDashboard, Users, LogOut, Menu, X, CheckCircle, AlertCircle,
  Package, Layers, FlaskConical, Trees, Sparkles
} from 'lucide-react';
import Login from './Login';
import Dashboard from './Dashboard';
import UserManagement from './UserManagement';
import EntryModuleView, { ENTRY_MODULES } from './EntryModuleView';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return <Login onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  // Sidebar entry points
  const entryNavItems = [
    { id: 'finished_goods', label: 'Finished Goods', icon: Package, color: '#3b82f6' },
    { id: 'matte_entry', label: 'Matte Entry Points', icon: Layers, color: '#8b5cf6' },
    { id: 'chemical_entry', label: 'Chemical Entry Point', icon: FlaskConical, color: '#10b981' },
    { id: 'veneers_entry', label: 'Veneers Entry Point', icon: Trees, color: '#f59e0b' },
    { id: 'face_veneer_entry', label: 'Face Veneer Entry Point', icon: Sparkles, color: '#ec4899' }
  ];

  const isEntryModuleActive = entryNavItems.some(item => item.id === activeTab);

  const getHeaderTitle = () => {
    if (activeTab === 'dashboard') return 'Dashboard';
    if (activeTab === 'users') return 'SuperAdmin Users';
    const entry = entryNavItems.find(item => item.id === activeTab);
    return entry ? entry.label : activeTab;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      
      {/* SIDEBAR NAVIGATION (Desktop & Tablet) */}
      <aside style={{
        width: '270px',
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
        overflowY: 'auto'
      }} className="desktop-sidebar">
        
        {/* Brand Header */}
        <div style={{
          padding: '1.4rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.45rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Warehouse size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              NEVP Stock Manager
            </h1>
          </div>
        </div>

        {/* User Card */}
        <div style={{
          padding: '0.85rem 1rem',
          margin: '0.85rem 1rem',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ffffff' }}>
              {currentUser.fullName}
            </span>
            <span className={`badge badge-${currentUser.role}`} style={{ fontSize: '0.65rem' }}>
              {currentUser.role}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '0.2rem' }}>
            @{currentUser.username}
          </span>
        </div>

        {/* Navigation List */}
        <nav style={{ flex: 1, padding: '0 0.75rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          
          {/* Main Items */}
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.7rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'dashboard' ? '600' : '500',
              color: activeTab === 'dashboard' ? '#ffffff' : '#cbd5e1',
              backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent',
              textAlign: 'left'
            }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          {/* SECTION: Entry Points */}
          <div style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#64748b',
            padding: '1.2rem 0.5rem 0.4rem 0.5rem'
          }}>
            Stock Entry Points
          </div>

          {entryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
                  textAlign: 'left'
                }}
              >
                <span style={{ color: item.color, display: 'flex' }}><Icon size={16} /></span>
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Superadmin User Management */}
          {currentUser.role === 'superadmin' && (
            <>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#64748b',
                padding: '1.2rem 0.5rem 0.4rem 0.5rem'
              }}>
                Administration
              </div>
              <button
                onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === 'users' ? '600' : '500',
                  color: activeTab === 'users' ? '#ffffff' : '#cbd5e1',
                  backgroundColor: activeTab === 'users' ? '#2563eb' : 'transparent',
                  textAlign: 'left'
                }}
              >
                <Users size={18} />
                <span>SuperAdmin Users</span>
              </button>
            </>
          )}
        </nav>

        {/* Sign Out Button */}
        <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '500',
              color: '#f87171',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)'
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div style={{ flex: 1, marginLeft: '270px', display: 'flex', flexDirection: 'column', minWidth: 0 }} className="main-viewport">
        
        {/* Header Bar */}
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-light)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn-secondary mobile-menu-toggle"
              style={{ padding: '0.45rem', display: 'none' }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
                NEVP Stock Manager
              </span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>
                {getHeaderTitle()}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right', display: 'none' }} className="header-user-tag">
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f172a' }}>{currentUser.fullName}</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Role: {currentUser.role}</span>
            </div>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }} title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Mobile Flyout Drawer */}
        {mobileMenuOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 100
          }} onClick={() => setMobileMenuOpen(false)}>
            <div style={{
              width: '280px',
              height: '100%',
              backgroundColor: 'var(--bg-sidebar)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffff' }}>
                <span style={{ fontWeight: '700' }}>NEVP Stock Manager</span>
                <button onClick={() => setMobileMenuOpen(false)} style={{ color: '#ffffff' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: activeTab === 'dashboard' ? '600' : '500',
                    color: activeTab === 'dashboard' ? '#ffffff' : '#cbd5e1',
                    backgroundColor: activeTab === 'dashboard' ? '#2563eb' : 'transparent',
                    textAlign: 'left'
                  }}
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </button>

                <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginTop: '0.75rem', paddingLeft: '0.5rem' }}>
                  Entry Points
                </div>

                {entryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? '600' : '500',
                        color: isActive ? '#ffffff' : '#cbd5e1',
                        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                        borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ color: item.color, display: 'flex' }}><Icon size={16} /></span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {currentUser.role === 'superadmin' && (
                  <>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginTop: '0.75rem', paddingLeft: '0.5rem' }}>
                      Administration
                    </div>
                    <button
                      onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: activeTab === 'users' ? '600' : '500',
                        color: activeTab === 'users' ? '#ffffff' : '#cbd5e1',
                        backgroundColor: activeTab === 'users' ? '#2563eb' : 'transparent',
                        textAlign: 'left'
                      }}
                    >
                      <Users size={18} />
                      <span>SuperAdmin Users</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View container */}
        <main style={{ padding: '1.5rem', flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {activeTab === 'dashboard' && <Dashboard user={currentUser} onNavigate={setActiveTab} />}
          {isEntryModuleActive && <EntryModuleView moduleId={activeTab} user={currentUser} showToast={showToast} />}
          {activeTab === 'users' && currentUser.role === 'superadmin' && (
            <UserManagement currentUser={currentUser} showToast={showToast} />
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`toast-bar toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 900px) {
          .desktop-sidebar {
            display: none !important;
          }
          .main-viewport {
            margin-left: 0 !important;
          }
          .mobile-menu-toggle {
            display: inline-flex !important;
          }
          .header-user-tag {
            display: block !important;
          }
        }
      `}</style>

    </div>
  );
}
