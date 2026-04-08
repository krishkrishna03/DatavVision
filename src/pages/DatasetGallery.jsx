import { useDataStore, useDashboardStore } from '../store/store';
import { useNavigate } from 'react-router-dom';
import { Database, FileSpreadsheet, Trash2, ArrowRight } from 'lucide-react';

export default function DatasetGallery() {
  const datasets = useDataStore(s => s.datasets);
  const removeDataset = useDataStore(s => s.removeDataset);
  const dashboards = useDashboardStore(s => s.dashboards);
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>My Datasets</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your imported data sources and seamlessly jump back into your dashboards.</p>
        </div>
        
        <button className="btn btn-primary" onClick={() => navigate('/upload')}>
          <Database size={16} /> Import New Dataset
        </button>
      </div>

      {datasets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <FileSpreadsheet size={32} color="var(--accent-primary)" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No datasets found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>You haven't uploaded any data yet. Import a file to generate your first dashboard.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
            Go to Import
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
          {datasets.map(dataset => {
            const hasDashboard = dashboards.some(d => d.datasetId === dataset.id);
            return (
              <div key={dataset.id} className="card hover-glow" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileSpreadsheet size={20} color="var(--accent-emerald)" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 600 }}>{dataset.name}</h4>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {dataset.fileType} • {(dataset.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeDataset(dataset.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                    title="Delete Dataset"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dataset.rowCount.toLocaleString()}</span> rows
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dataset.columnCount}</span> columns
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
                  {dataset.schema.slice(0, 4).map(col => (
                    <span key={col.key} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: 100, border: '1px solid var(--border-default)' }}>
                      {col.key}
                    </span>
                  ))}
                  {dataset.schema.length > 4 && (
                    <span style={{ fontSize: 11, padding: '2px 8px', color: 'var(--text-muted)' }}>+{dataset.schema.length - 4} more</span>
                  )}
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <button 
                    className={hasDashboard ? "btn btn-primary" : "btn btn-secondary"} 
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => navigate(`/dashboard?dataset=${dataset.id}`)}
                  >
                    {hasDashboard ? 'Open Dashboard' : 'Generate Dashboard'} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
