import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Sparkles } from 'lucide-react';

const ROUTE_LABELS = {
  '/':          { title: 'Welcome back', sub: 'Your AI-powered analytics workspace' },
  '/upload':    { title: 'Upload Dataset',   sub: 'Import CSV, Excel or JSON files' },
  '/dashboard': { title: 'Dashboard Editor', sub: 'Drag, edit and customize your charts' },
  '/dashboards':{ title: 'My Dashboards',     sub: 'Select a dashboard to view or edit' },
  '/templates': { title: 'Template Gallery', sub: 'Browse and reuse dashboard templates' },
  '/datasets':  { title: 'My Datasets',      sub: 'All your uploaded data files' },
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { title, sub } = ROUTE_LABELS[pathname] || { title: 'DataVision', sub: '' };

  return (
    <header style={{
      padding: '20px 28px',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex', alignItems: 'center', gap: 20,
      background: 'rgba(10,13,20,0.8)', backdropFilter: 'blur(20px)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Titles */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', width: 260 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input"
          placeholder="Search dashboards..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: 34, fontSize: 13, height: 36 }}
        />
      </div>

      {/* AI badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 100,
        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
        fontSize: 12, fontWeight: 600, color: 'var(--text-accent)',
      }}>
        <Sparkles size={13} />
        AI Active
      </div>

      {/* New dashboard */}
      <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')} style={{ gap: 6 }}>
        <Plus size={14} /> New
      </button>
    </header>
  );
}
