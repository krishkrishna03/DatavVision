/**
 * Dynamic KPI Generator — generates meaningful KPIs based on dataset semantics.
 * NEVER sums ID columns, year columns, or unsuitable numeric columns.
 * KPIs are scored and selected based on relevance.
 */

import { computeStats, frequencyDistribution, countByYear } from './statistics';

/**
 * Generate KPIs for a dataset based on column profiles.
 * @param {Object} classification - from classifyColumns()
 * @param {Array} data - row objects (can be a sample)
 * @returns {Object[]} array of KPI objects
 */
export function generateKPIs(classification, data) {
  const kpis = [];
  const { measures, dimensions, dateColumns, yearColumns, geoColumns, booleans, ids, all } = classification;

  // 1. ROW COUNT — always relevant
  kpis.push({
    id: 'kpi_row_count',
    type: 'kpi',
    title: 'Total Records',
    column: '__count__',
    value: data.length,
    format: 'raw',
    displayType: 'count',
    confidence: 1.0,
    reason: 'Total number of records in the dataset',
    bgColor: 'rgba(99,102,241,0.1)',
    accentColor: 'rgba(99,102,241,0.8)',
    showSum: false, showAvg: false, showMax: false, showMin: false, showCount: true,
  });

  // 2. CURRENCY measures — sum and average
  for (const col of classification.currencyColumns.slice(0, 2)) {
    const stats = computeStats(data.map(r => r[col.column]));
    if (!stats || stats.count === 0) continue;

    kpis.push({
      id: `kpi_total_${col.column}`,
      type: 'kpi',
      title: `Total ${prettifyName(col.column)}`,
      column: col.column,
      value: stats.sum,
      format: stats.sum > 1_000_000 ? 'M' : stats.sum > 1_000 ? 'K' : 'raw',
      displayType: 'sum',
      confidence: 0.95,
      reason: 'Currency column — total is a meaningful aggregate',
      bgColor: 'rgba(16,185,129,0.1)',
      accentColor: 'rgba(16,185,129,0.8)',
      showSum: true, showAvg: true, showMax: true, showMin: false, showCount: false,
      avg: stats.mean, max: stats.max, min: stats.min, count: stats.count,
    });

    kpis.push({
      id: `kpi_avg_${col.column}`,
      type: 'kpi',
      title: `Average ${prettifyName(col.column)}`,
      column: col.column,
      value: stats.mean,
      format: 'raw',
      displayType: 'avg',
      confidence: 0.9,
      reason: 'Currency column — average is a meaningful aggregate',
      bgColor: 'rgba(6,182,212,0.1)',
      accentColor: 'rgba(6,182,212,0.8)',
      showSum: false, showAvg: true, showMax: false, showMin: false, showCount: true,
      avg: stats.mean, count: stats.count,
    });
  }

  // 3. NUMERIC_MEASURE — sum or average depending on semantics
  for (const col of measures.slice(0, 3)) {
    const stats = computeStats(data.map(r => r[col.column]));
    if (!stats || stats.count === 0) continue;

    // Skip if it looks like an ID despite being classified as measure
    if (col.confidence < 0.7 && stats.count === stats.count) {
      const uniqueRatio = new Set(data.map(r => r[col.column])).size / data.length;
      if (uniqueRatio > 0.95) continue; // skip ID-like
    }

    const isCount = col.role === 'COUNT';
    const isDuration = col.role === 'DURATION';
    const isPercentage = col.role === 'PERCENTAGE';

    if (isCount) {
      kpis.push({
        id: `kpi_total_${col.column}`,
        type: 'kpi',
        title: `Total ${prettifyName(col.column)}`,
        column: col.column,
        value: stats.sum,
        format: 'raw',
        displayType: 'sum',
        confidence: 0.9,
        reason: 'Count column — sum is meaningful',
        bgColor: 'rgba(245,158,11,0.1)',
        accentColor: 'rgba(245,158,11,0.8)',
        showSum: true, showAvg: true, showMax: true, showMin: false, showCount: true,
        avg: stats.mean, max: stats.max, min: stats.min, count: stats.count,
      });
    } else if (isDuration) {
      kpis.push({
        id: `kpi_avg_${col.column}`,
        type: 'kpi',
        title: `Average ${prettifyName(col.column)}`,
        column: col.column,
        value: stats.mean,
        format: 'raw',
        displayType: 'avg',
        confidence: 0.9,
        reason: 'Duration column — average is more meaningful than sum',
        bgColor: 'rgba(139,92,246,0.1)',
        accentColor: 'rgba(139,92,246,0.8)',
        showSum: false, showAvg: true, showMax: true, showMin: true, showCount: true,
        avg: stats.mean, max: stats.max, min: stats.min, count: stats.count,
      });
    } else if (isPercentage) {
      kpis.push({
        id: `kpi_avg_${col.column}`,
        type: 'kpi',
        title: `Average ${prettifyName(col.column)}`,
        column: col.column,
        value: stats.mean,
        format: 'raw',
        displayType: 'avg',
        confidence: 0.85,
        reason: 'Percentage column — average is meaningful',
        bgColor: 'rgba(236,72,153,0.1)',
        accentColor: 'rgba(236,72,153,0.8)',
        showSum: false, showAvg: true, showMax: true, showMin: true, showCount: true,
        avg: stats.mean, max: stats.max, min: stats.min, count: stats.count,
      });
    } else {
      // General numeric measure — show sum + average
      kpis.push({
        id: `kpi_total_${col.column}`,
        type: 'kpi',
        title: `Total ${prettifyName(col.column)}`,
        column: col.column,
        value: stats.sum,
        format: stats.sum > 1_000_000 ? 'M' : stats.sum > 1_000 ? 'K' : 'raw',
        displayType: 'sum',
        confidence: 0.8,
        reason: 'Numeric measure — total is a key aggregate',
        bgColor: 'rgba(99,102,241,0.1)',
        accentColor: 'rgba(99,102,241,0.8)',
        showSum: true, showAvg: true, showMax: true, showMin: false, showCount: false,
        avg: stats.mean, max: stats.max, min: stats.min, count: stats.count,
      });
    }
  }

  // 4. DATE RANGE — if a date column exists
  if (dateColumns.length > 0) {
    const dateCol = dateColumns[0];
    if (dateCol.dateRange) {
      const days = Math.round((dateCol.dateRange.max - dateCol.dateRange.min) / (1000 * 60 * 60 * 24));
      kpis.push({
        id: 'kpi_date_range',
        type: 'kpi',
        title: 'Date Range',
        column: dateCol.column,
        value: days,
        format: 'raw',
        displayType: 'date_range',
        confidence: 0.9,
        reason: 'Time span of the dataset',
        bgColor: 'rgba(6,182,212,0.1)',
        accentColor: 'rgba(6,182,212,0.8)',
        showSum: false, showAvg: false, showMax: false, showMin: false, showCount: false,
        dateMin: dateCol.dateRange.min.toISOString().split('T')[0],
        dateMax: dateCol.dateRange.max.toISOString().split('T')[0],
        dateSpan: days,
      });
    }
  }

  // 5. DISTINCT COUNT for primary dimension
  if (dimensions.length > 0) {
    const dim = dimensions[0];
    const freq = frequencyDistribution(data, dim.column, 1000);
    kpis.push({
      id: `kpi_distinct_${dim.column}`,
      type: 'kpi',
      title: `Distinct ${prettifyName(dim.column)}`,
      column: dim.column,
      value: freq.totalCategories,
      format: 'raw',
      displayType: 'distinct_count',
      confidence: 0.8,
      reason: 'Number of unique categories in primary dimension',
      bgColor: 'rgba(244,63,94,0.1)',
      accentColor: 'rgba(244,63,94,0.8)',
      showSum: false, showAvg: false, showMax: false, showMin: false, showCount: true,
      count: freq.totalCategories,
    });
  }

  // 6. BOOLEAN distribution — if boolean columns exist
  for (const col of booleans.slice(0, 1)) {
    const freq = frequencyDistribution(data, col.column, 2);
    if (freq.categories.length === 2) {
      const trueCount = freq.categories.find(c => ['true', 'yes', '1', 'y'].includes(String(c.value).toLowerCase()))?.count || 0;
      const truePct = (trueCount / data.length) * 100;
      kpis.push({
        id: `kpi_bool_${col.column}`,
        type: 'kpi',
        title: `${prettifyName(col.column)} Rate`,
        column: col.column,
        value: parseFloat(truePct.toFixed(1)),
        format: 'raw',
        displayType: 'percentage',
        confidence: 0.8,
        reason: 'Boolean column — positive rate is meaningful',
        bgColor: 'rgba(16,185,129,0.1)',
        accentColor: 'rgba(16,185,129,0.8)',
        showSum: false, showAvg: false, showMax: false, showMin: false, showCount: true,
        count: trueCount,
      });
    }
  }

  // 7. YEAR distribution — count by year (NOT sum of year)
  if (yearColumns.length > 0 && !dateColumns.length) {
    const yearCol = yearColumns[0];
    const yearData = countByYear(data, yearCol.column, 50);
    if (yearData.length > 1) {
      const latest = yearData[yearData.length - 1];
      const first = yearData[0];
      const growth = first.count > 0 ? ((latest.count - first.count) / first.count) * 100 : 0;
      kpis.push({
        id: `kpi_year_growth_${yearCol.column}`,
        type: 'kpi',
        title: `Records in ${latest.year}`,
        column: yearCol.column,
        value: latest.count,
        format: 'raw',
        displayType: 'count',
        confidence: 0.75,
        reason: 'Year column — record count per year is meaningful (not sum of years)',
        bgColor: 'rgba(245,158,11,0.1)',
        accentColor: 'rgba(245,158,11,0.8)',
        showSum: false, showAvg: false, showMax: false, showMin: false, showCount: true,
        count: latest.count,
        trend: parseFloat(growth.toFixed(1)),
      });
    }
  }

  // Sort by confidence and return top 6
  kpis.sort((a, b) => b.confidence - a.confidence);
  return kpis.slice(0, 6);
}

function prettifyName(name) {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}
