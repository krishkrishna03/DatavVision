import { v4 as uuidv4 } from 'uuid';

// Chart color palettes
export const PALETTES = {
  default: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'],
  warm:    ['#f59e0b', '#f43f5e', '#ec4899', '#f97316', '#eab308', '#be123c', '#a21caf', '#c026d3'],
  cool:    ['#06b6d4', '#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#14b8a6', '#3b82f6', '#22d3ee'],
  mono:    ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#ddd6fe', '#ede9fe', '#f5f3ff', '#faf5ff'],
};

// Supported chart types
export const CHART_TYPES = [
  'kpi', 'bar', 'column', 'stacked-bar', 'histogram', 'pie', 'donut', 'treemap',
  'line', 'area', 'step', 'scatter', 'bubble', 'radar',
  'funnel', 'sankey', 'pareto', 'boxplot', 'heatmap',
  'table'
];

/* ── AI Suggester: heuristic rules to propose chart configs ── */
export function suggestCharts(schema, data) {
  if (!schema || schema.length === 0) return [];

  const numeric   = schema.filter(c => c.type === 'numeric');
  const category  = schema.filter(c => c.type === 'category');
  const date      = schema.filter(c => c.type === 'date');
  const suggestions = [];

  // === 1. VALUE COMPARISON CHARTS ===
  
  /* KPI Cards */
  numeric.slice(0, 4).forEach((col, i) => {
    const values = data.map(r => parseFloat(r[col.key])).filter(n => !isNaN(n));
    if (values.length === 0) return;
    
    const total  = values.reduce((a, b) => a + b, 0);
    const avg    = total / values.length;
    const max    = Math.max(...values, 0);
    const min    = Math.min(...values, Infinity);
    const count  = values.length;
    
    const colorThemes = [
      { bg: 'rgba(99,102,241,0.1)', accent: 'rgba(99,102,241,0.8)' },
      { bg: 'rgba(59,130,246,0.1)', accent: 'rgba(59,130,246,0.8)' },
      { bg: 'rgba(34,197,94,0.1)', accent: 'rgba(34,197,94,0.8)' },
      { bg: 'rgba(147,51,234,0.1)', accent: 'rgba(147,51,234,0.8)' },
    ];
    const theme = colorThemes[i % colorThemes.length];
    
    suggestions.push({
      id: uuidv4(),
      type: 'kpi',
      title: `Total ${col.key}`,
      column: col.key,
      value: total,
      avg, max,
      min: min === Infinity ? 0 : min,
      count,
      format: total > 1_000_000 ? 'M' : total > 1_000 ? 'K' : 'raw',
      bgColor: theme.bg,
      accentColor: theme.accent,
      showSum: true, showAvg: true, showMax: true, showMin: false, showCount: false,
      confidence: 0.95,
      reason: `Key metric`,
    });
  });

  /* Bar Charts & Variants */
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
      reason: `Bar chart`,
    });

    // Stacked Bar Chart
    if (numeric.length > 1) {
      const stackedData = createStackedBarData(data, catCol.key, numeric.slice(0, 2).map(n => n.key));
      suggestions.push({
        id: uuidv4(),
        type: 'stacked-bar',
        title: `Stacked: ${numeric.slice(0, 2).map(n => n.key).join(', ')}`,
        xKey: catCol.key,
        yKeys: numeric.slice(0, 2).map(n => n.key),
        data: stackedData,
        confidence: 0.85,
        reason: `Composition`,
      });
    }
  }

  /* Histogram (Distribution) - for pure numeric data */
  if (numeric.length > 0) {
    const col = numeric[0];
    const values = data.map(r => parseFloat(r[col.key])).filter(n => !isNaN(n));
    if (values.length > 0) {
      const histogram = createHistogram(values, col.key);
      suggestions.push({
        id: uuidv4(),
        type: 'histogram',
        title: `Distribution: ${col.key}`,
        xKey: 'range',
        yKey: 'count',
        data: histogram,
        confidence: 0.80,
        reason: `Histogram`,
      });
    }
  }

  /* Pie & Donut Charts */
  if (category.length > 0 && numeric.length > 0) {
    const catCol = category[0];
    const numCol = numeric[0];
    
    if (catCol.uniqueValues && catCol.uniqueValues.length <= 10) {
      const aggregated = aggregateBy(data, catCol.key, numCol.key);
      
      suggestions.push({
        id: uuidv4(),
        type: 'pie',
        title: `Pie: ${numCol.key}`,
        nameKey: catCol.key,
        valueKey: numCol.key,
        data: aggregated.slice(0, 8),
        confidence: 0.88,
        reason: `Pie chart`,
      });

      suggestions.push({
        id: uuidv4(),
        type: 'donut',
        title: `Donut: ${numCol.key}`,
        nameKey: catCol.key,
        valueKey: numCol.key,
        data: aggregated.slice(0, 8),
        innerRadius: 60,
        outerRadius: 100,
        confidence: 0.86,
        reason: `Donut chart`,
      });
    }
  }

  /* Treemap */
  if (category.length > 0 && numeric.length > 0) {
    const catCol = category[0];
    const numCol = numeric[0];
    const aggregated = aggregateBy(data, catCol.key, numCol.key);
    
    suggestions.push({
      id: uuidv4(),
      type: 'treemap',
      title: `Treemap: ${numCol.key}`,
      dataKey: numCol.key,
      data: aggregated.slice(0, 20).map(d => ({
        name: d[catCol.key],
        value: d[numCol.key],
      })),
      confidence: 0.82,
      reason: `Treemap`,
    });
  }

  // === 2. RELATIONSHIP & CORRELATION CHARTS ===

  /* Scatter Plots */
  if (numeric.length >= 2) {
    [0, 1, 2].forEach(idx => {
      if (numeric[idx] && numeric[idx + 1]) {
        suggestions.push({
          id: uuidv4(),
          type: 'scatter',
          title: `Scatter: ${numeric[idx].key} vs ${numeric[idx + 1].key}`,
          xKey: numeric[idx].key,
          yKey: numeric[idx + 1].key,
          data: data.slice(0, 200).map(r => ({
            [numeric[idx].key]: parseFloat(r[numeric[idx].key]) || 0,
            [numeric[idx + 1].key]: parseFloat(r[numeric[idx + 1].key]) || 0,
          })),
          confidence: 0.85 - idx * 0.05,
          reason: `Scatter plot`,
        });
      }
    });

    // Bubble Chart - works with 2+ numeric columns
    if (numeric.length >= 2) {
      suggestions.push({
        id: uuidv4(),
        type: 'bubble',
        title: `Bubble: Correlation`,
        xKey: numeric[0].key,
        yKey: numeric[1].key,
        zKey: numeric.length >= 3 ? numeric[2].key : null,
        data: data.slice(0, 150).map(r => ({
          [numeric[0].key]: parseFloat(r[numeric[0].key]) || 0,
          [numeric[1].key]: parseFloat(r[numeric[1].key]) || 0,
          [numeric.length >= 3 ? numeric[2].key : 'size']: numeric.length >= 3 ? Math.abs(parseFloat(r[numeric[2].key])) || 1 : 8,
        })),
        confidence: 0.80,
        reason: `Bubble chart`,
      });
    }
  }

  /* Radar Chart - works with 2+ numeric columns */
  if (numeric.length >= 2) {
    // If we have categories, use them; otherwise create generic groups
    if (category.length > 0) {
      const catCol = category[0];
      const uniqueCats = [...new Set(data.map(r => String(r[catCol.key])))].slice(0, 5);
      
      const radarData = uniqueCats.map(cat => {
        const record = { name: cat };
        numeric.slice(0, 5).forEach(col => {
          const val = data.find(r => String(r[catCol.key]) === cat);
          record[col.key] = val ? parseFloat(val[col.key]) || 0 : 0;
        });
        return record;
      });

      suggestions.push({
        id: uuidv4(),
        type: 'radar',
        title: `Radar: Multi-Dimensional`,
        data: radarData,
        dataKeys: numeric.slice(0, 5).map(c => c.key),
        confidence: 0.78,
        reason: `Radar chart`,
      });
    } else {
      // For numeric-only data, create a simple radar with one row
      const record = { name: 'Data' };
      numeric.slice(0, 5).forEach((col, idx) => {
        const values = data.map(r => parseFloat(r[col.key])).filter(n => !isNaN(n));
        record[col.key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      });

      suggestions.push({
        id: uuidv4(),
        type: 'radar',
        title: `Radar: Average Values`,
        data: [record],
        dataKeys: numeric.slice(0, 5).map(c => c.key),
        confidence: 0.75,
        reason: `Radar chart`,
      });
    }
  }

  // === 3. TREND CHARTS ===

  /* Line, Area & Step Charts - with DATE column */
  if (date.length > 0 && numeric.length > 0) {
    numeric.slice(0, 2).forEach((numCol, idx) => {
      const dateCol = date[0];
      const timeData = [...data]
        .sort((a, b) => new Date(a[dateCol.key]) - new Date(b[dateCol.key]))
        .map(r => ({ [dateCol.key]: r[dateCol.key], [numCol.key]: parseFloat(r[numCol.key]) || 0 }));

      suggestions.push({
        id: uuidv4(),
        type: 'line',
        title: `Line: ${numCol.key}`,
        xKey: dateCol.key,
        yKey: numCol.key,
        data: timeData,
        confidence: 0.95 - idx * 0.05,
        reason: `Line chart`,
      });

      suggestions.push({
        id: uuidv4(),
        type: 'area',
        title: `Area: ${numCol.key}`,
        xKey: dateCol.key,
        yKey: numCol.key,
        data: timeData,
        confidence: 0.88 - idx * 0.05,
        reason: `Area chart`,
      });

      if (idx === 0) {
        suggestions.push({
          id: uuidv4(),
          type: 'step',
          title: `Step: ${numCol.key}`,
          xKey: dateCol.key,
          yKey: numCol.key,
          data: timeData,
          confidence: 0.80,
          reason: `Step chart`,
        });
      }
    });
  }

  /* Line, Area & Step Charts - with CATEGORY column (for time-period data like "Q1", "Feb", etc.) */
  if (date.length === 0 && category.length > 0 && numeric.length > 0) {
    numeric.slice(0, 2).forEach((numCol, idx) => {
      const catCol = category[0];
      const timeData = data.map(r => ({ [catCol.key]: r[catCol.key], [numCol.key]: parseFloat(r[numCol.key]) || 0 }));

      suggestions.push({
        id: uuidv4(),
        type: 'line',
        title: `Line: ${numCol.key}`,
        xKey: catCol.key,
        yKey: numCol.key,
        data: timeData,
        confidence: 0.92 - idx * 0.05,
        reason: `Line chart`,
      });

      suggestions.push({
        id: uuidv4(),
        type: 'area',
        title: `Area: ${numCol.key}`,
        xKey: catCol.key,
        yKey: numCol.key,
        data: timeData,
        confidence: 0.85 - idx * 0.05,
        reason: `Area chart`,
      });

      if (idx === 0) {
        suggestions.push({
          id: uuidv4(),
          type: 'step',
          title: `Step: ${numCol.key}`,
          xKey: catCol.key,
          yKey: numCol.key,
          data: timeData,
          confidence: 0.78,
          reason: `Step chart`,
        });
      }
    });
  }

  // === 4. COMPOSITION CHARTS ===

  /* Funnel Chart */
  if (category.length > 0 && numeric.length > 0) {
    const catCol = category[0];
    const numCol = numeric[0];
    const funnelData = aggregateBy(data, catCol.key, numCol.key).slice(0, 6);

    suggestions.push({
      id: uuidv4(),
      type: 'funnel',
      title: `Funnel: ${numCol.key}`,
      dataKey: numCol.key,
      data: funnelData.map(d => ({
        name: d[catCol.key],
        value: d[numCol.key],
      })),
      confidence: 0.75,
      reason: `Funnel chart`,
    });
  }

  /* Pareto Chart */
  if (category.length > 0 && numeric.length > 0) {
    const catCol = category[0];
    const numCol = numeric[0];
    const aggregated = aggregateBy(data, catCol.key, numCol.key);
    const paretoData = createParetoData(aggregated, catCol.key, numCol.key);

    suggestions.push({
      id: uuidv4(),
      type: 'pareto',
      title: `Pareto: 80/20`,
      data: paretoData,
      confidence: 0.70,
      reason: `Pareto chart`,
    });
  }

  // === 5. ANALYSIS CHARTS ===

  /* Box Plot */
  if (numeric.length > 0) {
    const col = numeric[0];
    const values = data.map(r => parseFloat(r[col.key])).filter(n => !isNaN(n));
    if (values.length > 0) {
      values.sort((a, b) => a - b);
      const boxData = calculateQuartiles(values, col.key);

      suggestions.push({
        id: uuidv4(),
        type: 'boxplot',
        title: `Box Plot: ${col.key}`,
        data: [boxData],
        confidence: 0.75,
        reason: `Box plot`,
      });
    }
  }

  /* Heatmap */
  if (category.length >= 1 && numeric.length >= 1) {
    const catCol = category[0];
    const numCol = numeric[0];
    const heatmapData = createHeatmapData(data, catCol.key, numCol.key);

    suggestions.push({
      id: uuidv4(),
      type: 'heatmap',
      title: `Heatmap: ${numCol.key}`,
      data: heatmapData,
      xKey: catCol.key,
      valueKey: numCol.key,
      confidence: 0.78,
      reason: `Heatmap`,
    });
  }

  /* Sankey Diagram - with 1+ category columns */
  if (category.length >= 1 && numeric.length >= 1) {
    if (category.length >= 2) {
      // Two category columns: create source → target flow
      const source = category[0];
      const target = category[1];
      const value = numeric[0];
      const sankeyData = createSankeyData(data, source.key, target.key, value.key);

      if (sankeyData.links.length > 0) {
        suggestions.push({
          id: uuidv4(),
          type: 'sankey',
          title: `Flow: ${source.key} → ${target.key}`,
          data: sankeyData,
          confidence: 0.72,
          reason: `Sankey`,
        });
      }
    } else {
      // Single category: create index → category flow (or category progression)
      const catCol = category[0];
      const numCol = numeric[0];
      const aggregated = aggregateBy(data, catCol.key, numCol.key);
      
      // Create a simple flow from "Start" to each category
      const nodes = [{ name: 'Start' }];
      const links = [];
      aggregated.forEach(d => {
        nodes.push({ name: d[catCol.key] });
        links.push({
          source: 'Start',
          target: d[catCol.key],
          value: d[numCol.key],
        });
      });

      suggestions.push({
        id: uuidv4(),
        type: 'sankey',
        title: `Flow: Distribution`,
        data: { nodes, links },
        confidence: 0.68,
        reason: `Sankey`,
      });
    }
  }

  /* Data Table */
  suggestions.push({
    id: uuidv4(),
    type: 'table',
    title: 'Data Preview',
    columns: schema.map(c => c.key).slice(0, 8),
    data: data.slice(0, 100),
    confidence: 1,
    reason: 'Table',
  });

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 30);
}

/* ── Aggregate data by group key ── */
export function aggregateBy(data, groupKey, valueKey, method = 'sum') {
  const map = {};
  data.forEach(row => {
    // Skip rows with empty/null group keys
    const groupValue = row[groupKey];
    if (groupValue === null || groupValue === undefined || String(groupValue).trim() === '') {
      return; // Skip this row
    }
    
    const g = String(groupValue).trim();
    const v = parseFloat(row[valueKey]) || 0;
    
    if (!map[g]) map[g] = { [groupKey]: g, [valueKey]: 0, count: 0 };
    map[g][valueKey] += v;
    map[g].count += 1;
  });
  
  const result = Object.values(map);
  if (method === 'avg') result.forEach(r => { r[valueKey] = r[valueKey] / r.count; });
  
  // Sort by value descending and limit to 15 categories
  return result.sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 15);
}

// ============== HELPER FUNCTIONS FOR NEW CHART TYPES ==============

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

function createHistogram(values, label, bins = 10) {
  if (values.length === 0) return [];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / bins || 1;
  const histogram = Array(bins).fill(0).map((_, i) => ({
    range: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`,
    count: 0,
  }));
  
  values.forEach(val => {
    const binIdx = Math.min(Math.floor((val - min) / binSize), bins - 1);
    histogram[binIdx].count += 1;
  });
  
  return histogram;
}

function calculateQuartiles(values, label) {
  if (values.length === 0) return { name: label, q1: 0, median: 0, q3: 0, min: 0, max: 0 };
  
  const q1 = values[Math.floor(values.length * 0.25)];
  const q2 = values[Math.floor(values.length * 0.5)];
  const q3 = values[Math.floor(values.length * 0.75)];
  
  return {
    name: label,
    min: values[0],
    q1: q1 || values[0],
    median: q2 || values[0],
    q3: q3 || values[values.length - 1],
    max: values[values.length - 1],
  };
}

function createHeatmapData(data, xKey, valueKey) {
  const map = {};
  const values = [];
  
  data.forEach(row => {
    const x = String(row[xKey] || '').trim();
    if (!x) return;
    const val = parseFloat(row[valueKey]) || 0;
    values.push(val);
    if (!map[x]) map[x] = { [xKey]: x, value: val, count: 1 };
    else {
      map[x].value += val;
      map[x].count += 1;
    }
  });
  
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  
  return Object.values(map).slice(0, 20).map(d => ({
    ...d,
    value: d.value / d.count,
    intensity: values.length > 0 ? ((d.value / d.count - minVal) / (maxVal - minVal + 1) * 100) : 50,
  }));
}

function createSankeyData(data, sourceKey, targetKey, valueKey) {
  const links = [];
  const nodes = new Set();
  
  data.forEach(row => {
    const source = String(row[sourceKey] || '').trim();
    const target = String(row[targetKey] || '').trim();
    const value = parseFloat(row[valueKey]) || 0;
    
    if (source && target && value > 0) {
      nodes.add(source);
      nodes.add(target);
      links.push({ source, target, value });
    }
  });
  
  return {
    nodes: Array.from(nodes).map(name => ({ name })),
    links,
  };
}

function createParetoData(aggregated, nameKey, valueKey) {
  const total = aggregated.reduce((sum, item) => sum + item[valueKey], 0);
  let cumulative = 0;
  
  return aggregated.map(item => {
    cumulative += item[valueKey];
    return {
      ...item,
      cumulative,
      cumulativePercent: (cumulative / total * 100),
    };
  });
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

  charts.forEach((c, i) => {
    // Making it a 2×n matrix layout: 2 columns, each taking full width of their column
    layout.push({ i: c.id, x: i % 2, y: Math.floor(i / 2), w: 1, h: 1, minW: 1, minH: 1 });
  });

  return layout;
}
