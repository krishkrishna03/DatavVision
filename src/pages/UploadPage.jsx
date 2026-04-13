import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, File, AlertCircle, FileSpreadsheet, Loader2, Database, ArrowRight, TrendingUp, BarChart3, Grid3x3, Sparkles } from 'lucide-react';
import { parseFile } from '../utils/dataParser';
import { useDataStore } from '../store/store';

export default function UploadPage() {
  const navigate = useNavigate();
  const addDataset = useDataStore(s => s.addDataset);
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setError('');
    setLoading(true);
    setFiles(prev => [...prev, ...acceptedFiles]);
    
    const newPreviews = [];
    
    try {
      for (const f of acceptedFiles) {
        try {
          const parsed = await parseFile(f);
          // Remove large circular data before storing to prevent stack overflow
          const preview = {
            ...parsed,
            data: parsed.data.slice(0, 50), // Keep only first 50 rows
            preview: parsed.data.slice(0, 50),
          };
          newPreviews.push(preview);
        } catch (err) {
          setError(`Failed to parse ${f.name}: ${err.message}`);
        }
      }
      
      setPreviews(prev => [...prev, ...newPreviews]);
      setSelectedIndices(new Set(Array.from({length: newPreviews.length}, (_, i) => previews.length + i)));
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
      'application/json': ['.json']
    },
    multiple: true,
  });

  const handleProceed = () => {
    if (selectedIndices.size === 0) return;
    
    const selectedPreviews = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(i => previews[i]);
    
    // Merge selected datasets
    let mergedData = [];
    let mergedSchema = null;
    let totalRows = 0;
    
    for (const p of selectedPreviews) {
      mergedData = mergedData.concat(p.data);
      if (!mergedSchema) mergedSchema = p.schema;
      totalRows += p.rowCount;
    }
    
    const mergedPreview = {
      id: selectedPreviews[0].id,
      name: selectedPreviews.length > 1 
        ? `Merged (${selectedPreviews.map(p => p.name).join(' + ')})` 
        : selectedPreviews[0].name,
      fileType: 'merged',
      rowCount: totalRows,
      columnCount: mergedSchema?.length || 0,
      schema: mergedSchema,
      data: mergedData,
      preview: mergedData.slice(0, 50),
      sizeBytes: selectedPreviews.reduce((sum, p) => sum + (p.sizeBytes || 0), 0),
    };
    
    const id = addDataset(mergedPreview);
    navigate(`/dashboard?dataset=${id}&new=true`);
  };
  
  const handleFileRemove = (index) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedIndices(prev => {
      const updated = new Set(prev);
      updated.delete(index);
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

  // Compute statistics for analysis view
  const dataAnalysis = useMemo(() => {
    if (previews.length === 0) return null;
    
    const selectedPreviews = Array.from(selectedIndices)
      .map(i => previews[i]);
    
    if (selectedPreviews.length === 0) return null;
    
    const allSchema = selectedPreviews[0].schema || [];
    const numericColumns = allSchema.filter(c => c.type === 'numeric');
    const categoricalColumns = allSchema.filter(c => c.type === 'category');
    const dateColumns = allSchema.filter(c => c.type === 'date');
    const totalRows = selectedPreviews.reduce((sum, p) => sum + p.rowCount, 0);
    const totalSize = selectedPreviews.reduce((sum, p) => sum + (p.sizeBytes || 0), 0);
    
    return {
      numericCount: numericColumns.length,
      categoricalCount: categoricalColumns.length,
      dateCount: dateColumns.length,
      totalSize: (totalSize / 1024 / 1024).toFixed(2),
      totalRows,
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
          Import your CSV, Excel, or JSON file. Our AI will analyze the schema and instantly generate a beautiful, interactive dashboard.
        </p>
      </div>

      {previews.length === 0 ? (
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
            {isDragActive ? 'Drop your files here...' : 'Click to upload or drag and drop'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
            Upload multiple CSV, XLSX, XLS, or JSON files to analyze together
          </div>
          
          <button className="btn btn-secondary">
            Browse Files
          </button>
        </div>
      ) : (
        <div className="animate-slide-left" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Upload More Files Area */}
          <div 
            {...getRootProps()} 
            style={{
              border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
              background: isDragActive ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.02)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}
            className="card"
          >
            <input {...getInputProps()} />
            <UploadCloud size={20} color="var(--accent-primary)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {isDragActive ? 'Drop files here to add more' : '+ Add more files to this upload'}
            </div>
          </div>

          {/* File List */}
          <div className="card" style={{ padding: '24px 32px' }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              Selected Files ({selectedIndices.size} of {previews.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {previews.map((preview, idx) => (
                <div 
                  key={idx}
                  onClick={() => toggleFileSelection(idx)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: selectedIndices.has(idx) 
                      ? '1.5px solid var(--accent-primary)' 
                      : '1px solid var(--border-subtle)',
                    background: selectedIndices.has(idx)
                      ? 'rgba(99,102,241,0.08)'
                      : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIndices.has(idx)}
                      onChange={() => toggleFileSelection(idx)}
                      style={{ cursor: 'pointer' }}
                    />
                    <FileSpreadsheet size={16} color={selectedIndices.has(idx) ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                        {preview.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {preview.rowCount.toLocaleString()} rows × {preview.columnCount} columns
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn-ghost btn-sm" 
                    onClick={(e) => { e.stopPropagation(); handleFileRemove(idx); }}
                    style={{ padding: '4px 8px', color: 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          {dataAnalysis && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <StatCard 
                icon={<BarChart3 size={20} />}
                label="Numeric Columns"
                value={dataAnalysis.numericCount}
                color="var(--accent-primary)"
                bgColor="rgba(99,102,241,0.1)"
              />
              <StatCard 
                icon={<Grid3x3 size={20} />}
                label="Categorical Columns"
                value={dataAnalysis.categoricalCount}
                color="var(--accent-amber)"
                bgColor="rgba(245,158,11,0.1)"
              />
              <StatCard 
                icon={<TrendingUp size={20} />}
                label="Date/Time Columns"
                value={dataAnalysis.dateCount}
                color="var(--accent-cyan)"
                bgColor="rgba(6,182,212,0.1)"
              />
              <StatCard 
                icon={<Database size={20} />}
                label="Total Rows"
                value={dataAnalysis.totalRows.toLocaleString()}
                color="var(--accent-emerald)"
                bgColor="rgba(16,185,129,0.1)"
                isNumeric={true}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => { setPreviews([]); setFiles([]); setSelectedIndices(new Set()); }}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleProceed}
              disabled={selectedIndices.size === 0}
              style={{ gap: 8, padding: '12px 20px', opacity: selectedIndices.size === 0 ? 0.5 : 1 }}
            >
              <Sparkles size={16} /> Generate Dashboard <ArrowRight size={16} />
            </button>
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

// Helper component for stat cards
function StatCard({ icon, label, value, color, bgColor, isNumeric = true }) {
  return (
    <div className="card" style={{ padding: '20px 24px', background: bgColor, border: `1px solid ${color}33` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: isNumeric ? 32 : 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Helper component for schema groups
function SchemaTypeGroup({ title, columns, color, bgColor }) {
  return (
    <div style={{ padding: '20px 24px', background: bgColor, borderRadius: 'var(--radius-md)', border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {columns.slice(0, 6).map(col => (
          <div key={col.key} style={{ 
            padding: '8px 12px', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: 6, 
            border: '1px solid' + color + '22',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            fontSize: 13
          }}>
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{col.key}</span>
            <span style={{ fontSize: 11, color: color, background: color + '20', padding: '2px 8px', borderRadius: 4 }}>
              {col.type === 'numeric' ? '🔢' : col.type === 'category' ? '🏷️' : '📅'} {col.type}
            </span>
          </div>
        ))}
        {columns.length > 6 && (
          <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            +{columns.length - 6} more column{columns.length - 6 !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
