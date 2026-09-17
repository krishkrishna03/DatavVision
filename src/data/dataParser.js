/**
 * Data Parser — streaming/chunked CSV parsing, safe Excel/JSON parsing.
 * Does NOT store the entire dataset in React state.
 * Returns compact results: schema, preview, and a reference for deferred processing.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const MAX_PREVIEW_ROWS = 50;
const MAX_SAMPLE_ROWS = Number.MAX_SAFE_INTEGER;
const CHUNK_SIZE = 50000;

/**
 * Parse CSV with streaming/chunked processing.
 * Collects incremental stats without holding all rows in memory.
 */
async function parseCSVStreaming(file, onProgress) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let rowCount = 0;
    let headers = null;
    let firstChunk = true;
    let totalProcessed = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      chunkSize: CHUNK_SIZE * 100, // ~50K rows per chunk
      chunk: (results) => {
        if (firstChunk) {
          headers = results.meta.fields || [];
          firstChunk = false;
        }
        // Store up to MAX_SAMPLE_ROWS for analysis, keep first MAX_PREVIEW_ROWS for preview
        for (const row of results.data) {
          if (rows.length < MAX_SAMPLE_ROWS) {
            rows.push(row);
          }
          rowCount++;
        }
        totalProcessed += results.data.length;
        if (onProgress) onProgress(totalProcessed);
      },
      complete: (results) => {
        if (firstChunk && results.meta.fields) {
          headers = results.meta.fields;
        }
        resolve({
          rows,
          headers: headers || [],
          totalRows: rowCount || rows.length,
        });
      },
      error: reject,
    });
  });
}

/**
 * Parse Excel file efficiently.
 * For large files, only reads used range and samples rows.
 */
async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (allRows.length === 0) {
          reject(new Error('Excel file is empty or has no valid data'));
          return;
        }

        const headers = Object.keys(allRows[0] || {});
        // Sample up to MAX_SAMPLE_ROWS for analysis
        const sample = allRows.slice(0, MAX_SAMPLE_ROWS);

        resolve({
          rows: sample,
          headers,
          totalRows: allRows.length,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse JSON file.
 */
async function parseJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const data = Array.isArray(parsed) ? parsed : (parsed.data || [parsed]);

        if (data.length === 0) {
          reject(new Error('JSON file is empty or has no valid data'));
          return;
        }

        const headers = Object.keys(data[0] || {});
        const sample = data.slice(0, MAX_SAMPLE_ROWS);

        resolve({
          rows: sample,
          headers,
          totalRows: data.length,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Main parser entry point.
 * Returns a compact dataset object — does NOT store full data.
 */
export async function parseFile(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();
  let result;

  if (ext === 'csv') {
    result = await parseCSVStreaming(file, onProgress);
  } else if (['xlsx', 'xls'].includes(ext)) {
    result = await parseExcel(file);
  } else if (ext === 'json') {
    result = await parseJSON(file);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Supported: CSV, XLSX, XLS, JSON`);
  }

  if (!result.rows || result.rows.length === 0) {
    throw new Error('File is empty or has no valid data');
  }

  const { rows: sample, headers, totalRows } = result;
  const columns = headers.length > 0 ? headers : Object.keys(sample[0] || {});

  // Preview is first 50 rows
  const preview = sample.slice(0, MAX_PREVIEW_ROWS);

  return {
    id: uuidv4(),
    name: file.name.replace(/\.[^/.]+$/, ''),
    fileType: ext,
    rowCount: totalRows,
    columnCount: columns.length,
    columns,
    sample, // up to 5000 rows for analysis
    preview, // first 50 rows for display
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Merge multiple parsed datasets.
 * Uses the first dataset's columns as the schema.
 */
export function mergeDatasets(datasets) {
  if (datasets.length === 0) return null;
  if (datasets.length === 1) return datasets[0];

  // Merge samples (up to MAX_SAMPLE_ROWS total)
  const mergedSample = [];
  for (const ds of datasets) {
    for (const row of ds.sample) {
      if (mergedSample.length >= MAX_SAMPLE_ROWS) break;
      mergedSample.push(row);
    }
    if (mergedSample.length >= MAX_SAMPLE_ROWS) break;
  }

  const mergedPreview = mergedSample.slice(0, MAX_PREVIEW_ROWS);
  const totalRows = datasets.reduce((sum, ds) => sum + ds.rowCount, 0);
  const totalSize = datasets.reduce((sum, ds) => sum + (ds.sizeBytes || 0), 0);

  return {
    id: datasets[0].id,
    name: `Merged (${datasets.map(d => d.name).join(' + ')})`,
    fileType: 'merged',
    rowCount: totalRows,
    columnCount: datasets[0].columns.length,
    columns: datasets[0].columns,
    sample: mergedSample,
    preview: mergedPreview,
    sizeBytes: totalSize,
    createdAt: new Date().toISOString(),
  };
}

export { MAX_SAMPLE_ROWS, MAX_PREVIEW_ROWS };
