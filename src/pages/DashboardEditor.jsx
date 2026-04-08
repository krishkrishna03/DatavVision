import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataStore, useDashboardStore, useTemplateStore } from '../store/store';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import ChartEditorModal from '../components/dashboard/ChartEditorModal';
import { suggestCharts, buildDefaultLayout } from '../utils/aiSuggester';
import { Lightbulb, Download, Settings, Save, Sparkles, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function DashboardEditor() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset');
  const isNew = searchParams.get('new') === 'true';

  const datasets = useDataStore(s => s.datasets);
  const dashboards = useDashboardStore(s => s.dashboards);
  const createDashboard = useDashboardStore(s => s.createDashboard);
  const updateDashboard = useDashboardStore(s => s.updateDashboard);
  const setActiveDashboard = useDashboardStore(s => s.setActiveDashboard);
  const activeDashboardId = useDashboardStore(s => s.activeDashboardId);
  const updateChart = useDashboardStore(s => s.updateChart);
  const saveTemplateStore = useTemplateStore(s => s.saveTemplate);

  const [loading, setLoading] = useState(isNew);
  const [editingChartId, setEditingChartId] = useState(null);

  const dashboard = dashboards.find(d => d.id === activeDashboardId);
  const dataset = datasets.find(d => d.id === (datasetId || (dashboard ? dashboard.datasetId : null)));

  // Auto-generate if new
  useEffect(() => {
    let timer;
    // We should generate if it's new, we have a dataset, and we don't already have a dashboard for this exact dataset
    const existingForDataset = dashboards.find(d => d.datasetId === datasetId);
    
    if (isNew && dataset && !existingForDataset) {
      timer = setTimeout(() => {
        try {
          const generated = suggestCharts(dataset.schema, dataset.data);
          const layout = buildDefaultLayout(generated);
          const id = createDashboard(dataset.id, generated, layout, `${dataset.name} Overview`);
          setActiveDashboard(id);
          
          // removed insights generation since it was deleted from UI
          
        } catch (err) {
          console.error("Error generating dashboard charts:", err);
        } finally {
          setLoading(false);
        }
      }, 1500); // simulate AI processing delay for UX
    } else if (existingForDataset) {
      if (existingForDataset.id !== activeDashboardId) {
        setActiveDashboard(existingForDataset.id);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
    
    return () => { if (timer) clearTimeout(timer); };
  }, [isNew, dataset, activeDashboardId, datasetId, createDashboard, setActiveDashboard, dashboards]);

  const handleLayoutChange = (newLayout) => {
    if (activeDashboardId) {
      updateDashboard(activeDashboardId, { layout: newLayout });
    }
  };

  const handleExport = async () => {
    const el = document.getElementById('dashboard-export-area');
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: '#0a0d14' });
    const link = document.createElement('a');
    link.download = `DataVision_${dashboard?.title || 'Export'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (loading) {
    return (
      <div style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles className="animate-pulse-glow" size={48} color="var(--accent-primary)" style={{ marginBottom: 20 }} />
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>AI is generating your dashboard...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Analyzing patterns, detecting anomalies, and picking the best charts.</p>
      </div>
    );
  }

  const handleManualGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const generated = suggestCharts(dataset.schema, dataset.data);
        const layout = buildDefaultLayout(generated);
        const id = createDashboard(dataset.id, generated, layout, `${dataset.name} Overview`);
        setActiveDashboard(id);
      } catch (err) {
        console.error("Error generating dashboard charts:", err);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  if (!dashboard) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
        <h3>Dashboard Not Found</h3>
        {dataset ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              We have your dataset ("{dataset.name}"), but the dashboard generation failed or hasn't completed.
            </p>
            <button className="btn btn-primary" onClick={handleManualGenerate}>
              <Sparkles size={16} /> Generate Dashboard Now
            </button>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Please upload a dataset first.</p>
        )}
      </div>
    );
  }

  const handleAddChart = () => {
    const newChartId = crypto.randomUUID();
    const newChart = { id: newChartId, type: 'bar', title: 'New Chart', xKey: '', yKey: '' };
    const newLayoutItem = { i: newChartId, x: 0, y: Infinity, w: 6, h: 4, minW: 3, minH: 3 };
    
    updateDashboard(dashboard.id, {
      charts: [...dashboard.charts, newChart],
      layout: [...dashboard.layout, newLayoutItem]
    });
    setEditingChartId(newChartId);
  };

  const handleRemoveChart = (id) => {
    updateDashboard(dashboard.id, {
      charts: dashboard.charts.filter(c => c.id !== id),
      layout: dashboard.layout.filter(l => l.i !== id)
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 24, paddingBottom: 60, maxWidth: 1400, margin: '0 auto' }}>
      {/* Main Grid View */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Editor Toolbar */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          marginBottom: 20, padding: '16px 20px', borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)'
        }}>
          <div>
            <input 
              value={dashboard.title} 
              onChange={(e) => updateDashboard(dashboard.id, { title: e.target.value })}
              style={{ fontSize: 20, fontWeight: 700, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: 300 }}
              placeholder="Dashboard Title"
            />
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              From dataset: <span style={{ color: 'var(--text-accent)' }}>{dataset?.name}</span> • {dashboard.charts.length} components
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleAddChart}>
              <Lightbulb size={14} /> Add Chart
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Download size={14} /> Export PNG
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => {
                saveTemplateStore(dashboard, { title: dashboard.title });
                alert('Saved to Templates!');
              }}
            >
              <Save size={14} /> Save Template
            </button>
          </div>
        </div>

        {/* Dashboard Surface */}
        <div id="dashboard-export-area" style={{ padding: 10, background: 'var(--bg-base)', borderRadius: 'var(--radius-xl)' }}>
          <DashboardGrid 
            charts={dashboard.charts} 
            layout={dashboard.layout} 
            data={dataset?.data}
            onLayoutChange={handleLayoutChange}
            onRemoveChart={handleRemoveChart}
            onEditChart={(id) => setEditingChartId(id)}
          />
        </div>
      </div>

      <ChartEditorModal 
        isOpen={!!editingChartId} 
        onClose={() => setEditingChartId(null)} 
        chart={dashboard.charts.find(c => c.id === editingChartId)} 
        dataset={dataset} 
        onSave={(chartId, updates) => updateChart(dashboard.id, chartId, updates)} 
      />
    </div>
  );
}
