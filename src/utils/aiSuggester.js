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
 * Column rotation tracker — ensures each chart gets a different
 * combination of columns instead of reusing the same ones.
 */
class ColumnPool {
  constructor(columns) {
    this.columns = columns;
    this.idx = 0;
    this.used = new Set();
  }
  next() {
    if (this.columns.length === 0) return null;
    // Try to find an unused column first
    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[(this.idx + i) % this.columns.length];
      if (!this.used.has(col.key)) {
        this.used.add(col.key);
        this.idx = (this.idx + i + 1) % this.columns.length;
        return col;
      }
    }
    // All used — wrap around
    const col = this.columns[this.idx % this.columns.length];
    this.idx = (this.idx + 1) % this.columns.length;
    return col;
  }
  peek(i) {
    return this.columns[i % this.columns.length];
  }
  get length() { return this.columns.length; }
}

/**
 * AI Suggester: generate a clean, realistic dashboard.
 * Produces 3 KPI cards + 5-6 charts + 1 data table.
 * Each chart uses a DIFFERENT combination of columns.
 */
export function suggestCharts(schema, data) {
  if (!schema || schema.length === 0) return [];

  const numeric  = schema.filter(c => c.type === 'numeric');
  const category = schema.filter(c => c.type === 'category' || c.type === 'text');
  const date     = schema.filter(c => c.type === 'date');
  const suggestions = [];

  const numPool = new ColumnPool(numeric);
  const catPool = new ColumnPool(category);

  // Helper: count unique values in data for a column
  const uniqueCount = (key) => {
    const set = new Set();
    data.forEach(r => { const v = String(r[key] ?? '').trim(); if (v) set.add(v); });
    return set.size;
  };

  // ── 1. KPI CARDS (3) — use first 3 numeric columns ──
  const kpiCount = Math.min(3, numeric.length);
  const kpiColors = [
    { bg: 'rgba(99,102,241,0.1)', accent: 'rgba(99,102,241,0.8)' },
    { bg: 'rgba(6,182,212,0.1)', accent: 'rgba(6,182,212,0.8)' },
    { bg: 'rgba(16,185,129,0.1)', accent: 'rgba(16,185,129,0.8)' },
  ];

  for (let i = 0; i < kpiCount; i++) {
    const col = numPool.next();
    if (!col) break;
    const values = data.map(r => parseFloat(r[col.key])).filter(n => !isNaN(n));
    if (values.length === 0) continue;

    const total = values.reduce((a, b) => a + b, 0);
    const avg   = total / values.length;
    const max   = Math.max(...values, 0);
    const min   = Math.min(...values, Infinity);

    suggestions.push({
      id: uuidv4(),
      type: 'kpi',
      title: `Total ${col.key}`,
      column: col.key,
      value: total,
      avg, max, min: min === Infinity ? 0 : min, count: values.length,
      format: total > 1_000_000 ? 'M' : total > 1_000 ? 'K' : 'raw',
      bgColor: kpiColors[i % kpiColors.length].bg,
      accentColor: kpiColors[i % kpiColors.length].accent,
      showSum: true, showAvg: true, showMax: true, showMin: false, showCount: false,
      confidence: 0.95,
      reason: 'Key metric',
    });
  }

  // ── 2. BAR CHART — category vs numeric ──
  const barCat = catPool.next();
  const barNum = numPool.next();
  if (barCat && barNum) {
    suggestions.push({
      id: uuidv4(),
      type: 'bar',
      title: `${barNum.key} by ${barCat.key}`,
      xKey: barCat.key,
      yKey: barNum.key,
      data: aggregateBy(data, barCat.key, barNum.key),
      confidence: 0.92,
      reason: 'Bar chart',
    });
  }

  // ── 3. LINE CHART — trend over time (date) or by category ──
  const lineNum = numPool.next();
  if (lineNum) {
    if (date.length > 0) {
      const dateCol = date[0];
      const timeData = [...data]
        .sort((a, b) => new Date(a[dateCol.key]) - new Date(b[dateCol.key]))
        .map(r => ({ [dateCol.key]: r[dateCol.key], [lineNum.key]: parseFloat(r[lineNum.key]) || 0 }));
      suggestions.push({
        id: uuidv4(),
        type: 'line',
        title: `Trend: ${lineNum.key} over time`,
        xKey: dateCol.key,
        yKey: lineNum.key,
        data: timeData,
        confidence: 0.90,
        reason: 'Line chart',
      });
    } else {
      const lineCat = catPool.next();
      if (lineCat) {
        suggestions.push({
          id: uuidv4(),
          type: 'line',
          title: `Trend: ${lineNum.key} by ${lineCat.key}`,
          xKey: lineCat.key,
          yKey: lineNum.key,
          data: data.map(r => ({ [lineCat.key]: r[lineCat.key], [lineNum.key]: parseFloat(r[lineNum.key]) || 0 })),
          confidence: 0.88,
          reason: 'Line chart',
        });
      }
    }
  }

  // ── 4. PIE CHART — different category vs different numeric ──
  const pieCat = catPool.next();
  const pieNum = numPool.next();
  if (pieCat && pieNum) {
    const uniq = uniqueCount(pieCat.key);
    if (uniq >= 2 && uniq <= 12) {
      suggestions.push({
        id: uuidv4(),
        type: 'pie',
        title: `Share: ${pieNum.key} by ${pieCat.key}`,
        nameKey: pieCat.key,
        valueKey: pieNum.key,
        data: aggregateBy(data, pieCat.key, pieNum.key).slice(0, 8),
        confidence: 0.85,
        reason: 'Pie chart',
      });
    }
  }

  // ── 5. AREA CHART — another numeric over time/category ──
  const areaNum = numPool.next();
  if (areaNum) {
    if (date.length > 0) {
      const dateCol = date[0];
      const timeData = [...data]
        .sort((a, b) => new Date(a[dateCol.key]) - new Date(b[dateCol.key]))
        .map(r => ({ [dateCol.key]: r[dateCol.key], [areaNum.key]: parseFloat(r[areaNum.key]) || 0 }));
      suggestions.push({
        id: uuidv4(),
        type: 'area',
        title: `${areaNum.key} over time`,
        xKey: dateCol.key,
        yKey: areaNum.key,
        data: timeData,
        confidence: 0.87,
        reason: 'Area chart',
      });
    } else {
      const areaCat = catPool.next();
      if (areaCat) {
        suggestions.push({
          id: uuidv4(),
          type: 'area',
          title: `${areaNum.key} by ${areaCat.key}`,
          xKey: areaCat.key,
          yKey: areaNum.key,
          data: aggregateBy(data, areaCat.key, areaNum.key),
          confidence: 0.85,
          reason: 'Area chart',
        });
      }
    }
  }

  // ── 6. STACKED BAR — two numerics by a category ──
  const stackCat = catPool.next();
  const stackNum1 = numPool.next();
  const stackNum2 = numPool.next();
  if (stackCat && stackNum1 && stackNum2) {
    suggestions.push({
      id: uuidv4(),
      type: 'stacked-bar',
      title: `${stackNum1.key} & ${stackNum2.key} by ${stackCat.key}`,
      xKey: stackCat.key,
      yKeys: [stackNum1.key, stackNum2.key],
      data: createStackedBarData(data, stackCat.key, [stackNum1.key, stackNum2.key]),
      confidence: 0.80,
      reason: 'Stacked bar chart',
    });
  }

  // ── 7. SCATTER — two numerics ──
  const scatterX = numPool.next();
  const scatterY = numPool.next();
  if (scatterX && scatterY) {
    suggestions.push({
      id: uuidv4(),
      type: 'scatter',
      title: `${scatterX.key} vs ${scatterY.key}`,
      xKey: scatterX.key,
      yKey: scatterY.key,
      data: data.slice(0, 200).map(r => ({
        [scatterX.key]: parseFloat(r[scatterX.key]) || 0,
        [scatterY.key]: parseFloat(r[scatterY.key]) || 0,
      })),
      confidence: 0.82,
      reason: 'Scatter plot',
    });
  }

  // ── 8. DATA TABLE ──
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
