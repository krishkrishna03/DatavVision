import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Trash2, Upload, Calendar, BarChart3 } from 'lucide-react';
import { useDataStore, useDashboardStore } from '../store/store';

export default function DashboardGallery() {
  const navigate = useNavigate();
  const datasets = useDataStore(s => s.datasets);
  const dashboards = useDashboardStore(s => s.dashboards);
  const setActiveDashboard = useDashboardStore(s => s.setActiveDashboard);
  const deleteDashboard = useDashboardStore(s => s.deleteDashboard);

  const handleOpen = (id) => {
    setActiveDashboard(id);
    navigate('/dashboard');
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this dashboard? This cannot be undone.')) {
      deleteDashboard(id);
    }
  };

  if (dashboards.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <LayoutDashboard size={36} color="var(--accent-primary)" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>No dashboards yet</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 400, marginBottom: 28 }}>
          Upload a dataset and our AI will generate a dashboard for you automatically.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/upload')} style={{ gap: 8 }}>
          <Upload size={16} /> Upload Data
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>My Dashboards</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            {dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''} • Click to open
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')} style={{ gap: 6 }}>
          <Upload size={14} /> New Dashboard
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {dashboards.map(d => {
          const dataset = datasets.find(ds => ds.id === d.datasetId);
          const chartCount = d.charts?.length || 0;
          const kpiCount = d.charts?.filter(c => c.type === 'kpi').length || 0;
          const created = new Date(d.createdAt).toLocaleDateString();

          return (
            <div
              key={d.id}
              onClick={() => handleOpen(d.id)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)', padding: 24, cursor: 'pointer',
                transition: 'all 0.2s', position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Icon + Delete */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.15))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <LayoutDashboard size={20} color="var(--accent-primary)" />
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(d.id); }}
                  title="Delete"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                    color: 'var(--text-muted)', borderRadius: 6, display: 'flex',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-rose)'; e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Title */}
              <h3 style={{
                fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {d.title}
              </h3>

              {/* Dataset name */}
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {dataset?.name || 'Unknown dataset'}
              </p>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <Stat icon={BarChart3} label="Charts" value={chartCount} />
                <Stat icon={LayoutDashboard} label="KPIs" value={kpiCount} />
                <Stat icon={Calendar} label="Created" value={created} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon size={12} color="var(--text-muted)" />
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}:</span>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
