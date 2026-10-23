import React, { useState, useEffect } from 'react';
import { 
  Package, Layers, FlaskConical, Trees, Sparkles, 
  Users, RefreshCw, ArrowUpRight, CheckCircle2, TrendingUp, 
  Layers3, Boxes, Activity, Calendar, ShieldCheck
} from 'lucide-react';
import { apiRequest } from './api';

export default function Dashboard({ user, onNavigate }) {
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
      console.error('Dashboard load failed:', err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const summary = stats?.summary || {};
  const breakdowns = stats?.breakdowns || {};
  const recentLots = stats?.recentLots || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner with Corporate Identity & Refresh */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid #2563eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0f172a' }}>
                Operational Overview & Live Inventory
              </h1>
              <span className="badge badge-active" style={{ fontSize: '0.725rem' }}>SYSTEM ONLINE</span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
              Welcome back, <strong>{user.fullName}</strong> ({user.role.toUpperCase()}) • Consolidated view of all 5 production & stock entry points.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              title="Refresh all metrics"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '1rem', backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* 5-MODULE KPI CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        {/* Card 1: Finished Goods */}
        <div 
          className="card" 
          onClick={() => onNavigate && onNavigate('finished_goods')}
          style={{ 
            padding: '1.25rem', 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            borderTop: '3px solid #3b82f6',
            position: 'relative'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} />
            </div>
            <ArrowUpRight size={16} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '0.775rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Finished Goods
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0' }}>
            {summary.finishedGoods?.totalPieces || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>pcs</span>
          </div>
          <div style={{ fontSize: '0.775rem', color: '#3b82f6', fontWeight: '600' }}>
            {summary.finishedGoods?.lotCount || 0} Batches Registered
          </div>
        </div>

        {/* Card 2: Matte Entry */}
        <div 
          className="card" 
          onClick={() => onNavigate && onNavigate('matte_entry')}
          style={{ 
            padding: '1.25rem', 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            borderTop: '3px solid #8b5cf6',
            position: 'relative'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} />
            </div>
            <ArrowUpRight size={16} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '0.775rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Matte Press Stock
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0' }}>
            {summary.matte?.totalPieces || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>pcs</span>
          </div>
          <div style={{ fontSize: '0.775rem', color: '#8b5cf6', fontWeight: '600' }}>
            {summary.matte?.lotCount || 0} Batches Registered
          </div>
        </div>

        {/* Card 3: Chemical Entry */}
        <div 
          className="card" 
          onClick={() => onNavigate && onNavigate('chemical_entry')}
          style={{ 
            padding: '1.25rem', 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            borderTop: '3px solid #10b981',
            position: 'relative'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlaskConical size={20} />
            </div>
            <ArrowUpRight size={16} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '0.775rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Chemical Inventory
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0' }}>
            {summary.chemicals?.totalUnits || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>units</span>
          </div>
          <div style={{ fontSize: '0.775rem', color: '#10b981', fontWeight: '600' }}>
            {summary.chemicals?.lotCount || 0} Consignments Logged
          </div>
        </div>

        {/* Card 4: Veneers Entry */}
        <div 
          className="card" 
          onClick={() => onNavigate && onNavigate('veneers_entry')}
          style={{ 
            padding: '1.25rem', 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            borderTop: '3px solid #f59e0b',
            position: 'relative'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trees size={20} />
            </div>
            <ArrowUpRight size={16} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '0.775rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Core & Fali Veneers
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0' }}>
            {summary.veneers?.totalSqft || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>sqft</span>
          </div>
          <div style={{ fontSize: '0.775rem', color: '#d97706', fontWeight: '600' }}>
            {summary.veneers?.totalPieces || 0} pcs across {summary.veneers?.lotCount || 0} lots
          </div>
        </div>

        {/* Card 5: Face Veneers */}
        <div 
          className="card" 
          onClick={() => onNavigate && onNavigate('face_veneer_entry')}
          style={{ 
            padding: '1.25rem', 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            borderTop: '3px solid #ec4899',
            position: 'relative'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fdf2f8', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} />
            </div>
            <ArrowUpRight size={16} color="#94a3b8" />
          </div>
          <div style={{ fontSize: '0.775rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Decorative Face Veneers
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0' }}>
            {summary.faceVeneers?.totalArea || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>sqft</span>
          </div>
          <div style={{ fontSize: '0.775rem', color: '#db2777', fontWeight: '600' }}>
            {summary.faceVeneers?.totalPieces || 0} pcs across {summary.faceVeneers?.lotCount || 0} lots
          </div>
        </div>

      </div>

      {/* TWO-COLUMN PRODUCTION & BREAKDOWN ANALYSIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        
        {/* Finished Goods & Matte Stock Categorization */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Boxes size={18} color="#2563eb" /> Finished Goods Breakdown by Product
          </h3>

          {(!breakdowns.finishedGoodsByProduct || breakdowns.finishedGoodsByProduct.length === 0) ? (
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '1.5rem', textAlign: 'center' }}>
              No finished goods records entered yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {breakdowns.finishedGoodsByProduct.map((item) => {
                const total = summary.finishedGoods?.totalPieces || 1;
                const percentage = Math.round((item.totalQty / total) * 100) || 0;
                return (
                  <div key={item.productType} style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: '700', color: '#1e293b' }}>{item.productType}</span>
                      <span style={{ fontWeight: '700', color: '#2563eb' }}>
                        {item.totalQty} pcs ({percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Veneers Core & Face Breakdown */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers3 size={18} color="#f59e0b" /> Core & Decorative Veneer Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Core & Fali Peeling Veneers
              </div>
              {(!breakdowns.veneersByProduct || breakdowns.veneersByProduct.length === 0) ? (
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No veneer items entered yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                  {breakdowns.veneersByProduct.map(v => (
                    <div key={v.productName} style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600' }}>{v.productName}</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#b45309' }}>{v.totalSqft} sqft</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{v.totalQty} pcs</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Decorative Face Sheets
              </div>
              {(!breakdowns.faceVeneersByType || breakdowns.faceVeneersByType.length === 0) ? (
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No face veneer items entered yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                  {breakdowns.faceVeneersByType.map(f => (
                    <div key={f.veneerType} style={{ background: '#fdf2f8', border: '1px solid #fce7f3', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#9d174d', fontWeight: '600' }}>{f.veneerType}</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#db2777' }}>{f.totalArea} sqft</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{f.totalQty} pcs</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* RECENT PRODUCTION LOGS ACROSS ALL MODULES */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#2563eb" /> Recent Production Batches Across All Modules
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Latest 10 committed lots registered in the system
            </p>
          </div>
        </div>

        <div className="table-container">
          <table className="corp-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Lot No.</th>
                <th>Operator</th>
                <th style={{ textAlign: 'center' }}>Line Items</th>
                <th style={{ textAlign: 'right' }}>Total Units / Pcs</th>
                <th>Time Registered</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentLots.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                    No production entries recorded in any module yet. Navigate to an entry point on the left sidebar to start.
                  </td>
                </tr>
              ) : (
                recentLots.map((l, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className={`badge ${
                        l.moduleId === 'finished_goods' ? 'badge-active' :
                        l.moduleId === 'matte_entry' ? 'badge-purple' :
                        l.moduleId === 'chemical_entry' ? 'badge-active' :
                        l.moduleId === 'veneers_entry' ? 'badge-user' : 'badge-user'
                      }`}>
                        {l.module}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#2563eb' }}>
                      #{l.lotNo}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{l.createdBy}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {l.itemCount} items
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                      {l.totalQty}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: '#64748b' }}>
                      {new Date(l.createdAt).toLocaleDateString()} {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onNavigate && onNavigate(l.moduleId)}
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        Open Module <ArrowUpRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK LAUNCH ENTRY POINTS SHORTCUT BAR */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          Direct Entry Point Launchpad
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { id: 'finished_goods', name: 'Finished Goods', icon: Package, color: '#3b82f6' },
            { id: 'matte_entry', name: 'Matte Entry Points', icon: Layers, color: '#8b5cf6' },
            { id: 'chemical_entry', name: 'Chemical Entry', icon: FlaskConical, color: '#10b981' },
            { id: 'veneers_entry', name: 'Veneers Entry', icon: Trees, color: '#f59e0b' },
            { id: 'face_veneer_entry', name: 'Face Veneer Entry', icon: Sparkles, color: '#ec4899' }
          ].map(mod => {
            const ModIcon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => onNavigate && onNavigate(mod.id)}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  justifyContent: 'flex-start',
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}
              >
                <ModIcon size={16} color={mod.color} />
                <span>{mod.name}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
