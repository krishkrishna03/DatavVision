import { useState, useEffect } from 'react';
import { X, Palette } from 'lucide-react';
import { aggregateBy } from '../../utils/aiSuggester';

const COLOR_PRESETS = [
  { name: 'Indigo', bg: 'rgba(99,102,241,0.1)', accent: 'rgba(99,102,241,0.8)' },
  { name: 'Blue', bg: 'rgba(59,130,246,0.1)', accent: 'rgba(59,130,246,0.8)' },
  { name: 'Green', bg: 'rgba(34,197,94,0.1)', accent: 'rgba(34,197,94,0.8)' },
  { name: 'Purple', bg: 'rgba(147,51,234,0.1)', accent: 'rgba(147,51,234,0.8)' },
  { name: 'Orange', bg: 'rgba(249,115,22,0.1)', accent: 'rgba(249,115,22,0.8)' },
  { name: 'Pink', bg: 'rgba(236,72,153,0.1)', accent: 'rgba(236,72,153,0.8)' },
  { name: 'Red', bg: 'rgba(239,68,68,0.1)', accent: 'rgba(239,68,68,0.8)' },
  { name: 'Cyan', bg: 'rgba(34,211,238,0.1)', accent: 'rgba(34,211,238,0.8)' },
];

export default function ChartEditorModal({ isOpen, onClose, chart, dataset, onSave }) {
  const [formData, setFormData] = useState({
    title: '', type: 'bar', xKey: '', yKey: '', bgColor: '', accentColor: '', format: 'raw',
    showSum: true, showAvg: true, showMax: true, showMin: false, showCount: false
  });

  useEffect(() => {
    if (chart && isOpen) {
      setFormData({
        title: chart.title || '',
        type: chart.type || 'bar',
        xKey: chart.xKey || chart.nameKey || '',
        yKey: chart.yKey || chart.valueKey || chart.column || '',
        bgColor: chart.bgColor || 'rgba(99,102,241,0.1)',
        accentColor: chart.accentColor || 'rgba(99,102,241,0.8)',
        format: chart.format || 'raw',
        showSum: chart.showSum !== false,
        showAvg: chart.showAvg !== false,
        showMax: chart.showMax !== false,
        showMin: chart.showMin || false,
        showCount: chart.showCount || false,
      });
    }
  }, [chart, isOpen]);

  if (!isOpen || !chart) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleToggleStat = (stat) => {
    setFormData(prev => ({ ...prev, [stat]: !prev[stat] }));
  };

  const handleColorPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      bgColor: preset.bg,
      accentColor: preset.accent
    }));
  };

  const handleSave = () => {
    let newData = undefined;
    let extraUpdates = {};

    if (dataset?.data) {
      if (formData.type === 'kpi') {
        const values = dataset.data.map(r => parseFloat(r[formData.yKey])).filter(n => !isNaN(n));
        const total = values.reduce((a, b) => a + b, 0);
        const avg = total / values.length || 0;
        const max = Math.max(...values, 0);
        const min = Math.min(...values, Infinity);
        const count = values.length;
        extraUpdates = {
          value: total,
          avg,
          max,
          min: min === Infinity ? 0 : min,
          count,
          format: formData.format,
          column: formData.yKey,
          bgColor: formData.bgColor,
          accentColor: formData.accentColor,
          showSum: formData.showSum,
          showAvg: formData.showAvg,
          showMax: formData.showMax,
          showMin: formData.showMin,
          showCount: formData.showCount,
        };
      } else if (formData.type === 'scatter' || formData.type === 'line') {
        newData = dataset.data.slice(0, 200).map(r => ({
          [formData.xKey]: parseFloat(r[formData.xKey]) || r[formData.xKey],
          [formData.yKey]: parseFloat(r[formData.yKey]) || 0,
        }));
      } else {
        newData = aggregateBy(dataset.data, formData.xKey, formData.yKey);
      }
    }

    const updates = {
      title: formData.title,
      type: formData.type,
      xKey: formData.xKey,
      yKey: formData.yKey,
      nameKey: formData.xKey,
      valueKey: formData.yKey,
      data: newData,
      ...extraUpdates
    };
    onSave(chart.id, updates);
    onClose();
  };

  const schemaColumns = dataset?.schema?.map(c => c.key) || [];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
    }}>
      <div className="card" style={{ width: 520, background: 'var(--bg-base)', padding: 28, borderRadius: 14, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 'bold' }}>Edit {formData.type === 'kpi' ? 'KPI Card' : 'Chart'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.color = 'var(--text-primary)'} onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>Title</label>
            <input 
              name="title" value={formData.title} onChange={handleChange}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: '#fff', fontSize: 14 }}
              placeholder="Enter chart title"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>Chart Type</label>
            <select 
              name="type" value={formData.type} onChange={handleChange}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: '#fff', fontSize: 14 }}
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="scatter">Scatter Chart</option>
              <option value="kpi">KPI Card</option>
              <option value="table">Table</option>
            </select>
          </div>

          {/* Show different fields based on chart type */}
          {formData.type === 'kpi' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>📊 Metric Column</label>
                <select 
                  name="yKey" value={formData.yKey} onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', borderRadius: 8, color: '#fff', fontSize: 14 }}
                >
                  <option value="">-- Select Column --</option>
                  {dataset?.schema?.filter(c => c.type === 'numeric').map(col => <option key={col.key} value={col.key}>{col.key}</option>)}
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Only numeric columns are shown</div>
              </div>

              <div style={{ padding: '14px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>📊 Choose Display Metrics:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Sum */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: formData.showSum ? 'rgba(99,102,241,0.15)' : 'transparent', borderRadius: 6, transition: 'all 0.2s' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.showSum} 
                      onChange={() => handleToggleStat('showSum')}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                    />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>Σ</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Sum of {formData.yKey || 'column'}</span>
                    </div>
                  </label>

                  {/* Average */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: formData.showAvg ? 'rgba(99,102,241,0.15)' : 'transparent', borderRadius: 6, transition: 'all 0.2s' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.showAvg} 
                      onChange={() => handleToggleStat('showAvg')}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                    />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>∅</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Average</span>
                    </div>
                  </label>

                  {/* Maximum */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: formData.showMax ? 'rgba(99,102,241,0.15)' : 'transparent', borderRadius: 6, transition: 'all 0.2s' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.showMax} 
                      onChange={() => handleToggleStat('showMax')}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                    />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>↑</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Maximum value</span>
                    </div>
                  </label>

                  {/* Minimum */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: formData.showMin ? 'rgba(99,102,241,0.15)' : 'transparent', borderRadius: 6, transition: 'all 0.2s' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.showMin} 
                      onChange={() => handleToggleStat('showMin')}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                    />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>↓</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Minimum value</span>
                    </div>
                  </label>

                  {/* Count */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: formData.showCount ? 'rgba(99,102,241,0.15)' : 'transparent', borderRadius: 6, transition: 'all 0.2s' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.showCount} 
                      onChange={() => handleToggleStat('showCount')}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                    />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>#</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Count of records</span>
                    </div>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>X-Axis / Label Column</label>
                <select 
                  name="xKey" value={formData.xKey} onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: '#fff', fontSize: 14 }}
                >
                  <option value="">-- Select Column --</option>
                  {schemaColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>Y-Axis / Value Column</label>
                <select 
                  name="yKey" value={formData.yKey} onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: '#fff', fontSize: 14 }}
                >
                  <option value="">-- Select Column --</option>
                  {schemaColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            </>
          )}

          {formData.type === 'kpi' && (
            <>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <Palette size={16} /> Card Color Theme
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => handleColorPreset(preset)}
                      style={{
                        padding: '12px 8px',
                        background: preset.bg,
                        border: formData.bgColor === preset.bg ? '2px solid rgba(99,102,241,1)' : '1px solid var(--border-default)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.background = `linear-gradient(135deg, ${preset.bg}, ${preset.accent})`; }}
                      onMouseLeave={e => { e.target.style.borderColor = formData.bgColor === preset.bg ? '2px solid rgba(99,102,241,1)' : '1px solid var(--border-default)'; e.target.style.background = preset.bg; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 4, background: preset.accent, opacity: 0.8 }} />
                        {preset.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)' }}>Number Format</label>
                <select 
                  name="format" value={formData.format} onChange={handleChange}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, color: '#fff', fontSize: 14 }}
                >
                  <option value="raw">Raw (1000)</option>
                  <option value="K">Thousands (1K)</option>
                  <option value="M">Millions (1M)</option>
                  <option value="pct">Percentage (%)</option>
                </select>
              </div>
            </>
          )}

          <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 8, padding: '12px 16px', fontWeight: 600 }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
