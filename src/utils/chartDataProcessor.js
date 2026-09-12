// Utilities for filtering raw dataset rows based on slicer/timeline state
// and recomputing chart configs from the filtered data.

import { aggregateBy } from './aiSuggester';

/**
 * Apply slicer + timeline filters to raw dataset rows.
 *
 * @param {Array<Object>} rows       - full dataset rows
 * @param {Object}        filters    - { columnKey: [selectedValues], ... }
 * @param {Object}        timeline   - { column, start, end } | null
 * @returns {Array<Object>} filtered rows
 */
export function applyFilters(rows, filters = {}, timeline = null) {
  if (!rows || rows.length === 0) return [];

  let result = rows;

  // Timeline (date range) filter
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

  // Category slicers
  const activeKeys = Object.keys(filters).filter(
    (k) => Array.isArray(filters[k]) && filters[k].length > 0
  );

  activeKeys.forEach((key) => {
    const selected = new Set(filters[key].map(String));
    result = result.filter((r) => {
      const v = r[key];
      if (v === null || v === undefined || v === '') return false;
      return selected.has(String(v));
    });
  });

  return result;
}

/**
 * Recompute a chart's pre-aggregated `data` from filtered raw rows.
 * Returns a new chart object with updated `data` (and KPI stats).
 */
export function recomputeChart(chart, filteredRows) {
  if (!chart) return chart;

  // KPI: recompute stats from filtered rows
  if (chart.type === 'kpi') {
    const col = chart.column;
    if (!col) return chart;
    const values = filteredRows
      .map((r) => parseFloat(r[col]))
      .filter((n) => !isNaN(n));
    if (values.length === 0) {
      return { ...chart, value: 0, avg: 0, max: 0, min: 0, count: 0 };
    }
    const total = values.reduce((a, b) => a + b, 0);
    const avg = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return {
      ...chart,
      value: total,
      avg,
      max,
      min,
      count: values.length,
    };
  }

  // Table: use filtered rows directly
  if (chart.type === 'table') {
    return { ...chart, data: filteredRows.slice(0, 100) };
  }

  // Charts that aggregate by a category x-key
  if (chart.xKey && chart.yKey) {
    const newData = aggregateBy(filteredRows, chart.xKey, chart.yKey);
    return { ...chart, data: newData };
  }

  // Pie / donut use nameKey + valueKey
  if ((chart.type === 'pie' || chart.type === 'donut') && chart.nameKey && chart.valueKey) {
    const newData = aggregateBy(filteredRows, chart.nameKey, chart.valueKey).slice(0, 8);
    return { ...chart, data: newData };
  }

  // Scatter: pass through filtered rows
  if (chart.type === 'scatter') {
    return { ...chart, data: filteredRows.slice(0, 200) };
  }

  // Line / area: pass through filtered rows
  if (chart.type === 'line' || chart.type === 'area') {
    return { ...chart, data: filteredRows.slice(0, 500) };
  }

  // Stacked bar
  if (chart.type === 'stacked-bar' && chart.yKeys) {
    const map = {};
    filteredRows.forEach((row) => {
      const g = String(row[chart.xKey] || '').trim();
      if (!g) return;
      if (!map[g]) map[g] = { [chart.xKey]: g };
      chart.yKeys.forEach((key) => {
        map[g][key] = (map[g][key] || 0) + (parseFloat(row[key]) || 0);
      });
    });
    return { ...chart, data: Object.values(map).slice(0, 15) };
  }

  // Default: no recomputation possible
  return chart;
}

/**
 * Recompute all charts in a dashboard from filtered rows.
 */
export function recomputeAllCharts(charts, filteredRows) {
  return charts.map((c) => recomputeChart(c, filteredRows));
}

/**
 * Extract unique values for a category column (for slicer options).
 */
export function getUniqueValues(rows, columnKey, limit = 50) {
  if (!rows || !columnKey) return [];
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const v = row[columnKey];
    if (v === null || v === undefined || String(v).trim() === '') continue;
    const s = String(v).trim();
    if (!seen.has(s)) {
      seen.add(s);
      result.push(s);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/**
 * Get min and max date for a date column (for timeline range).
 */
export function getDateRange(rows, columnKey) {
  if (!rows || !columnKey) return null;
  let min = null;
  let max = null;
  for (const row of rows) {
    const v = row[columnKey];
    if (!v) continue;
    const t = new Date(v).getTime();
    if (isNaN(t)) continue;
    if (min === null || t < min) min = t;
    if (max === null || t > max) max = t;
  }
  if (min === null || max === null) return null;
  return { start: new Date(min).toISOString().slice(0, 10), end: new Date(max).toISOString().slice(0, 10) };
}
