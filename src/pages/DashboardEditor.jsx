import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataStore, useDashboardStore, useTemplateStore } from '../store/store';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import ChartWidget from '../components/charts/ChartWidget';
import ChartEditorModal from '../components/dashboard/ChartEditorModal';
import SlicerPanel from '../components/dashboard/SlicerPanel';
import { runAnalysis } from '../analysis/engine';
import { generateAnalysisReport } from '../report/reportGenerator';
import { Lightbulb, Download, Save, Sparkles, CircleAlert as AlertCircle, Maximize2, Minimize2, FileText, TrendingUp, TrendingDown, TriangleAlert as AlertTriangle, Info, MapPin, ChartBar as BarChart3 } from 'lucide-react';
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
  const [loadingStage, setLoadingStage] = useState('Analyzing dataset...');
  const [editingChartId, setEditingChartId] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [filters, setFilters] = useState({});
  const [timeline, setTimeline] = useState(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [showInsights, setShowInsights] = useState(true);

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

  useEffect(() => {
    setFilters({});
    setTimeline(null);
  }, [dataset?.id]);

  // Auto-generate dashboard using analysis engine
  useEffect(() => {
    let timer;
    const existingForDataset = dashboards.find(d => d.datasetId === datasetId);

    if (isNew && dataset && !existingForDataset) {
      setLoadingStage('Profiling columns and detecting types...');
      timer = setTimeout(() => {
        try {
          setLoadingStage('Computing statistics and KPIs...');
          const analysisResult = runAnalysis(dataset.sample, dataset.columns, {
            datasetName: dataset.name,
            fileType: dataset.fileType,
            fileSize: dataset.sizeBytes,
          });
          setLoadingStage('Generating charts and insights...');
          const layout = buildLayout(analysisResult.charts);
          const id = createDashboard(dataset.id, analysisResult.charts, layout, `${dataset.name} Analysis`, analysisResult);
          setActiveDashboard(id);
        } catch (err) {
          console.error('Analysis failed:', err);
        } finally {
          setLoading(false);
        }
      }, 300);
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

  const dashboardAnalysis = useMemo(() => {
    if (!dataset?.sample || !dataset.columns?.length) return null;

    const storedAnalysis = dashboard?.analysisResult;
    if (storedAnalysis?.columnProfiles?.length && storedAnalysis.kpis?.length) {
      return storedAnalysis;
    }

    return runAnalysis(dataset.sample, dataset.columns, {
      datasetName: dataset.name,
      fileType: dataset.fileType,
      fileSize: dataset.sizeBytes,
    });
  }, [dataset?.id, dataset?.sample, dataset?.columns, dataset?.name, dataset?.fileType, dataset?.sizeBytes, dashboard?.analysisResult]);

  // Compute filtered data from the current dataset and always keep KPI/filter metadata available.
  const { filteredData, displayCharts, filteredAnalysis } = useMemo(() => {
    if (!dataset?.sample) return { filteredData: [], displayCharts: [], filteredAnalysis: null };

    const filtered = applyFilters(dataset.sample, filters, timeline);
    const hasFilters = Object.values(filters).some(value => Array.isArray(value) && value.length > 0) || Boolean(timeline);

    if (dashboard?.charts) {
      if (hasFilters) {
        const analysis = runAnalysis(filtered, dataset.columns, {
          datasetName: dataset.name,
          fileType: dataset.fileType,
          fileSize: dataset.sizeBytes,
        });
        return { filteredData: filtered, displayCharts: analysis.charts, filteredAnalysis: analysis };
      }

      const savedCharts = dashboard.charts || [];
      const savedKpis = savedCharts.filter(chart => chart.type === 'kpi');
      const kpis = savedKpis.length > 0 ? savedKpis : (dashboardAnalysis?.kpis || []);
      const regularCharts = savedCharts.filter(chart => chart.type !== 'kpi');
      return { filteredData: filtered, displayCharts: [...kpis, ...regularCharts], filteredAnalysis: dashboardAnalysis };
    }

    return { filteredData: filtered, displayCharts: [], filteredAnalysis: dashboardAnalysis };
  }, [dataset?.sample, dataset?.columns, dataset?.name, dataset?.fileType, dataset?.sizeBytes, filters, timeline, dashboard?.charts, dashboardAnalysis]);

  const handleLayoutChange = (newLayout) => {
    if (activeDashboardId) updateDashboard(activeDashboardId, { layout: newLayout });
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
      const analysis = filteredAnalysis || dashboard.analysisResult;
      await generateAnalysisReport(dataset, analysis || dashboard.charts, { filters, timeline });
    } catch (err) {
      console.error('Report generation failed:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setReportGenerating(false);
    }
  };

  const handleResetFilters = () => { setFilters({}); setTimeline(null); };

  if (loading) {
    return (
      <div style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles className="animate-pulse-glow" size={48} color="var(--accent-primary)" style={{ marginBottom: 20 }} />
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>AI is generating your dashboard...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{loadingStage}</p>
      </div>
    );
  }

  const handleManualGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const analysisResult = runAnalysis(dataset.sample, dataset.columns, {
          datasetName: dataset.name, fileType: dataset.fileType, fileSize: dataset.sizeBytes,
        });
        const layout = buildLayout(analysisResult.charts);
        const id = createDashboard(dataset.id, analysisResult.charts, layout, `${dataset.name} Analysis`, analysisResult);
        setActiveDashboard(id);
      } catch (err) {
        console.error('Analysis failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
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
    const newChart = { id: newChartId, type: 'bar', title: 'New Chart', xKey: '', yKey: '', data: [] };
    const newLayoutItem = { i: newChartId, x: 0, y: Infinity, w: 6, h: 4, minW: 3, minH: 3 };
    updateDashboard(dashboard.id, {
      charts: [...dashboard.charts, newChart],
      layout: [...dashboard.layout, newLayoutItem],
    });
    setEditingChartId(newChartId);
  };

  const handleRemoveChart = (id) => {
    updateDashboard(dashboard.id, {
      charts: dashboard.charts.filter(c => c.id !== id),
      layout: dashboard.layout.filter(l => l.i !== id),
    });
  };

  const analysis = filteredAnalysis || dashboard.analysisResult;
  const kpiCharts = displayCharts.filter(c => c.type === 'kpi');
  const regularCharts = displayCharts.filter(c => c.type !== 'kpi' && c.type !== 'table');
  const tableCharts = displayCharts.filter(c => c.type === 'table');
  const insights = analysis?.insights || [];
  const filteredCount = dataset?.rowCount || dataset?.sample?.length || 0;
  const showingCount = filteredData.length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: fullscreen ? 0 : 60, height: fullscreen ? '100vh' : 'auto', width: '100%', boxSizing: 'border-box' }}>
      {!fullscreen && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '16px 24px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)' }}>
          <div style={{ flex: 1 }}>
            <input value={dashboard.title} onChange={(e) => updateDashboard(dashboard.id, { title: e.target.value })} style={{ fontSize: 22, fontWeight: 700, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', maxWidth: 500, letterSpacing: '-0.4px' }} placeholder="Dashboard Title" />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{dataset?.name}</span> • {filteredCount.toLocaleString()} total rows • Showing {showingCount.toLocaleString()} rows • {dataset?.columns?.length || 0} columns
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleAddChart}><Lightbulb size={14} /> Add</button>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export</button>
            <button className="btn btn-primary btn-sm" onClick={handleGenerateReport} disabled={reportGenerating} style={{ opacity: reportGenerating ? 0.6 : 1 }}>
              {reportGenerating ? <Sparkles size={14} className="animate-spin" /> : <FileText size={14} />}
              {reportGenerating ? ' Generating...' : ' Report'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { saveTemplateStore(dashboard, { title: dashboard.title }); alert('Template saved!'); }}><Save size={14} /> Save</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setFullscreen(!fullscreen)}>{fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
          </div>
        </div>
      )}

      {fullscreen && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: 'rgba(10,13,20,0.95)', borderBottom: '1px solid var(--border-subtle)', backdropFilter: 'blur(10px)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{dashboard.title}</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Export</button>
            <button className="btn btn-primary btn-sm" onClick={handleGenerateReport} disabled={reportGenerating}>{reportGenerating ? <Sparkles size={14} className="animate-spin" /> : <FileText size={14} />}{reportGenerating ? ' Generating...' : ' Report'}</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setFullscreen(false)}><Minimize2 size={14} /> Exit Fullscreen</button>
          </div>
        </div>
      )}

      {!fullscreen && dataset && (
        <SlicerPanel dataset={dataset} analysis={filteredAnalysis || dashboardAnalysis} filters={filters} setFilters={setFilters} timeline={timeline} setTimeline={setTimeline} onReset={handleResetFilters} />
      )}

      <div id="dashboard-export-area" style={{ flex: 1, padding: fullscreen ? '80px 40px 40px 40px' : '24px 40px', background: 'var(--bg-base)', borderRadius: fullscreen ? 0 : 'var(--radius-xl)', height: fullscreen ? '100vh' : 'auto', overflow: fullscreen ? 'auto' : 'visible', width: '100%', boxSizing: 'border-box' }}>
        {kpiCharts.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Key Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpiCharts.length, 4)}, 1fr)`, gap: 16 }}>
              {kpiCharts.map((chart) => (
                <div key={chart.id} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 140 }}>
                  <ChartWidget chart={chart} data={filteredData} onRemove={() => handleRemoveChart(chart.id)} onEdit={() => setEditingChartId(chart.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {regularCharts.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Analysis & Visualizations</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
              {regularCharts.map((chart) => (
                <div key={chart.id} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 340 }}>
                  <ChartWidget chart={chart} data={filteredData} onRemove={() => handleRemoveChart(chart.id)} onEdit={() => setEditingChartId(chart.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {showInsights && insights.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Key Insights</div>
              <button className="btn-ghost btn-sm" onClick={() => setShowInsights(false)} style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hide</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 12 }}>
              {insights.slice(0, 6).map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {tableCharts.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Data Preview</div>
            <DashboardGrid charts={tableCharts} layout={dashboard.layout.filter(l => dashboard.charts.find(c => c.id === l.i && c.type === 'table'))} data={filteredData} onLayoutChange={handleLayoutChange} onRemoveChart={handleRemoveChart} onEditChart={(id) => setEditingChartId(id)} />
          </div>
        )}
      </div>

      <ChartEditorModal isOpen={!!editingChartId} onClose={() => setEditingChartId(null)} chart={dashboard.charts.find(c => c.id === editingChartId)} dataset={dataset} onSave={(chartId, updates) => updateChart(dashboard.id, chartId, updates)} />
    </div>
  );
}

function InsightCard({ insight }) {
  const iconMap = {
    'info': <Info size={16} color="var(--accent-primary)" />,
    'trend-up': <TrendingUp size={16} color="#34d399" />,
    'trend-down': <TrendingDown size={16} color="#fb7185" />,
    'outlier': <AlertTriangle size={16} color="#fbbf24" />,
    'distribution': <BarChart3 size={16} color="var(--accent-cyan)" />,
    'correlation': <BarChart3 size={16} color="#a78bfa" />,
    'geographic': <MapPin size={16} color="#f97316" />,
    'quality': <AlertCircle size={16} color="#fb7185" />,
    'statistic': <BarChart3 size={16} color="var(--accent-primary)" />,
  };

  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {iconMap[insight.type] || <Info size={16} color="var(--accent-primary)" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{insight.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{insight.body}</div>
      </div>
    </div>
  );
}

function buildLayout(charts) {
  return charts.map((c, i) => ({
    i: c.id,
    x: i % 2,
    y: Math.floor(i / 2),
    w: 6,
    h: 4,
    minW: 3,
    minH: 3,
  }));
}

function applyFilters(rows, filters = {}, timeline = null) {
  if (!rows || rows.length === 0) return [];
  let result = rows;
  if (timeline && timeline.column && timeline.start && timeline.end) {
    const startMs = new Date(timeline.start).getTime();
    const endMs = new Date(timeline.end).getTime();
    result = result.filter((r) => {
      const v = r[timeline.column];
      if (v === null || v === undefined || v === '') return false;
      const t = new Date(v).getTime();
      return !isNaN(t) && t >= startMs && t <= endMs;
    });
  }
  const activeKeys = Object.keys(filters).filter(k => Array.isArray(filters[k]) && filters[k].length > 0);
  for (const key of activeKeys) {
    const selected = new Set(filters[key].map(String));
    result = result.filter((r) => {
      const v = r[key];
      if (v === null || v === undefined || v === '') return false;
      return selected.has(String(v));
    });
  }
  return result;
}
