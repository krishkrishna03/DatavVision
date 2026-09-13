import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, LayoutTemplate, Database, Sparkles, ChevronRight, Pencil, Check, X, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useDataStore, useDashboardStore } from '../../store/store';

const nav = [
  { to: '/',          label: 'Home',       icon: Sparkles },
  { to: '/upload',    label: 'Upload Data', icon: Upload },
  { to: '/dashboards', label: 'Dashboards',  icon: LayoutDashboard },
  { to: '/templates', label: 'Templates',   icon: LayoutTemplate },
  { to: '/datasets',  label: 'My Datasets', icon: Database },
];

export default function Sidebar() {
  const datasets   = useDataStore(s => s.datasets);
  const dashboards = useDashboardStore(s => s.dashboards);
  const setActiveDashboard = useDashboardStore(s => s.setActiveDashboard);
  const updateDashboard = useDashboardStore(s => s.updateDashboard);
  const deleteDashboard = useDashboardStore(s => s.deleteDashboard);
  const navigate = useNavigate();

  return (
    <aside className="sidebar" style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'linear-gradient(180deg, #0d1422 0%, #0a0d14 100%)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100, padding: '24px 0',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>DataVision</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>AI Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              textDecoration: 'none', fontSize: 14, fontWeight: 500,
              transition: 'all 0.2s',
              color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
              border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
            })}>
            {({ isActive }) => (<>
              <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {isActive && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
            </>)}
          </NavLink>
        ))}
      </nav>

      {/* Dashboard List */}
      {dashboards.length > 0 && (
        <div style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', minHeight: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px 6px' }}>
            Recent
          </div>
          {dashboards.map(d => (
            <DashboardListItem
              key={d.id}
              dashboard={d}
              datasetName={datasets.find(ds => ds.id === d.datasetId)?.name || 'Unknown'}
              onOpen={() => {
                setActiveDashboard(d.id);
                navigate('/dashboard');
              }}
              onRename={(title) => updateDashboard(d.id, { title })}
              onDelete={() => {
                if (window.confirm(`Delete "${d.title}"? This cannot be undone.`)) {
                  deleteDashboard(d.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{
          background: 'rgba(99,102,241,0.08)', border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '12px 14px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workspace</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Stat label="Datasets" value={datasets.length} />
            <Stat label="Dashboards" value={dashboards.length} />
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardListItem({ dashboard, datasetName, onOpen, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(dashboard.title);

  const handleSave = () => {
    if (tempName.trim()) onRename(tempName.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setTempName(dashboard.title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '6px 8px', margin: '2px 0', borderRadius: 8,
        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
      }}>
        <input
          value={tempName}
          onChange={e => setTempName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
          autoFocus
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
          }}
        />
        <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#10b981', display: 'flex' }}>
          <Check size={14} />
        </button>
        <button onClick={handleCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#f43f5e', display: 'flex' }}>
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', margin: '2px 0', borderRadius: 8,
        cursor: 'pointer', transition: 'all 0.15s',
        background: 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <LayoutDashboard size={14} style={{ flexShrink: 0, opacity: 0.5, color: 'var(--text-secondary)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {dashboard.title}
        </div>
        <div style={{
          fontSize: 10, color: 'var(--text-muted)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {datasetName}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); setEditing(true); }}
        title="Rename"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: 'var(--text-muted)', opacity: 0.5, display: 'flex', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--accent-primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <Pencil size={12} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title="Delete"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: 'var(--text-muted)', opacity: 0.5, display: 'flex', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--accent-rose)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-accent)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
