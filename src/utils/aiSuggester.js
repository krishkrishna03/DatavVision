import { v4 as uuidv4 } from 'uuid';

// Chart color palettes
export const PALETTES = {
  default: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'],
  warm:    ['#f59e0b', '#f43f5e', '#ec4899', '#f97316', '#eab308', '#be123c', '#a21caf', '#c026d3'],
  cool:    ['#06b6d4', '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#14b8a6', '#3b82f6', '#22d3ee'],
  mono:    ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#ddd6fe', '#ede9fe', '#f5f3ff', '#faf5ff'],
};

// Supported chart types — only realistic dashboard chart types
export const CHART_TYPES = [
  'kpi', 'bar', 'stacked-bar', 'line', 'area', 'pie', 'donut', 'scatter', 'table'
];

/**
 * AI Suggester: generate a clean, realistic dashboard.
 * Produces at most 4 KPI cards + 4-5 charts + 1 data table.
 * Each chart uses a DIFFERENT combination of columns so the dashboard
 * doesn't repeat the same data across every widget.
 */
export function suggestCharts(schema, data) {
  if (!schema || schema.length === 0) return [];

  const numeric  = schema.filter(c => c.type === 'numeric');
  const category = schema.filter(c => c.type === 'category');
  const date     = schema.filter(c => c.type === 'date');
  const suggestions = [];

  // Track which numeric/category columns have been used to avoid repetition
  let numericIdx = 0;
  let catIdx = 0;
  const nextNumeric = () => numeric[numericIdx++ % numeric.length];
  const nextCategory = () => category[catIdx++ % category.length];

  // ── 1. KPI CARDS (max 3) ──
  const kpiCount = Math.min(3, numeric.length);
  for (let i = 0; i < kpiCount; i++) {
    const col = numeric[i];
    const values = data.map(r => parseFloat(r[col.key])).filter(n => !isNaN(n));
    if (values.length === 0) continue;

    const total = values.reduce((a, b) => a + b, 0);
    const avg   = total / values.length;
    const max   = Math.max(...values, 0);
    const min   = Math.min(...values, Infinity);

    const colorThemes = [
      { bg: 'rgba(99,102,241,0.1)', accent: 'rgba(99,102,241,0.8)' },
      { bg: 'rgba(6,182,212,0.1)', accent: 'rgba(6,182,212,0.8)' },
      { bg: 'rgba(16,185,129,0.1)', accent: 'rgba(16,185,129,0.8)' },
    ];

    suggestions.push({
      id: uuidv4(),
      type: 'kpi',
      title: `Total ${col.key}`,
      column: col.key,
      value: total,
      avg,
      max,
      min: min === Infinity ? 0 : min,
      count: values.length,
      format: total > 1_000_000 ? 'M' : total > 1_000 ? 'K' : 'raw',
      bgColor: colorThemes[i % colorThemes.length].bg,
      accentColor: colorThemes[i % colorThemes.length].accent,
      showSum: true, showAvg: true, showMax: true, showMin: false, showCount: false,
      confidence: 0.95,
      reason: 'Key metric',
    });
  }

  // ── 2. BAR CHART — category vs a DIFFERENT numeric than KPIs ──
  if (category.length > 0 && numeric.length > 0) {
    const catCol = category[0];
    // Use a numeric column that wasn't the first KPI if possible
    const numCol = numeric.length > kpiCount ? numeric[kpiCount] : numeric[0];
    const aggregated = aggregateBy(data, catCol.key, numCol.key);

    suggestions.push({
      id: uuidv4(),
      type: 'bar',
      title: `${numCol.key} by ${catCol.key}`,
      xKey: catCol.key,
      yKey: numCol.key,
      data: aggregated,
      confidence: 0.92,
      reason: 'Bar chart',
    });
  }

  // ── 3. LINE / AREA CHART — trend over time (date column) ──
  if (date.length > 0 && numeric.length > 0) {
    const dateCol = date[0];
    // Use a different numeric than bar chart
    const numCol = numeric.length > kpiCount + 1 ? numeric[kpiCount + 1] : numeric[numeric.length - 1];
    const timeData = [...data]
      .sort((a, b) => new Date(a[dateCol.key]) - new Date(b[dateCol.key]))
      .map(r => ({ [dateCol.key]: r[dateCol.key], [numCol.key]: parseFloat(r[numCol.key]) || 0 }));

    suggestions.push({
      id: uuidv4(),
      type: 'line',
      title: `Trend: ${numCol.key} over time`,
      xKey: dateCol.key,
      yKey: numCol.key,
      data: timeData,
      confidence: 0.90,
      reason: 'Line chart',
    });
  } else if (category.length > 1 && numeric.length > 0) {
    // No date column — use a second category as x-axis for a line chart
    const catCol = category[1];
    const numCol = numeric.length > kpiCount + 1 ? numeric[kpiCount + 1] : numeric[numeric.length - 1];
    const timeData = data.map(r => ({ [catCol.key]: r[catCol.key], [numCol.key]: parseFloat(r[numCol.key]) || 0 }));

    suggestions.push({
      id: uuidv4(),
      type: 'line',
      title: `Trend: ${numCol.key} by ${catCol.key}`,
      xKey: catCol.key,
      yKey: numCol.key,
      data: timeData,
      confidence: 0.88,
      reason: 'Line chart',
    });
  }

  // ── 4. PIE / DONUT — a DIFFERENT category vs a DIFFERENT numeric ──
  if (category.length > 0 && numeric.length > 0) {
    const catCol = category.length > 1 ? category[1] : category[0];
    // Use yet another numeric column
    const numCol = numeric.length > kpiCount + 2 ? numeric[kpiCount + 2] : numeric[0];

    if (catCol.uniqueValues && catCol.uniqueValues.length <= 10) {
      const aggregated = aggregateBy(data, catCol.key, numCol.key);
      suggestions.push({
        id: uuidv4(),
        type: 'pie',
        title: `Share: ${numCol.key} by ${catCol.key}`,
        nameKey: catCol.key,
        valueKey: numCol.key,
        data: aggregated.slice(0, 8),
        confidence: 0.85,
        reason: 'Pie chart',
      });
    }
  }

  // ── 5. STACKED BAR — if 2+ numeric columns and 2+ categories ──
  if (category.length > 0 && numeric.length >= 2) {
    const catCol = category.length > 1 ? category[1] : category[0];
    // Use two numeric columns not yet heavily used
    const num1 = numeric.length > 1 ? numeric[1] : numeric[0];
    const num2 = numeric.length > 2 ? numeric[2] : numeric[0];
    const stackedData = createStackedBarData(data, catCol.key, [num1.key, num2.key]);

    suggestions.push({
      id: uuidv4(),
      type: 'stacked-bar',
      title: `${num1.key} & ${num2.key} by ${catCol.key}`,
      xKey: catCol.key,
      yKeys: [num1.key, num2.key],
      data: stackedData,
      confidence: 0.80,
      reason: 'Stacked bar chart',
    });
  }

  // ── 6. SCATTER — two numeric columns not yet paired ──
  if (numeric.length >= 2) {
    const xCol = numeric.length > 2 ? numeric[1] : numeric[0];
    const yCol = numeric.length > 2 ? numeric[2] : numeric[1];
    suggestions.push({
      id: uuidv4(),
      type: 'scatter',
      title: `${xCol.key} vs ${yCol.key}`,
      xKey: xCol.key,
      yKey: yCol.key,
      data: data.slice(0, 200).map(r => ({
        [xCol.key]: parseFloat(r[xCol.key]) || 0,
        [yCol.key]: parseFloat(r[yCol.key]) || 0,
      })),
      confidence: 0.82,
      reason: 'Scatter plot',
    });
  }

  // ── 7. DATA TABLE ──
  suggestions.push({
    id: uuidv4(),
    type: 'table',
    title: 'Data Preview',
    columns: schema.map(c => c.key).slice(0, 8),
    data: data.slice(0, 100),
    confidence: 1,
    reason: 'Table',
  });

  return suggestions;
}

/* ── Aggregate data by group key ── */
export function aggregateBy(data, groupKey, valueKey, method = 'sum') {
  const map = {};
  data.forEach(row => {
    const groupValue = row[groupKey];
    if (groupValue === null || groupValue === undefined || String(groupValue).trim() === '') return;

    const g = String(groupValue).trim();
    const v = parseFloat(row[valueKey]) || 0;

    if (!map[g]) map[g] = { [groupKey]: g, [valueKey]: 0, count: 0 };
    map[g][valueKey] += v;
    map[g].count += 1;
  });

  const result = Object.values(map);
  if (method === 'avg') result.forEach(r => { r[valueKey] = r[valueKey] / r.count; });

  return result.sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 15);
}

// ============== HELPER FUNCTIONS ==============

function createStackedBarData(data, groupKey, valueKeys) {
  const map = {};
  data.forEach(row => {
    const g = String(row[groupKey] || '').trim();
    if (!g) return;
    if (!map[g]) map[g] = { [groupKey]: g };

    valueKeys.forEach(key => {
      map[g][key] = (map[g][key] || 0) + (parseFloat(row[key]) || 0);
    });
  });

  return Object.values(map).sort((a, b) => b[valueKeys[0]] - a[valueKeys[0]]).slice(0, 15);
}

/* ── Format numbers ── */
export function formatNumber(n, format) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (format === 'M') return `${(n / 1_000_000).toFixed(2)}M`;
  if (format === 'K') return `${(n / 1_000).toFixed(1)}K`;
  if (n % 1 === 0) return n.toLocaleString();
  return parseFloat(n.toFixed(2)).toLocaleString();
}

/* ── Generate insights ── */
export function generateInsights(schema, data) {
  const insights = [];
  const numeric = schema.filter(c => c.type === 'numeric');
  const category = schema.filter(c => c.type === 'category');

  numeric.forEach(col => {
    const values = data.map(r => parseFloat(r[col.key])).filter(n => !isNaN(n));
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalf = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
    const change = ((secondHalf - firstHalf) / Math.abs(firstHalf)) * 100;
    if (Math.abs(change) > 10) {
      insights.push({
        type: change > 0 ? 'trend-up' : 'trend-down',
        title: `${col.key} ${change > 0 ? 'increased' : 'decreased'}`,
        body: `${col.key} shows a ${Math.abs(change).toFixed(1)}% ${change > 0 ? 'increase' : 'decrease'} in the second half of the dataset.`,
        icon: change > 0 ? '📈' : '📉',
      });
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length);
    const outliers = values.filter(v => Math.abs((v - mean) / std) > 2.5);
    if (outliers.length > 0) {
      insights.push({
        type: 'outlier',
        title: `Outliers in ${col.key}`,
        body: `Found ${outliers.length} outlier value(s) in "${col.key}" (more than 2.5 standard deviations from mean ${mean.toFixed(2)}).`,
        icon: '⚠️',
      });
    }
  });

  category.forEach(col => {
    const freq = {};
    data.forEach(r => { const v = String(r[col.key] || 'N/A'); freq[v] = (freq[v] || 0) + 1; });
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) {
      const [top, count] = entries[0];
      const pct = ((count / data.length) * 100).toFixed(1);
      insights.push({
        type: 'summary',
        title: `Top ${col.key}`,
        body: `"${top}" is the most frequent value in "${col.key}" (${pct}% of records, ${count} rows).`,
        icon: '🏆',
      });
    }
  });

  insights.unshift({
    type: 'info',
    title: 'Dataset Overview',
    body: `Loaded ${data.length.toLocaleString()} rows × ${schema.length} columns. ${numeric.length} numeric, ${category.length} categorical, ${schema.filter(c=>c.type==='date').length} date columns detected.`,
    icon: '📊',
  });

  return insights.slice(0, 6);
}

/* ── Build default grid layout for a chart array ── */
export function buildDefaultLayout(charts) {
  const layout = [];

  charts.forEach((c, i) => {
    layout.push({ i: c.id, x: i % 2, y: Math.floor(i / 2), w: 1, h: 1, minW: 1, minH: 1 });
  });

  return layout;
}
