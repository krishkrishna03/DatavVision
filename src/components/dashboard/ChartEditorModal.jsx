import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { aggregateBy } from '../../utils/aiSuggester';

export default function ChartEditorModal({ isOpen, onClose, chart, dataset, onSave }) {
  const [formData, setFormData] = useState({
    title: '', type: 'bar', xKey: '', yKey: ''
  });

  useEffect(() => {
    if (chart && isOpen) {
      setFormData({
        title: chart.title || '',
        type: chart.type || 'bar',
        xKey: chart.xKey || chart.nameKey || '',
        yKey: chart.yKey || chart.valueKey || '',
      });
    }
  }, [chart, isOpen]);

  if (!isOpen || !chart) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    let newData = undefined;
    if (dataset?.data) {
      if (formData.type === 'scatter' || formData.type === 'line') {
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
      data: newData 
    };
    onSave(chart.id, updates);
    onClose();
  };

  const schemaColumns = dataset?.schema?.map(c => c.key) || [];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="card" style={{ width: 400, background: 'var(--bg-base)', padding: 24, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Edit Chart</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Title</label>
            <input 
              name="title" value={formData.title} onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, color: '#fff' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Chart Type</label>
            <select 
              name="type" value={formData.type} onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, color: '#fff' }}
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="scatter">Scatter Chart</option>
              <option value="kpi">KPI Card</option>
              <option value="table">Table</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>X-Axis / Label Column</label>
            <select 
              name="xKey" value={formData.xKey} onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, color: '#fff' }}
            >
              <option value="">-- Select Column --</option>
              {schemaColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Y-Axis / Value Column</label>
            <select 
              name="yKey" value={formData.yKey} onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, color: '#fff' }}
            >
              <option value="">-- Select Column --</option>
              {schemaColumns.map(col => <option key={col} value={col}>{col}</option>)}
            </select>
          </div>

          <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 12 }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
