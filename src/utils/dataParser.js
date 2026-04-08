import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

/* ── Detect column type ── */
export function detectColumnType(values) {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'unknown';

  const numericCount = nonNull.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
  if (numericCount / nonNull.length > 0.85) return 'numeric';

  const dateCount = nonNull.filter(v => !isNaN(Date.parse(v))).length;
  if (dateCount / nonNull.length > 0.75) return 'date';

  const uniqueRatio = new Set(nonNull.map(String)).size / nonNull.length;
  if (uniqueRatio < 0.3) return 'category';

  return 'text';
}

/* ── Analyze schema from data rows ── */
export function analyzeSchema(data) {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map(key => {
    const values = data.map(r => r[key]);
    const type = detectColumnType(values);
    const uniqueValues = type === 'category' ? [...new Set(values.map(String))].slice(0, 20) : [];
    const numVals = type === 'numeric' ? values.map(Number).filter(n => !isNaN(n)) : [];
    return {
      key,
      type,
      uniqueValues,
      min: numVals.length ? Math.min(...numVals) : null,
      max: numVals.length ? Math.max(...numVals) : null,
      avg: numVals.length ? numVals.reduce((a, b) => a + b, 0) / numVals.length : null,
      nullCount: values.filter(v => v === null || v === undefined || v === '').length,
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

  const schema = analyzeSchema(data);

  return {
    id: uuidv4(),
    name: file.name.replace(/\.[^/.]+$/, ''),
    fileType: ext,
    rowCount: data.length,
    columnCount: Object.keys(data[0] || {}).length,
    schema,
    preview: data.slice(0, 50),
    data,
    sizeBytes: file.size,
  };
}
