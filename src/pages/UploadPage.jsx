import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, File, AlertCircle, FileSpreadsheet, Loader2, Database, ArrowRight, TrendingUp, BarChart3, Grid3x3, Sparkles, CheckCircle } from 'lucide-react';
import { parseFile, mergeDatasets } from '../data/dataParser';
import { useDataStore } from '../store/store';

export default function UploadPage() {
  const navigate = useNavigate();
  const addDataset = useDataStore(s => s.addDataset);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [parseProgress, setParseProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    setError('');
    setLoading(true);
    setFiles(prev => [...prev, ...acceptedFiles]);

    const newPreviews = [];
    try {
      for (const f of acceptedFiles) {
        try {
          setParseProgress(0);
          const parsed = await parseFile(f, (processed) => setParseProgress(processed));
          newPreviews.push(parsed);
        } catch (err) {
          setError(`Failed to parse ${f.name}: ${err.message}`);
        }
      }
      setPreviews(prev => [...prev, ...newPreviews]);
      setSelectedIndices(new Set(Array.from({ length: newPreviews.length }, (_, i) => previews.length + i)));
    } finally {
      setLoading(false);
    }
  }, [previews.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
    },
    multiple: true,
  });

  const handleProceed = () => {
    if (selectedIndices.size === 0) return;
    const selectedPreviews = Array.from(selectedIndices).sort((a, b) => a - b).map(i => previews[i]);
    const merged = selectedPreviews.length > 1 ? mergeDatasets(selectedPreviews) : selectedPreviews[0];
    const id = addDataset(merged);
    navigate(`/dashboard?dataset=${id}&new=true`);
  };

  const handleFileRemove = (index) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedIndices(prev => {
      const updated = new Set();
      for (const idx of prev) if (idx !== index) updated.add(idx > index ? idx - 1 : idx);
      return updated;
    });
  };

  const toggleFileSelection = (index) => {
    setSelectedIndices(prev => {
      const updated = new Set(prev);
      if (updated.has(index)) updated.delete(index);
      else updated.add(index);
      return updated;
    });
  };

  const dataAnalysis = useMemo(() => {
    if (previews.length === 0) return null;
    const selectedPreviews = Array.from(selectedIndices).map(i => previews[i]).filter(Boolean);
    if (selectedPreviews.length === 0) return null;

    const first = selectedPreviews[0];
    const totalRows = selectedPreviews.reduce((sum, p) => sum + p.rowCount, 0);
    const totalSize = selectedPreviews.reduce((sum, p) => sum + (p.sizeBytes || 0), 0);
    const columns = first.columns || [];

    return {
      totalColumns: columns.length,
      totalRows,
      totalSize: (totalSize / 1024 / 1024).toFixed(2),
      sampleRows: selectedPreviews.reduce((sum, p) => sum + (p.sample?.length || 0), 0),
    };
  }, [previews, selectedIndices]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(99,102,241,0.1)', color: 'var(--text-accent)', borderRadius: 100, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <Database size={16} /> Data Import
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Upload your dataset</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>
          Import your CSV, Excel, or JSON file. Our AI engine will profile your data, detect column types, and generate a dataset-specific dashboard with real insights.
        </p>
      </div>

      {previews.length === 0 ? (
        <div {...getRootProps()} style={{
          border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
          background: isDragActive ? 'rgba(99,102,241,0.05)' : 'var(--bg-elevated)',
          borderRadius: 'var(--radius-xl)', padding: '60px 40px', textAlign: 'center', cursor: 'pointer',
          transition: 'all var(--transition)', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }} className="card">
          <input {...getInputProps()} />
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: isDragActive ? 'var(--glow-primary)' : 'none', transition: 'all 0.3s' }}>
            <UploadCloud size={40} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{isDragActive ? 'Drop your files here...' : 'Click to upload or drag and drop'}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>Upload multiple CSV, XLSX, XLS, or JSON files to analyze together</div>
          <button className="btn btn-secondary">Browse Files</button>
        </div>
      ) : (
        <div className="animate-slide-left" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div {...getRootProps()} style={{
            border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
            background: isDragActive ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.02)',
            borderRadius: 'var(--radius-lg)', padding: '20px 24px', textAlign: 'center', cursor: 'pointer',
            transition: 'all var(--transition)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }} className="card">
            <input {...getInputProps()} />
            <UploadCloud size={20} color="var(--accent-primary)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>{isDragActive ? 'Drop files here to add more' : '+ Add more files to this upload'}</div>
          </div>

          <div className="card" style={{ padding: '24px 32px' }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Selected Files ({selectedIndices.size} of {previews.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {previews.map((preview, idx) => (
                <div key={idx} onClick={() => toggleFileSelection(idx)} style={{
                  padding: '12px 16px', borderRadius: 'var(--radius-md)',
                  border: selectedIndices.has(idx) ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: selectedIndices.has(idx) ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <input type="checkbox" checked={selectedIndices.has(idx)} onChange={() => toggleFileSelection(idx)} style={{ cursor: 'pointer' }} />
                    <FileSpreadsheet size={16} color={selectedIndices.has(idx) ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{preview.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {preview.rowCount.toLocaleString()} rows × {preview.columnCount} columns
                        {preview.rowCount > 5000 && <span style={{ color: 'var(--accent-cyan)', marginLeft: 8 }}>(sampled {preview.sample.length} for analysis)</span>}
                      </div>
                    </div>
                  </div>
                  <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleFileRemove(idx); }} style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {dataAnalysis && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <StatCard icon={<BarChart3 size={20} />} label="Total Columns" value={dataAnalysis.totalColumns} color="var(--accent-primary)" bgColor="rgba(99,102,241,0.1)" />
              <StatCard icon={<Database size={20} />} label="Total Rows" value={dataAnalysis.totalRows.toLocaleString()} color="var(--accent-emerald)" bgColor="rgba(16,185,129,0.1)" isNumeric={true} />
              <StatCard icon={<Grid3x3 size={20} />} label="Sample Size" value={dataAnalysis.sampleRows.toLocaleString()} color="var(--accent-cyan)" bgColor="rgba(6,182,212,0.1)" isNumeric={true} />
              <StatCard icon={<TrendingUp size={20} />} label="File Size" value={`${dataAnalysis.totalSize} MB`} color="var(--accent-amber)" bgColor="rgba(245,158,11,0.1)" />
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <button className="btn btn-ghost" onClick={() => { setPreviews([]); setFiles([]); setSelectedIndices(new Set()); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleProceed} disabled={selectedIndices.size === 0} style={{ gap: 8, padding: '12px 20px', opacity: selectedIndices.size === 0 ? 0.5 : 1 }}>
              <Sparkles size={16} /> Generate Dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={32} className="animate-spin" color="var(--accent-primary)" />
          <div style={{ color: 'var(--text-secondary)' }}>
            {parseProgress > 0 ? `Parsed ${parseProgress.toLocaleString()} rows...` : 'Analyzing dataset schema & structures...'}
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', display: 'flex', alignItems: 'flex-start', gap: 12, color: 'var(--accent-rose)' }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Upload Error</div>
            <div style={{ fontSize: 14 }}>{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bgColor, isNumeric = true }) {
  return (
    <div className="card" style={{ padding: '20px 24px', background: bgColor, border: `1px solid ${color}33` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: isNumeric ? 32 : 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      </div>
    </div>
  );
}
