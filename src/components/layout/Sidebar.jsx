import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, LayoutTemplate, Database, Sparkles, Settings, ChevronRight, Zap } from 'lucide-react';
import { useDataStore, useDashboardStore } from '../../store/store';

const nav = [
  { to: '/',          label: 'Home',       icon: Zap },
  { to: '/upload',    label: 'Upload Data', icon: Upload },
  { to: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/templates', label: 'Templates',   icon: LayoutTemplate },
  { to: '/datasets',  label: 'My Datasets', icon: Database },
];

export default function Sidebar() {
  const datasets   = useDataStore(s => s.datasets);
  const dashboards = useDashboardStore(s => s.dashboards);

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'linear-gradient(180deg, #0d1422 0%, #0a0d14 100%)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100, padding: '24px 0',
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
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
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

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-accent)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
