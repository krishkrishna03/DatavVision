/**
 * Dynamic Chart Selector — chooses charts based on column roles, cardinality,
 * relationships, and data types. Does NOT generate the same fixed charts for every dataset.
 */

import { aggregateBy, countByCategory, aggregateByTime, countByYear, frequencyDistribution } from './statistics';

const CHART_COLORS = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#f43f5e', '#14b8a6', '#f97316', '#3b82f6',
];

function prettifyName(name) {
  return name.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

/**
 * Generate chart configurations based on column classification.
 * @param {Object} classification - from classifyColumns()
 * @param {Array} data - row objects (can be a sample)
 * @returns {Object[]} array of chart configs
 */
export function generateCharts(classification, data) {
  const charts = [];
  const { measures, dimensions, dateColumns, yearColumns, geoColumns, booleans, ids, all } = classification;
  let chartIdx = 0;

  // Track which columns have been used to avoid repetition
  const usedMeasures = new Set();
  const usedDimensions = new Set();

  // 1. TIME SERIES: Date + Measure → Line chart
  if (dateColumns.length > 0 && measures.length > 0) {
    const dateCol = dateColumns[0];
    for (const measure of measures.slice(0, 2)) {
      if (usedMeasures.has(measure.column)) continue;
      const timeData = aggregateByTime(data, dateCol.column, measure.column, 'auto');
      charts.push({
        id: `chart_${chartIdx++}`,
        type: 'line',
        title: `${prettifyName(measure.column)} Over Time`,
        xKey: 'date',
        yKey: measure.column,
        data: timeData,
        explanation: {
          what: `Trend of ${prettifyName(measure.column)} over time by ${prettifyName(dateCol.column)}`,
          why: 'Time series analysis reveals trends, seasonality, and growth patterns',
          insight: deriveTimeInsight(timeData, measure.column),
        },
        color: CHART_COLORS[chartIdx % CHART_COLORS.length],
      });
      usedMeasures.add(measure.column);
    }
  }

  // 2. TIME SERIES: Date + Count (no measure) → Line chart of record count
  if (dateColumns.length > 0 && measures.length === 0) {
    const dateCol = dateColumns[0];
    const timeData = aggregateByTime(data, dateCol.column, null, 'auto');
    charts.push({
      id: `chart_${chartIdx++}`,
      type: 'line',
      title: `Records Over Time`,
      xKey: 'date',
      yKey: 'count',
      data: timeData,
      explanation: {
        what: `Number of records over time by ${prettifyName(dateCol.column)}`,
        why: 'Shows how data volume changes over the time period',
        insight: deriveTimeInsight(timeData, 'record count'),
      },
      color: CHART_COLORS[chartIdx % CHART_COLORS.length],
    });
  }

  // 3. YEAR + Count → Bar chart (for YEAR role columns, count not sum)
  if (yearColumns.length > 0 && dateColumns.length === 0) {
    const yearCol = yearColumns[0];
    const yearData = countByYear(data, yearCol.column, 50);
    if (yearData.length > 1) {
      charts.push({
        id: `chart_${chartIdx++}`,
        type: 'bar',
        title: `Records by ${prettifyName(yearCol.column)}`,
        xKey: 'year',
        yKey: 'count',
        data: yearData.map(d => ({ year: String(d.year), count: d.count })),
        explanation: {
          what: `Distribution of records across years by ${prettifyName(yearCol.column)}`,
          why: 'Shows how data volume changes across years',
          insight: deriveYearInsight(yearData, yearCol.column),
        },
        color: CHART_COLORS[chartIdx % CHART_COLORS.length],
      });
    }
  }

  // 4. CATEGORY + MEASURE → Bar chart (top N)
  for (const dim of dimensions.slice(0, 3)) {
    if (usedDimensions.has(dim.column)) continue;
    const measure = measures.find(m => !usedMeasures.has(m.column)) || measures[0];
    if (measure) {
      const aggData = aggregateBy(data, dim.column, measure.column, 15);
      charts.push({
        id: `chart_${chartIdx++}`,
        type: 'bar',
        title: `${prettifyName(measure.column)} by ${prettifyName(dim.column)}`,
        xKey: dim.column,
        yKey: measure.column,
        data: aggData,
        explanation: {
          what: `Comparison of ${prettifyName(measure.column)} across ${prettifyName(dim.column)} categories`,
          why: 'Bar charts reveal which categories contribute most to the measure',
          insight: deriveCategoryInsight(aggData, dim.column, measure.column),
        },
        color: CHART_COLORS[chartIdx % CHART_COLORS.length],
      });
      usedDimensions.add(dim.column);
      if (!usedMeasures.has(measure.column)) usedMeasures.add(measure.column);
    }
  }

  // 5. CATEGORY + Count (no measure) → Bar chart of counts
  if (measures.length === 0) {
    for (const dim of dimensions.slice(0, 3)) {
      if (usedDimensions.has(dim.column)) continue;
      const countData = countByCategory(data, dim.column, 15);
      charts.push({
        id: `chart_${chartIdx++}`,
        type: 'bar',
        title: `Records by ${prettifyName(dim.column)}`,
        xKey: dim.column,
        yKey: 'count',
        data: countData,
        explanation: {
          what: `Distribution of records across ${prettifyName(dim.column)} categories`,
          why: 'Shows which categories are most and least common',
          insight: deriveCategoryInsight(countData, dim.column, 'count'),
        },
        color: CHART_COLORS[chartIdx % CHART_COLORS.length],
      });
      usedDimensions.add(dim.column);
    }
  }

  // 6. CATEGORY distribution → Pie/Donut (only if 2-12 unique values)
  for (const dim of dimensions.slice(0, 2)) {
    const freq = frequencyDistribution(data, dim.column, 12);
    if (freq.totalCategories >= 2 && freq.totalCategories <= 12) {
      charts.push({
        id: `chart_${chartIdx++}`,
        type: 'donut',
        title: `${prettifyName(dim.column)} Distribution`,
        nameKey: dim.column,
        valueKey: 'count',
        data: freq.categories.map(c => ({ [dim.column]: c.value, count: c.count })),
        explanation: {
          what: `Share distribution of ${prettifyName(dim.column)}`,
          why: 'Pie charts show proportional breakdown of categories',
          insight: derivePieInsight(freq.categories, dim.column, data.length),
        },
        color: CHART_COLORS[chartIdx % CHART_COLORS.length],
      });
    }
  }

  // 7. BOOLEAN distribution → Donut
  for (const boolCol of booleans.slice(0, 1)) {
    const freq = frequencyDistribution(data, boolCol.column, 2);
    if (freq.categories.length === 2) {
      charts.push({
        id: `chart_${chartIdx++}`,
        type: 'donut',
        title: `${prettifyName(boolCol.column)} Distribution`,
        nameKey: boolCol.column,
        valueKey: 'count',
        data: freq.categories.map(c => ({ [boolCol.column]: c.value, count: c.count })),
        explanation: {
          what: `Distribution of ${prettifyName(boolCol.column)}`,
          why: 'Shows the split between true/false values',
          insight: derivePieInsight(freq.categories, boolCol.column, data.length),
        },
        color: CHART_COLORS[chartIdx % CHART_COLORS.length],
      });
    }
  }

  // 8. GEOGRAPHIC + Measure → Bar chart
  if (geoColumns.length > 0 && measures.length > 0) {
    const geoCol = geoColumns[0];
    const measure = measures.find(m => !usedMeasures.has(m.column)) || measures[0];
    if (measure) {
      const aggData = aggregateBy(data, geoCol.column, measure.column, 15);
      charts.push({
        id: `chart_${chartIdx++}`,
        type: 'bar',
        title: `${prettifyName(measure.column)} by ${prettifyName(geoCol.column)}`,
        xKey: geoCol.column,
        yKey: measure.column,
        data: aggData,
        explanation: {
          what: `Geographic breakdown of ${prettifyName(measure.column)}`,
          why: 'Geographic analysis reveals regional patterns',
          insight: deriveCategoryInsight(aggData, geoCol.column, measure.column),
        },
        color: CHART_COLORS[chartIdx % CHART_COLORS.length],
      });
    }
  }

  // 9. GEOGRAPHIC + Count → Bar chart
  if (geoColumns.length > 0 && measures.length === 0) {
    const geoCol = geoColumns[0];
    const countData = countByCategory(data, geoCol.column, 15);
    charts.push({
      id: `chart_${chartIdx++}`,
      type: 'bar',
      title: `Records by ${prettifyName(geoCol.column)}`,
      xKey: geoCol.column,
      yKey: 'count',
      data: countData,
      explanation: {
        what: `Geographic distribution of records`,
        why: 'Shows which regions have the most data',
        insight: deriveCategoryInsight(countData, geoCol.column, 'count'),
      },
      color: CHART_COLORS[chartIdx % CHART_COLORS.length],
    });
  }

  // 10. MEASURE + MEASURE → Scatter plot (if 2+ measures)
  if (measures.length >= 2) {
    const m1 = measures[0];
    const m2 = measures[1];
    const sampleSize = Math.min(data.length, 500);
    const step = Math.max(1, Math.floor(data.length / sampleSize));
    const scatterData = [];
    for (let i = 0; i < data.length; i += step) {
      const a = parseFloat(data[i][m1.column]);
      const b = parseFloat(data[i][m2.column]);
      if (!isNaN(a) && !isNaN(b)) {
        scatterData.push({ [m1.column]: a, [m2.column]: b });
      }
    }
    charts.push({
      id: `chart_${chartIdx++}`,
      type: 'scatter',
      title: `${prettifyName(m1.column)} vs ${prettifyName(m2.column)}`,
      xKey: m1.column,
      yKey: m2.column,
      data: scatterData,
      explanation: {
        what: `Relationship between ${prettifyName(m1.column)} and ${prettifyName(m2.column)}`,
        why: 'Scatter plots reveal correlations and patterns between two measures',
        insight: deriveScatterInsight(scatterData, m1.column, m2.column),
      },
      color: CHART_COLORS[chartIdx % CHART_COLORS.length],
    });
  }

  // 11. STACKED BAR: Category + 2 Measures
  if (dimensions.length > 0 && measures.length >= 2) {
    const dim = dimensions[0];
    const m1 = measures[0];
    const m2 = measures[1];
    const agg1 = aggregateBy(data, dim.column, m1.column, 10);
    const agg2 = aggregateBy(data, dim.column, m2.column, 10);
    const map = {};
    for (const r of agg1) {
      map[r[dim.column]] = { [dim.column]: r[dim.column], [m1.column]: r[m1.column] };
    }
    for (const r of agg2) {
      const key = r[dim.column];
      if (!map[key]) map[key] = { [dim.column]: key };
      map[key][m2.column] = r[m2.column];
    }
    const stackedData = Object.values(map).slice(0, 10);
    charts.push({
      id: `chart_${chartIdx++}`,
      type: 'stacked-bar',
      title: `${prettifyName(m1.column)} & ${prettifyName(m2.column)} by ${prettifyName(dim.column)}`,
      xKey: dim.column,
      yKeys: [m1.column, m2.column],
      data: stackedData,
      explanation: {
        what: `Comparison of ${prettifyName(m1.column)} and ${prettifyName(m2.column)} across ${prettifyName(dim.column)}`,
        why: 'Stacked bars show how multiple measures contribute within each category',
        insight: deriveStackedInsight(stackedData, dim.column, [m1.column, m2.column]),
      },
      color: CHART_COLORS[chartIdx % CHART_COLORS.length],
    });
  }

  // 12. AREA chart: Date + Measure (if we have date and measure and haven't used area yet)
  if (dateColumns.length > 0 && measures.length > 1) {
    const dateCol = dateColumns[0];
    const measure = measures[1];
    const timeData = aggregateByTime(data, dateCol.column, measure.column, 'auto');
    charts.push({
      id: `chart_${chartIdx++}`,
      type: 'area',
      title: `${prettifyName(measure.column)} Trend`,
      xKey: 'date',
      yKey: measure.column,
      data: timeData,
      explanation: {
        what: `Area chart of ${prettifyName(measure.column)} over time`,
        why: 'Area charts emphasize volume and cumulative patterns',
        insight: deriveTimeInsight(timeData, measure.column),
      },
      color: CHART_COLORS[chartIdx % CHART_COLORS.length],
    });
  }

  // 13. DATA TABLE — always include one
  const tableCols = all.filter(p => p.role !== 'ID').slice(0, 8).map(p => p.column);
  const tableData = data.slice(0, 100).map(row => {
    const obj = {};
    for (const col of tableCols) obj[col] = row[col];
    return obj;
  });
  charts.push({
    id: `chart_${chartIdx++}`,
    type: 'table',
    title: 'Data Preview (First 100 Rows)',
    columns: tableCols,
    data: tableData,
    explanation: {
      what: 'Preview of the raw dataset',
      why: 'Allows inspection of actual data values',
      insight: `Showing ${tableData.length} of ${data.length} rows with ${tableCols.length} columns`,
    },
  });

  return charts;
}

// ── Insight derivation helpers ──

function deriveTimeInsight(timeData, measureName) {
  if (timeData.length < 2) return 'Insufficient data for trend analysis';
  const first = timeData[0];
  const last = timeData[timeData.length - 1];
  const firstVal = first[measureName] || first.count || 0;
  const lastVal = last[measureName] || last.count || 0;
  if (firstVal === 0) return `Data starts at zero and reaches ${lastVal.toLocaleString()}`;
  const change = ((lastVal - firstVal) / Math.abs(firstVal)) * 100;
  const direction = change > 0 ? 'increased' : 'decreased';
  return `${prettifyName(measureName)} ${direction} by ${Math.abs(change).toFixed(1)}% from ${firstVal.toLocaleString()} to ${lastVal.toLocaleString()} between ${first.date} and ${last.date}`;
}

function deriveYearInsight(yearData, colName) {
  if (yearData.length < 2) return 'Insufficient year data';
  const first = yearData[0];
  const last = yearData[yearData.length - 1];
  const change = first.count > 0 ? ((last.count - first.count) / first.count) * 100 : 0;
  return `Records per year ${change >= 0 ? 'increased' : 'decreased'} from ${first.count} in ${first.year} to ${last.count} in ${last.year} (${change >= 0 ? '+' : ''}${change.toFixed(1)}%)`;
}

function deriveCategoryInsight(aggData, dimName, measureName) {
  if (aggData.length === 0) return 'No data available';
  const top = aggData[0];
  const total = aggData.reduce((s, r) => s + (r[measureName] || 0), 0);
  const topVal = top[measureName] || 0;
  const pct = total > 0 ? (topVal / total) * 100 : 0;
  return `"${top[dimName]}" has the highest ${prettifyName(measureName)} at ${topVal.toLocaleString()} (${pct.toFixed(1)}% of total)`;
}

function derivePieInsight(categories, dimName, totalRows) {
  if (categories.length === 0) return 'No data available';
  const top = categories[0];
  const pct = (top.count / totalRows) * 100;
  return `"${top.value}" represents ${pct.toFixed(1)}% of all ${prettifyName(dimName)} values (${top.count.toLocaleString()} of ${totalRows.toLocaleString()} records)`;
}

function deriveScatterInsight(scatterData, xName, yName) {
  if (scatterData.length < 5) return 'Insufficient data for correlation analysis';
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0, n = 0;
  for (const p of scatterData) {
    const x = p[xName], y = p[yName];
    if (isNaN(x) || isNaN(y)) continue;
    n++; sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
  }
  if (n < 3) return 'Insufficient paired data';
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 'No linear relationship detected';
  const r = num / den;
  const strength = Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.4 ? 'moderate' : 'weak';
  const direction = r > 0 ? 'positive' : 'negative';
  return `${direction.charAt(0).toUpperCase() + direction.slice(1)} ${strength} correlation (r=${r.toFixed(3)}) between ${prettifyName(xName)} and ${prettifyName(yName)}`;
}

function deriveStackedInsight(stackedData, dimName, measureNames) {
  if (stackedData.length === 0) return 'No data available';
  const top = stackedData[0];
  const total = stackedData.reduce((s, r) => {
    return s + measureNames.reduce((ms, m) => ms + (r[m] || 0), 0);
  }, 0);
  const topTotal = measureNames.reduce((s, m) => s + (top[m] || 0), 0);
  const pct = total > 0 ? (topTotal / total) * 100 : 0;
  return `"${top[dimName]}" has the highest combined value at ${topTotal.toLocaleString()} (${pct.toFixed(1)}% of total)`;
}
