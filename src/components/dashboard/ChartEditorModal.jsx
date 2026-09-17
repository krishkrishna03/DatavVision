import { useState, useEffect } from 'react';
import { X, Palette } from 'lucide-react';
import { aggregateBy } from '../../utils/aiSuggester';

const COLOR_PRESETS = [
  { name: 'Indigo', bg: 'rgba(99,102,241,0.1)', accent: 'rgba(99,102,241,0.8)' },
  { name: 'Blue', bg: 'rgba(59,130,246,0.1)', accent: 'rgba(59,130,246,0.8)' },
  { name: 'Green', bg: 'rgba(34,197,94,0.1)', accent: 'rgba(34,197,94,0.8)' },
  { name: 'Orange', bg: 'rgba(249,115,22,0.1)', accent: 'rgba(249,115,22,0.8)' },
  { name: 'Pink', bg: 'rgba(236,72,153,0.1)', accent: 'rgba(236,72,153,0.8)' },
  { name: 'Red', bg: 'rgba(239,68,68,0.1)', accent: 'rgba(239,68,68,0.8)' },
  { name: 'Cyan', bg: 'rgba(34,211,238,0.1)', accent: 'rgba(34,211,238,0.8)' },
  { name: 'Teal', bg: 'rgba(20,184,166,0.1)', accent: 'rgba(20,184,166,0.8)' },
];

const inputStyle = {
  width: '100%', padding: '8px 10px', background: 'var(--bg-base)',
  border: '1px solid var(--border-default)', borderRadius: 6,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
};

const labelStyle = {
  display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)',
};

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
    setFormData(prev => ({ ...prev, bgColor: preset.bg, accentColor: preset.accent }));
  };

  const handleSave = () => {
    let newData = undefined;
    let extraUpdates = {};
    const data = dataset?.sample || [];

    if (data.length > 0) {
      if (formData.type === 'kpi') {
        const values = data.map(r => parseFloat(r[formData.yKey])).filter(n => !isNaN(n));
        if (values.length > 0) {
          const total = values.reduce((a, b) => a + b, 0);
          const avg = total / values.length;
          const max = values.reduce((m, v) => Math.max(m, v), -Infinity);
          const min = values.reduce((m, v) => Math.min(m, v), Infinity);
          extraUpdates = {
            value: total, avg, max, min: min === Infinity ? 0 : min, count: values.length,
            format: formData.format, column: formData.yKey,
            bgColor: formData.bgColor, accentColor: formData.accentColor,
            showSum: formData.showSum, showAvg: formData.showAvg,
            showMax: formData.showMax, showMin: formData.showMin, showCount: formData.showCount,
          };
        }
      } else if (formData.type === 'scatter' || formData.type === 'line') {
        newData = data.slice(0, 200).map(r => ({
          [formData.xKey]: parseFloat(r[formData.xKey]) || r[formData.xKey],
          [formData.yKey]: parseFloat(r[formData.yKey]) || 0,
        }));
      } else if (formData.type === 'pie' || formData.type === 'donut') {
        newData = aggregateBy(data, formData.xKey, formData.yKey).slice(0, 8);
      } else if (formData.xKey && formData.yKey) {
        newData = aggregateBy(data, formData.xKey, formData.yKey);
      }
    }

    const updates = {
      title: formData.title, type: formData.type,
      xKey: formData.xKey, yKey: formData.yKey,
      nameKey: formData.xKey, valueKey: formData.yKey,
      data: newData, ...extraUpdates
    };
    onSave(chart.id, updates);
    onClose();
  };

  const columns = dataset?.columns || [];
  const profiles = dataset?.analysisResult?.columnProfiles || [];
  const numericColumns = profiles.filter(p => p.role === 'NUMERIC_MEASURE' || p.role === 'CURRENCY' || p.role === 'COUNT' || p.role === 'DURATION' || p.role === 'PERCENTAGE').map(p => p.column);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} />

      <div style={{
        position: 'fixed', top: 80, right: 24, width: 380,
        maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 9999, padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Edit {formData.type === 'kpi' ? 'KPI Card' : 'Chart'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input name="title" value={formData.title} onChange={handleChange} style={inputStyle} placeholder="Enter chart title" />
          </div>

          <div>
            <label style={labelStyle}>Chart Type</label>
            <select name="type" value={formData.type} onChange={handleChange} style={inputStyle}>
              <option value="bar">Bar Chart</option>
              <option value="stacked-bar">Stacked Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="donut">Donut Chart</option>
              <option value="scatter">Scatter Chart</option>
              <option value="kpi">KPI Card</option>
              <option value="table">Table</option>
            </select>
          </div>

          {formData.type === 'kpi' ? (
            <>
              <div>
                <label style={labelStyle}>Metric Column</label>
                <select name="yKey" value={formData.yKey} onChange={handleChange} style={{ ...inputStyle, borderColor: 'var(--accent-primary)' }}>
                  <option value="">-- Select Column --</option>
                  {(numericColumns.length > 0 ? numericColumns : columns).map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Display Metrics</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'showSum', label: 'Sum' },
                    { key: 'showAvg', label: 'Average' },
                    { key: 'showMax', label: 'Maximum' },
                    { key: 'showMin', label: 'Minimum' },
                    { key: 'showCount', label: 'Count' },
                  ].map(stat => (
                    <label key={stat.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 8px', background: formData[stat.key] ? 'rgba(99,102,241,0.08)' : 'transparent', borderRadius: 5, transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={formData[stat.key]} onChange={() => handleToggleStat(stat.key)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{stat.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={labelStyle}>X-Axis / Label Column</label>
                <select name="xKey" value={formData.xKey} onChange={handleChange} style={inputStyle}>
                  <option value="">-- Select Column --</option>
                  {columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Y-Axis / Value Column</label>
                <select name="yKey" value={formData.yKey} onChange={handleChange} style={inputStyle}>
                  <option value="">-- Select Column --</option>
                  {columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            </>
          )}

          {formData.type === 'kpi' && (
            <>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Palette size={14} /> Card Color Theme
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {COLOR_PRESETS.map(preset => (
                    <button key={preset.name} onClick={() => handleColorPreset(preset)}
                      style={{
                        padding: '8px 4px', background: preset.bg,
                        border: formData.bgColor === preset.bg ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
                        borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: preset.accent }} />
                        {preset.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Number Format</label>
                <select name="format" value={formData.format} onChange={handleChange} style={inputStyle}>
                  <option value="raw">Raw (1000)</option>
                  <option value="K">Thousands (1K)</option>
                  <option value="M">Millions (1M)</option>
                </select>
              </div>
            </>
          )}

          <button onClick={handleSave} style={{
            marginTop: 4, padding: '10px 16px', fontWeight: 600, fontSize: 13,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
          }}>
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}
