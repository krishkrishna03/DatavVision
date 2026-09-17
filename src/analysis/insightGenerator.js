/**
 * Insight Generator — generates insights with REAL calculated values.
 * Every insight contains actual column names, calculations, and values.
 * NEVER uses generic statements without data backing.
 */

import { computeStats, frequencyDistribution, aggregateBy, aggregateByTime, countByYear, pearsonCorrelation } from './statistics';

function prettifyName(name) {
  return name.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

/**
 * Generate insights from the analysis result.
 * @param {Object} classification - column classification
 * @param {Array} data - row objects (sample)
 * @param {Object} analysisResult - partial analysis result for cross-referencing
 * @returns {Object[]} array of insight objects
 */
export function generateInsights(classification, data, analysisResult = {}) {
  const insights = [];
  const { measures, dimensions, dateColumns, yearColumns, geoColumns, booleans, ids, all } = classification;

  // 1. Dataset overview
  const numericCount = measures.length;
  const catCount = dimensions.length;
  const dateCount = dateColumns.length + yearColumns.length;
  const idCount = ids.length;
  insights.push({
    type: 'info',
    title: 'Dataset Overview',
    body: `Dataset contains ${data.length.toLocaleString()} records across ${all.length} columns. Detected: ${numericCount} numeric measure(s), ${catCount} categorical dimension(s), ${dateCount} date/time column(s), ${idCount} ID column(s).`,
  });

  // 2. Top category distribution (for primary dimension)
  for (const dim of dimensions.slice(0, 2)) {
    const freq = frequencyDistribution(data, dim.column, 1000);
    if (freq.categories.length > 0 && freq.totalCategories > 1) {
      const top = freq.categories[0];
      const second = freq.categories[1];
      const topPct = (top.count / data.length) * 100;
      insights.push({
        type: 'distribution',
        title: `${prettifyName(dim.column)} Distribution`,
        body: `"${top.value}" is the most frequent ${prettifyName(dim.column)} with ${top.count.toLocaleString()} records (${topPct.toFixed(1)}%), followed by "${second.value}" with ${second.count.toLocaleString()} (${((second.count / data.length) * 100).toFixed(1)}%).`,
      });
    }
  }

  // 3. Numeric measure statistics
  for (const measure of measures.slice(0, 3)) {
    const stats = computeStats(data.map(r => r[measure.column]));
    if (!stats || stats.count === 0) continue;

    const isCurrency = measure.role === 'CURRENCY';
    const isDuration = measure.role === 'DURATION';
    const isPercentage = measure.role === 'PERCENTAGE';

    if (isDuration || isPercentage) {
      insights.push({
        type: 'statistic',
        title: `${prettifyName(measure.column)} Statistics`,
        body: `${prettifyName(measure.column)} averages ${stats.mean.toFixed(2)} with a median of ${stats.median.toFixed(2)}. Values range from ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)} (std dev: ${stats.std.toFixed(2)}).`,
      });
    } else if (isCurrency) {
      insights.push({
        type: 'statistic',
        title: `${prettifyName(measure.column)} Statistics`,
        body: `Total ${prettifyName(measure.column)} is ${stats.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}. Average is ${stats.mean.toFixed(2)}, median is ${stats.median.toFixed(2)}, ranging from ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)}.`,
      });
    } else {
      insights.push({
        type: 'statistic',
        title: `${prettifyName(measure.column)} Statistics`,
        body: `${prettifyName(measure.column)} has a total of ${stats.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })} and average of ${stats.mean.toFixed(2)}. Median: ${stats.median.toFixed(2)}, Range: ${stats.min.toFixed(2)}–${stats.max.toFixed(2)}.`,
      });
    }

    // Outliers
    if (stats.hasOutliers && stats.outlierCount > 0) {
      const outlierPct = stats.outlierPct;
      insights.push({
        type: 'outlier',
        title: `Outliers in ${prettifyName(measure.column)}`,
        body: `${stats.outlierCount} outlier(s) detected in ${prettifyName(measure.column)} (${outlierPct}% of values), using IQR method (Q1=${stats.q1.toFixed(2)}, Q3=${stats.q3.toFixed(2)}, IQR=${stats.iqr.toFixed(2)}).`,
      });
    }
  }

  // 4. Time-based insights (only if date columns exist)
  if (dateColumns.length > 0) {
    const dateCol = dateColumns[0];
    if (dateCol.dateRange) {
      const days = Math.round((dateCol.dateRange.max - dateCol.dateRange.min) / (1000 * 60 * 60 * 24));
      const startStr = dateCol.dateRange.min.toISOString().split('T')[0];
      const endStr = dateCol.dateRange.max.toISOString().split('T')[0];

      if (measures.length > 0) {
        const measure = measures[0];
        const timeData = aggregateByTime(data, dateCol.column, measure.column, 'auto');
        if (timeData.length >= 2) {
          const first = timeData[0];
          const last = timeData[timeData.length - 1];
          const firstVal = first[measure.column] || 0;
          const lastVal = last[measure.column] || 0;
          if (firstVal !== 0) {
            const change = ((lastVal - firstVal) / Math.abs(firstVal)) * 100;
            insights.push({
              type: change >= 0 ? 'trend-up' : 'trend-down',
              title: `${prettifyName(measure.column)} Trend`,
              body: `${prettifyName(measure.column)} ${change >= 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% from ${firstVal.toLocaleString()} (${first.date}) to ${lastVal.toLocaleString()} (${last.date}) over the period ${startStr} to ${endStr} (${days} days).`,
            });
          }
        }
      } else {
        const timeData = aggregateByTime(data, dateCol.column, null, 'auto');
        if (timeData.length >= 2) {
          const first = timeData[0];
          const last = timeData[timeData.length - 1];
          const change = first.count > 0 ? ((last.count - first.count) / first.count) * 100 : 0;
          insights.push({
            type: change >= 0 ? 'trend-up' : 'trend-down',
            title: `Record Count Trend`,
            body: `Records ${change >= 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% from ${first.count} (${first.date}) to ${last.count} (${last.date}) over the period ${startStr} to ${endStr}.`,
          });
        }
      }
    }
  }

  // 5. Year-based insights (for YEAR columns, count not sum)
  if (yearColumns.length > 0 && dateColumns.length === 0) {
    const yearCol = yearColumns[0];
    const yearData = countByYear(data, yearCol.column, 50);
    if (yearData.length >= 2) {
      const first = yearData[0];
      const last = yearData[yearData.length - 1];
      const change = first.count > 0 ? ((last.count - first.count) / first.count) * 100 : 0;
      insights.push({
        type: change >= 0 ? 'trend-up' : 'trend-down',
        title: `Records by ${prettifyName(yearCol.column)}`,
        body: `Record count ${change >= 0 ? 'grew' : 'declined'} by ${Math.abs(change).toFixed(1)}% from ${first.count} in ${first.year} to ${last.count} in ${last.year}.`,
      });
    }
  }

  // 6. Correlation insights (only between genuine measures)
  if (measures.length >= 2) {
    const m1 = measures[0];
    const m2 = measures[1];
    const r = pearsonCorrelation(data, m1.column, m2.column);
    if (r != null && Math.abs(r) >= 0.3) {
      const strength = Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.5 ? 'moderate' : 'weak';
      const direction = r > 0 ? 'positive' : 'negative';
      insights.push({
        type: 'correlation',
        title: `${prettifyName(m1.column)} vs ${prettifyName(m2.column)}`,
        body: `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation (r=${r.toFixed(3)}) between ${prettifyName(m1.column)} and ${prettifyName(m2.column)}. This indicates a ${direction} relationship but does not imply causation.`,
      });
    }
  }

  // 7. Boolean distribution insight
  for (const boolCol of booleans.slice(0, 1)) {
    const freq = frequencyDistribution(data, boolCol.column, 2);
    if (freq.categories.length === 2) {
      const c1 = freq.categories[0];
      const c2 = freq.categories[1];
      insights.push({
        type: 'distribution',
        title: `${prettifyName(boolCol.column)} Split`,
        body: `${prettifyName(boolCol.column)}: "${c1.value}" = ${c1.count.toLocaleString()} (${((c1.count / data.length) * 100).toFixed(1)}%), "${c2.value}" = ${c2.count.toLocaleString()} (${((c2.count / data.length) * 100).toFixed(1)}%).`,
      });
    }
  }

  // 8. Geographic insight
  if (geoColumns.length > 0) {
    const geoCol = geoColumns[0];
    const freq = frequencyDistribution(data, geoCol.column, 1000);
    if (freq.categories.length > 1) {
      const top = freq.categories[0];
      const pct = (top.count / data.length) * 100;
      insights.push({
        type: 'geographic',
        title: `Top ${prettifyName(geoCol.column)}`,
        body: `"${top.value}" has the most records (${top.count.toLocaleString()}, ${pct.toFixed(1)}% of total) across ${freq.totalCategories} ${prettifyName(geoCol.column)}.`,
      });
    }
  }

  // 9. Data quality insight
  if (analysisResult.dataQuality) {
    const dq = analysisResult.dataQuality;
    if (dq.missingPct > 0) {
      insights.push({
        type: 'quality',
        title: 'Data Completeness',
        body: `Data is ${dq.completenessPct.toFixed(1)}% complete with ${dq.totalMissing.toLocaleString()} missing values across ${dq.totalColumns} columns. ${dq.duplicateRows} duplicate row(s) detected (${dq.duplicatePct.toFixed(1)}%).`,
      });
    }
    if (dq.suspiciousColumns.length > 0) {
      const suspicious = dq.suspiciousColumns[0];
      insights.push({
        type: 'quality',
        title: `Data Quality Flag: ${suspicious.column}`,
        body: `Column "${suspicious.column}" has ${suspicious.detail} (${suspicious.severity} severity).`,
      });
    }
  }

  return insights.slice(0, 10);
}
