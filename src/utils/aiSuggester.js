import { v4 as uuidv4 } from 'uuid';

// Chart color palettes
export const PALETTES = {
  default: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'],
  warm:    ['#f59e0b', '#f43f5e', '#ec4899', '#f97316', '#eab308', '#be123c', '#a21caf', '#c026d3'],
  cool:    ['#06b6d4', '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#14b8a6', '#3b82f6', '#22d3ee'],
  mono:    ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#ddd6fe', '#ede9fe', '#f5f3ff', '#faf5ff'],
};

/* ── AI Suggester: heuristic rules to propose chart configs ── */
export function suggestCharts(schema, data) {
  if (!schema || schema.length === 0) return [];

  const numeric   = schema.filter(c => c.type === 'numeric');
  const category  = schema.filter(c => c.type === 'category');
  const date      = schema.filter(c => c.type === 'date');
  const suggestions = [];

  /* 1. KPI cards — one per numeric column */
  numeric.slice(0, 4).forEach((col, i) => {
    const values = data.map(r => parseFloat(r[col.key])).filter(n => !isNaN(n));
    const total  = values.reduce((a, b) => a + b, 0);
    const avg    = total / values.length;
    suggestions.push({
      id: uuidv4(),
      type: 'kpi',
      title: `Total ${col.key}`,
      column: col.key,
      value: total,
      avg,
      min: col.min,
      max: col.max,
      format: total > 1_000_000 ? 'M' : total > 1_000 ? 'K' : 'raw',
      confidence: 0.95,
      reason: `Showing total of numeric column "${col.key}"`,
    });
  });

  /* 2. Bar chart — category × numeric */
  if (category.length > 0 && numeric.length > 0) {
    const catCol = category[0];
    const numCol = numeric[0];
    const aggregated = aggregateBy(data, catCol.key, numCol.key);
    suggestions.push({
      id: uuidv4(),
      type: 'bar',
      title: `${numCol.key} by ${catCol.key}`,
      xKey: catCol.key,
      yKey: numCol.key,
      data: aggregated,
      confidence: 0.92,
      reason: `"${catCol.key}" is categorical and "${numCol.key}" is numeric — ideal for bar chart`,
    });

    /* Pie if few categories */
    if (catCol.uniqueValues && catCol.uniqueValues.length <= 10) {
      suggestions.push({
        id: uuidv4(),
        type: 'pie',
        title: `${numCol.key} Distribution`,
        nameKey: catCol.key,
        valueKey: numCol.key,
        data: aggregated.slice(0, 8),
        confidence: 0.88,
        reason: `Few unique values in "${catCol.key}" suit a pie chart`,
      });
    }
  }

  /* 3. Line chart — date × numeric */
  if (date.length > 0 && numeric.length > 0) {
    const dateCol = date[0];
    const numCol  = numeric[0];
    const timeData = [...data]
      .sort((a, b) => new Date(a[dateCol.key]) - new Date(b[dateCol.key]))
      .map(r => ({ [dateCol.key]: r[dateCol.key], [numCol.key]: parseFloat(r[numCol.key]) || 0 }));
    suggestions.push({
      id: uuidv4(),
      type: 'line',
      title: `${numCol.key} Over Time`,
      xKey: dateCol.key,
      yKey: numCol.key,
      data: timeData,
      confidence: 0.95,
      reason: `Date column "${dateCol.key}" paired with numeric "${numCol.key}" — line chart ideal for trends`,
    });
  }

  /* 4. Scatter — two numeric columns */
  if (numeric.length >= 2) {
    suggestions.push({
      id: uuidv4(),
      type: 'scatter',
      title: `${numeric[0].key} vs ${numeric[1].key}`,
      xKey: numeric[0].key,
      yKey: numeric[1].key,
      data: data.slice(0, 200).map(r => ({
        [numeric[0].key]: parseFloat(r[numeric[0].key]) || 0,
        [numeric[1].key]: parseFloat(r[numeric[1].key]) || 0,
      })),
      confidence: 0.82,
      reason: `Two numeric columns found — scatter shows correlation`,
    });
  }

  /* 5. Data table — always add */
  suggestions.push({
    id: uuidv4(),
    type: 'table',
    title: 'Raw Data Preview',
    columns: schema.map(c => c.key),
    data: data.slice(0, 100),
    confidence: 1,
    reason: 'Full data overview',
  });

  return suggestions;
}

/* ── Aggregate data by group key ── */
export function aggregateBy(data, groupKey, valueKey, method = 'sum') {
  const map = {};
  data.forEach(row => {
    const g = String(row[groupKey] || 'Unknown');
    const v = parseFloat(row[valueKey]) || 0;
    if (!map[g]) map[g] = { [groupKey]: g, [valueKey]: 0, count: 0 };
    map[g][valueKey] += v;
    map[g].count += 1;
  });
  const result = Object.values(map);
  if (method === 'avg') result.forEach(r => { r[valueKey] = r[valueKey] / r.count; });
  return result.sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 15);
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

  // Trend detection
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

    // Outlier detection (Z-score)
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

  // Category insights
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

  // Dataset overview
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
  const kpis = charts.filter(c => c.type === 'kpi');
  const others = charts.filter(c => c.type !== 'kpi');

  let y = 0;
  // KPIs: 4 per row, each 3 wide and 2 tall
  kpis.forEach((c, i) => {
    layout.push({ i: c.id, x: (i % 4) * 3, y: Math.floor(i / 4) * 2, w: 3, h: 2, minW: 2, minH: 2 });
  });
  if (kpis.length) y = Math.ceil(kpis.length / 4) * 2;

  // Others: 2 per row, each 6 wide and 4 tall
  others.forEach((c, i) => {
    layout.push({ i: c.id, x: (i % 2) * 6, y: y + Math.floor(i / 2) * 4, w: 6, h: 4, minW: 3, minH: 3 });
  });

  return layout;
}
