import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataStore, useDashboardStore, useTemplateStore } from '../store/store';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import ChartWidget from '../components/charts/ChartWidget';
import ChartEditorModal from '../components/dashboard/ChartEditorModal';
import SlicerPanel from '../components/dashboard/SlicerPanel';
import { suggestCharts, buildDefaultLayout } from '../utils/aiSuggester';
import { applyFilters, recomputeAllCharts } from '../utils/chartDataProcessor';
import { generateAnalysisReport } from '../utils/reportGenerator';
import { Lightbulb, Download, Save, Sparkles, AlertCircle, Maximize2, Minimize2, FileText } from 'lucide-react';
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
  const [fullscreen, setFullscreen] = useState(false);
  const [filters, setFilters] = useState({});
  const [timeline, setTimeline] = useState(null);
  const [reportGenerating, setReportGenerating] = useState(false);

  const dashboard = dashboards.find(d => d.id === activeDashboardId);
  const dataset = datasets.find(d => d.id === (datasetId || (dashboard ? dashboard.datasetId : null)));

  useEffect(() => {
    document.body.classList.add('fullscreen');
    return () => document.body.classList.remove('fullscreen');
  }, []);

  useEffect(() => {
    if (fullscreen) {
      document.body.classList.add('dashboard-fullscreen');
      document.querySelector('.sidebar')?.classList.add('hidden');
    } else {
      document.body.classList.remove('dashboard-fullscreen');
      document.querySelector('.sidebar')?.classList.remove('hidden');
    }
    return () => {
      document.body.classList.remove('dashboard-fullscreen');
      document.querySelector('.sidebar')?.classList.remove('hidden');
    };
  }, [fullscreen]);

  // Reset filters when dataset changes
  useEffect(() => {
    setFilters({});
    setTimeline(null);
  }, [dataset?.id]);

  // Auto-generate if new
  useEffect(() => {
    let timer;
    const existingForDataset = dashboards.find(d => d.datasetId === datasetId);
    
    if (isNew && dataset && !existingForDataset) {
      timer = setTimeout(() => {
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
      }, 1500);
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

  // Compute filtered data and recomputed charts
  const { filteredData, displayCharts } = useMemo(() => {
    if (!dataset?.data) return { filteredData: [], displayCharts: [] };
    const filtered = applyFilters(dataset.data, filters, timeline);
    if (dashboard?.charts) {
      const recomputed = recomputeAllCharts(dashboard.charts, filtered);
      return { filteredData: filtered, displayCharts: recomputed };
    }
    return { filteredData: filtered, displayCharts: [] };
  }, [dataset?.data, filters, timeline, dashboard?.charts]);

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

  const handleGenerateReport = async () => {
    if (!dataset || !dashboard) return;
    setReportGenerating(true);
    try {
      await generateAnalysisReport(dataset, dashboard.charts, { filters, timeline });
    } catch (err) {
      console.error('Report generation failed:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setReportGenerating(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({});
    setTimeline(null);
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

  const filteredCount = dataset?.data?.length || 0;
  const showingCount = filteredData.length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: fullscreen ? 0 : 60, height: fullscreen ? '100vh' : 'auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Editor Toolbar */}
      {!fullscreen && (
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          marginBottom: 28, padding: '20px 36px', borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)'
        }}>
          <div style={{ flex: 1 }}>
            <input 
              value={dashboard.title} 
              onChange={(e) => updateDashboard(dashboard.id, { title: e.target.value })}
              style={{ fontSize: 26, fontWeight: 800, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', maxWidth: 500, letterSpacing: '-0.6px' }}
              placeholder="Dashboard Title"
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{dataset?.name}</span> • Showing {showingCount.toLocaleString()} of {filteredCount.toLocaleString()} rows • {dataset?.schema?.length || 0} columns
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleAddChart}>
              <Lightbulb size={14} /> Add
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Download size={14} /> Export
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleGenerateReport}
              disabled={reportGenerating}
              style={{ opacity: reportGenerating ? 0.6 : 1 }}
            >
              {reportGenerating ? <Sparkles size={14} className="animate-spin" /> : <FileText size={14} />}
              {reportGenerating ? ' Generating...' : ' Report'}
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => {
                saveTemplateStore(dashboard, { title: dashboard.title });
                alert('Template saved!');
              }}
            >
              <Save size={14} /> Save
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setFullscreen(!fullscreen)}>
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Toolbar */}
      {fullscreen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 60, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: 'rgba(10,13,20,0.95)', borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{dashboard.title}</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Download size={14} /> Export
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleGenerateReport}
              disabled={reportGenerating}
            >
              {reportGenerating ? <Sparkles size={14} className="animate-spin" /> : <FileText size={14} />}
              {reportGenerating ? ' Generating...' : ' Report'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setFullscreen(false)}>
              <Minimize2 size={14} /> Exit Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Slicer Panel & Timeline */}
      {!fullscreen && dataset && (
        <SlicerPanel
          dataset={dataset}
          filters={filters}
          setFilters={setFilters}
          timeline={timeline}
          setTimeline={setTimeline}
          onReset={handleResetFilters}
        />
      )}

      {/* Dashboard Surface */}
      <div id="dashboard-export-area" style={{ 
        flex: 1, 
        padding: fullscreen ? '80px 40px 40px 40px' : '24px 40px', 
        background: 'var(--bg-base)', 
        borderRadius: fullscreen ? 0 : 'var(--radius-xl)',
        height: fullscreen ? '100vh' : 'auto',
        overflow: fullscreen ? 'auto' : 'visible',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* KPI Section */}
        {displayCharts.filter(c => c.type === 'kpi').length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 16 }}>Key Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {displayCharts.filter(c => c.type === 'kpi').map((chart) => (
                <div key={chart.id} style={{ borderRadius: 12, overflow: 'hidden', height: 140 }}>
                  <ChartWidget
                    chart={chart}
                    data={filteredData}
                    onRemove={() => handleRemoveChart(chart.id)}
                    onEdit={() => setEditingChartId(chart.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        {displayCharts.filter(c => c.type !== 'kpi' && c.type !== 'table').length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 16 }}>Analysis & Insights</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
              {displayCharts.filter(c => c.type !== 'kpi' && c.type !== 'table').map((chart) => (
                <div key={chart.id} style={{ 
                  borderRadius: 12, 
                  overflow: 'hidden', 
                  height: 320
                }}>
                  <ChartWidget
                    chart={chart}
                    data={filteredData}
                    onRemove={() => handleRemoveChart(chart.id)}
                    onEdit={() => setEditingChartId(chart.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Table Section */}
        {displayCharts.find(c => c.type === 'table') && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 16 }}>Data Preview</div>
            <DashboardGrid 
              charts={displayCharts.filter(c => c.type === 'table')} 
              layout={dashboard.layout.filter(l => dashboard.charts.find(c => c.id === l.i && c.type === 'table'))} 
              data={filteredData}
              onLayoutChange={handleLayoutChange}
              onRemoveChart={handleRemoveChart}
              onEditChart={(id) => setEditingChartId(id)}
            />
          </div>
        )}
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
