import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, File, AlertCircle, FileSpreadsheet, Loader2, Database, ArrowRight } from 'lucide-react';
import { parseFile } from '../utils/dataParser';
import { useDataStore } from '../store/store';

export default function UploadPage() {
  const navigate = useNavigate();
  const addDataset = useDataStore(s => s.addDataset);
  
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  
  const onDrop = useCallback(async (acceptedFiles) => {
    const f = acceptedFiles[0];
    if (!f) return;
    
    setError('');
    setFile(f);
    setLoading(true);
    
    try {
      const parsed = await parseFile(f);
      setPreview(parsed);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to parse file. Ensure it is a valid CSV, Excel, or JSON.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json']
    },
    maxFiles: 1,
  });

  const handleProceed = () => {
    if (!preview) return;
    const id = addDataset(preview); // adds to store, sets active dataset
    navigate(`/dashboard?dataset=${id}&new=true`);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      
      <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(99,102,241,0.1)', color: 'var(--text-accent)', borderRadius: 100, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <Database size={16} /> Data Import
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Upload your dataset</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>
          Import your CSV, Excel, or JSON file. Our AI will analyze the schema and instantly generate a beautiful, interactive dashboard.
        </p>
      </div>

      {!preview ? (
        <div 
          {...getRootProps()} 
          style={{
            border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
            background: isDragActive ? 'rgba(99,102,241,0.05)' : 'var(--bg-elevated)',
            borderRadius: 'var(--radius-xl)',
            padding: '60px 40px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all var(--transition)',
            minHeight: 300,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}
          className="card"
        >
          <input {...getInputProps()} />
          
          <div style={{ 
            width: 80, height: 80, borderRadius: 20, 
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            boxShadow: isDragActive ? 'var(--glow-primary)' : 'none',
            transition: 'all 0.3s'
          }}>
            <UploadCloud size={40} color="var(--accent-primary)" />
          </div>
          
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {isDragActive ? 'Drop your file here...' : 'Click to upload or drag and drop'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
            Supports CSV, XLSX, XLS, and JSON formats up to 50MB.
          </div>
          
          <button className="btn btn-secondary">
            Browse Files
          </button>
        </div>
      ) : (
        <div className="card animate-slide-left">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={24} color="var(--accent-emerald)" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{preview.name}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 4 }}>
                  <span>{preview.rowCount.toLocaleString()} rows</span>
                  <span>{preview.columnCount} columns</span>
                  <span>{(preview.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => { setPreview(null); setFile(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleProceed} style={{ gap: 8 }}>
                Generate Auto Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
          
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Detected Schema Preview</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {preview.schema.slice(0, 15).map(col => (
                <div key={col.key} style={{ 
                  padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ fontWeight: 500 }}>{col.key}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>{col.type}</span>
                </div>
              ))}
              {preview.schema.length > 15 && (
                <div style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                  +{preview.schema.length - 15} more...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={32} className="animate-spin" color="var(--accent-primary)" />
          <div style={{ color: 'var(--text-secondary)' }}>Analyzing dataset schema & structures...</div>
        </div>
      )}

      {error && (
        <div style={{ 
          marginTop: 20, padding: 16, borderRadius: 'var(--radius-md)', 
          background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
          display: 'flex', alignItems: 'flex-start', gap: 12, color: 'var(--accent-rose)'
        }}>
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
