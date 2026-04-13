import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

/* ── Detect column type (optimized) ── */
export function detectColumnType(values) {
  if (!values || values.length === 0) return 'text';
  
  // Limit sample size to prevent stack overflow
  const samples = values.slice(0, Math.min(500, values.length));
  const nonNull = samples.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  
  if (nonNull.length === 0) return 'text'; // Default to text if all empty

  const numericCount = nonNull.filter(v => {
    const num = parseFloat(v);
    return !isNaN(num) && isFinite(num);
  }).length;
  
  if (numericCount / nonNull.length > 0.85) return 'numeric';

  // Safely check for dates with try-catch
  let dateCount = 0;
  try {
    dateCount = nonNull.filter(v => {
      if (!v || typeof v !== 'string') return false;
      const time = Date.parse(v);
      return !isNaN(time);
    }).length;
  } catch (e) {
    dateCount = 0;
  }
  
  if (dateCount / nonNull.length > 0.75) return 'date';

  const uniqueRatio = new Set(nonNull.map(String)).size / nonNull.length;
  if (uniqueRatio < 0.3) return 'category';

  return 'text';
}

/* ── Analyze schema from data rows (optimized for large files) ── */
export function analyzeSchema(data) {
  if (!data || data.length === 0) return [];
  
  // Limit schema analysis to first 1000 rows to prevent stack overflow
  const sampleData = data.slice(0, Math.min(1000, data.length));
  const keys = Object.keys(data[0] || {});
  
  return keys.map(key => {
    const values = sampleData.map(r => r[key]);
    const type = detectColumnType(values);
    
    const nonNullValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    
    const uniqueValues = type === 'category' 
      ? [...new Set(nonNullValues.map(String))].slice(0, 20) 
      : [];
    
    const numVals = type === 'numeric' 
      ? nonNullValues.map(Number).filter(n => !isNaN(n))
      : [];
    
    return {
      key,
      type,
      uniqueValues,
      min: numVals.length ? Math.min(...numVals) : null,
      max: numVals.length ? Math.max(...numVals) : null,
      avg: numVals.length ? numVals.reduce((a, b) => a + b, 0) / numVals.length : null,
      nullCount: values.filter(v => v === null || v === undefined || String(v).trim() === '').length,
    };
  });
}

/* ── Parse CSV ── */
async function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => resolve(results.data),
      error: reject,
    });
  });
}

/* ── Parse Excel ── */
async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(data);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/* ── Parse JSON ── */
async function parseJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const data = Array.isArray(parsed) ? parsed : (parsed.data || [parsed]);
        resolve(data);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/* ── Main parser ── */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  let data;

  if (ext === 'csv') data = await parseCSV(file);
  else if (['xlsx', 'xls'].includes(ext)) data = await parseExcel(file);
  else if (ext === 'json') data = await parseJSON(file);
  else throw new Error(`Unsupported file type: .${ext}`);

  if (!data || data.length === 0) throw new Error('File is empty or has no valid data');

  const schema = analyzeSchema(data);
  
  // Store only first 50 rows in preview to prevent state bloat & stack overflow
  const preview = data.slice(0, 50);

  return {
    id: uuidv4(),
    name: file.name.replace(/\.[^/.]+$/, ''),
    fileType: ext,
    rowCount: data.length,
    columnCount: Object.keys(data[0] || {}).length,
    schema,
    preview,
    data, // Keep full data for merging, but use preview for display
    sizeBytes: file.size,
  };
}
