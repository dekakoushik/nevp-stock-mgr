import React from 'react';
import { 
  Package, Layers, FlaskConical, Trees, Sparkles, FileSpreadsheet
} from 'lucide-react';
import FinishedGoodsEntry from './FinishedGoodsEntry';
import MatteEntry from './MatteEntry';
import ChemicalEntry from './ChemicalEntry';
import VeneersEntry from './VeneersEntry';
import FaceVeneerEntry from './FaceVeneerEntry';

export const ENTRY_MODULES = [
  {
    id: 'finished_goods',
    title: 'Finished Goods',
    description: 'Finished plywood, block board, flushdoor, membrane & shuttering',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    icon: Package
  },
  {
    id: 'matte_entry',
    title: 'Matte Entry Points',
    description: 'Raw pressed matte stock before final trimming and finishing',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    icon: Layers
  },
  {
    id: 'chemical_entry',
    title: 'Chemical Entry Point',
    description: 'Resins, solvents, pigments, papers, paints and additives',
    color: '#10b981',
    bgColor: '#ecfdf5',
    icon: FlaskConical
  },
  {
    id: 'veneers_entry',
    title: 'Veneers Entry Point',
    description: 'Full core, half core, fall with grade and sqft computation',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    icon: Trees
  },
  {
    id: 'face_veneer_entry',
    title: 'Face Veneer Entry Point',
    description: 'Recon, Film, Gurjan & Okoume decorative face sheets',
    color: '#ec4899',
    bgColor: '#fdf2f8',
    icon: Sparkles
  }
];

export default function EntryModuleView({ moduleId, user, showToast }) {
  const mod = ENTRY_MODULES.find(m => m.id === moduleId) || ENTRY_MODULES[0];
  const Icon = mod.icon;

  if (moduleId === 'finished_goods') {
    return <FinishedGoodsEntry user={user} showToast={showToast} />;
  }

  if (moduleId === 'matte_entry') {
    return <MatteEntry user={user} showToast={showToast} />;
  }

  if (moduleId === 'chemical_entry') {
    return <ChemicalEntry user={user} showToast={showToast} />;
  }

  if (moduleId === 'veneers_entry') {
    return <VeneersEntry user={user} showToast={showToast} />;
  }

  if (moduleId === 'face_veneer_entry') {
    return <FaceVeneerEntry user={user} showToast={showToast} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card" style={{ padding: '1.75rem', borderTop: `4px solid ${mod.color}` }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '1.25rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: mod.bgColor,
              color: mod.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${mod.color}35`
            }}>
              <Icon size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#0f172a' }}>
                  {mod.title}
                </h1>
                <span className="badge" style={{ backgroundColor: mod.bgColor, color: mod.color, borderColor: mod.color }}>
                  Entry Point
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.2rem' }}>
                {mod.description}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {(user?.role === 'superadmin' || user?.role === 'admin') && (
              <button
                onClick={() => showToast(`Export report for ${mod.title} will be available once entry data is configured.`, 'success')}
                className="btn-primary"
                style={{ backgroundColor: '#15803d', padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                title="Export report to Excel"
              >
                <FileSpreadsheet size={14} /> Export Report (Excel)
              </button>
            )}
            <span style={{ fontSize: '0.825rem', color: '#64748b', background: '#f8fafc', padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
              Operator: <strong>{user.fullName}</strong>
            </span>
          </div>
        </div>

        {/* Blank Input Placeholder ready for user inputs */}
        <div style={{
          border: '2px dashed #cbd5e1',
          borderRadius: 'var(--radius-md)',
          padding: '4rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          backgroundColor: '#fafcff'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: mod.bgColor,
            color: mod.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <FileSpreadsheet size={28} />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>
            {mod.title} Form Ready
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '520px', marginTop: '0.45rem', lineHeight: 1.5 }}>
            Awaiting required input fields and columns for <strong>{mod.title}</strong>. Share the specific fields and rules, and this terminal will be constructed immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
