import { useTemplateStore, useDashboardStore, useDataStore } from '../store/store';
import { useNavigate } from 'react-router-dom';
import { Copy, Trash, BarChart2 } from 'lucide-react';

export default function TemplateGallery() {
  const templates = useTemplateStore(s => s.templates);
  const deleteTemplate = useTemplateStore(s => s.deleteTemplate);
  const incrementUse = useTemplateStore(s => s.incrementUse);
  
  const createDashboard = useDashboardStore(s => s.createDashboard);
  const setActiveDashboard = useDashboardStore(s => s.setActiveDashboard);
  const activeDatasetId = useDataStore(s => s.activeDatasetId);
  const navigate = useNavigate();

  const handleUseTemplate = (template) => {
    if (!activeDatasetId) {
      alert("Please upload a dataset first before using a template.");
      navigate('/upload');
      return;
    }
    
    // Create a new dashboard from this template
    const newId = createDashboard(activeDatasetId, template.charts, template.layout, `Copy of ${template.title || 'Template'}`);
    incrementUse(template.id);
    setActiveDashboard(newId);
    navigate(`/dashboard?dataset=${activeDatasetId}`);
  };

  return (
    <div style={{ padding: 40, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Template Gallery</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 30 }}>
        Saved dashboard layouts that you can reuse across different datasets.
      </p>

      {templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No templates saved yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ background: 'var(--accent-primary)', padding: 8, borderRadius: 8, color: '#fff' }}>
                  <BarChart2 size={20} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t.title || 'Untitled Template'}</h3>
              </div>
              
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, flex: 1 }}>
                Contains {t.charts.length} components. 
                <br/>
                Used {t.useCount} times.
                <br/>
                {new Date(t.createdAt).toLocaleDateString()}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '8px', fontSize: 13, justifyContent: 'center' }}
                  onClick={() => handleUseTemplate(t)}
                >
                  <Copy size={14} /> Use Template
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '8px', color: 'var(--accent-rose)' }}
                  onClick={() => deleteTemplate(t.id)}
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
