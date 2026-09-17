/**
 * Statistics Calculator — computes statistics safely without stack overflow.
 * Never uses Math.max(...values) or Math.min(...values) on large arrays.
 * Excludes ID-like and year columns from statistical analysis.
 */

/**
 * Compute comprehensive statistics for a numeric column.
 * Uses single-pass algorithms where possible.
 */
export function computeStats(values) {
  const nums = [];
  for (const v of values) {
    if (v == null || v === '') continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$€£¥₹₩₽,%\s]/g, ''));
    if (!isNaN(n) && isFinite(n)) nums.push(n);
  }

  if (nums.length === 0) return null;

  let count = nums.length;
  let sum = 0, min = Infinity, max = -Infinity;
  let sumSq = 0;

  for (let i = 0; i < count; i++) {
    const n = nums[i];
    sum += n;
    sumSq += n * n;
    if (n < min) min = n;
    if (n > max) max = n;
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  const std = Math.sqrt(Math.max(0, variance));
  const range = max - min;

  // Sort for median and quartiles (copy to avoid mutating input)
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const q1Idx = Math.floor(count * 0.25);
  const q3Idx = Math.floor(count * 0.75);
  const q1 = sorted[q1Idx];
  const q3 = sorted[q3Idx];
  const iqr = q3 - q1;

  // Outlier detection using IQR method (Tukey's fences)
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  let outlierCount = 0;
  for (let i = 0; i < count; i++) {
    if (nums[i] < lowerFence || nums[i] > upperFence) outlierCount++;
  }

  // Percentiles
  const p5 = sorted[Math.floor(count * 0.05)];
  const p10 = sorted[Math.floor(count * 0.10)];
  const p90 = sorted[Math.floor(count * 0.90)];
  const p95 = sorted[Math.floor(count * 0.95)];
  const p99 = sorted[Math.floor(count * 0.99)];

  // Skewness
  const skewness = std > 0 ? (3 * (mean - median)) / std : 0;

  return {
    count,
    sum,
    mean,
    median,
    std,
    variance,
    min,
    max,
    range,
    q1,
    q3,
    iqr,
    p5,
    p10,
    p90,
    p95,
    p99,
    outlierCount,
    outlierPct: parseFloat(((outlierCount / count) * 100).toFixed(2)),
    skewness: parseFloat(skewness.toFixed(4)),
    hasOutliers: outlierCount > 0,
  };
}

/**
 * Compute Pearson correlation between two numeric columns.
 * Single pass, no intermediate arrays.
 */
export function pearsonCorrelation(data, keyA, keyB) {
  let n = 0, sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;

  for (let i = 0; i < data.length; i++) {
    const a = parseFloat(data[i][keyA]);
    const b = parseFloat(data[i][keyB]);
    if (isNaN(a) || isNaN(b)) continue;
    n++;
    sumA += a;
    sumB += b;
    sumAB += a * b;
    sumA2 += a * a;
    sumB2 += b * b;
  }

  if (n < 3) return null;

  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  if (den === 0) return null;

  return parseFloat((num / den).toFixed(4));
}

/**
 * Compute correlation matrix for a set of numeric columns.
 * Only includes columns that are genuine measures (not IDs/years).
 */
export function correlationMatrix(data, measureColumns) {
  const cols = measureColumns.slice(0, 8);
  const matrix = [];

  for (let i = 0; i < cols.length; i++) {
    const row = [];
    for (let j = 0; j < cols.length; j++) {
      if (i === j) {
        row.push(1);
      } else if (j < i) {
        row.push(matrix[j][i]);
      } else {
        const r = pearsonCorrelation(data, cols[i].column, cols[j].column);
        row.push(r);
      }
    }
    matrix.push(row);
  }

  return {
    columns: cols.map(c => c.column),
    matrix,
    significantPairs: findSignificantCorrelations(matrix, cols),
  };
}

function findSignificantCorrelations(matrix, cols) {
  const pairs = [];
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const r = matrix[i][j];
      if (r != null && Math.abs(r) >= 0.3) {
        pairs.push({
          colA: cols[i].column,
          colB: cols[j].column,
          correlation: r,
          strength: Math.abs(r) >= 0.7 ? 'strong' : Math.abs(r) >= 0.5 ? 'moderate' : 'weak',
          direction: r > 0 ? 'positive' : 'negative',
        });
      }
    }
  }
  return pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Compute frequency distribution for a categorical column.
 */
export function frequencyDistribution(data, key, maxCategories = 50) {
  const freq = {};
  let nullCount = 0;

  for (let i = 0; i < data.length; i++) {
    const v = data[i][key];
    if (v == null || String(v).trim() === '') {
      nullCount++;
      continue;
    }
    const s = String(v).trim();
    freq[s] = (freq[s] || 0) + 1;
  }

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCategories)
    .map(([value, count]) => ({ value, count, pct: parseFloat(((count / data.length) * 100).toFixed(2)) }));

  return {
    categories: sorted,
    totalCategories: Object.keys(freq).length,
    nullCount,
    topCategory: sorted[0] || null,
  };
}

/**
 * Aggregate a numeric column by a categorical column.
 * Returns groups sorted by sum, with count, sum, mean, min, max.
 */
export function aggregateBy(data, groupKey, valueKey, maxGroups = 20) {
  const groups = {};

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const gVal = row[groupKey];
    if (gVal == null || String(gVal).trim() === '') continue;

    const g = String(gVal).trim();
    const v = parseFloat(row[valueKey]);
    const validV = !isNaN(v) && isFinite(v) ? v : 0;

    if (!groups[g]) {
      groups[g] = { [groupKey]: g, count: 0, sum: 0, values: [] };
    }
    groups[g].count++;
    groups[g].sum += validV;
    if (!isNaN(v)) groups[g].values.push(v);
  }

  const result = Object.values(groups).map(g => {
    const mean = g.values.length > 0 ? g.sum / g.values.length : 0;
    let min = Infinity, max = -Infinity;
    for (const v of g.values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return {
      [groupKey]: g[groupKey],
      [valueKey]: g.sum,
      count: g.count,
      mean: parseFloat(mean.toFixed(4)),
      min: g.values.length > 0 ? min : 0,
      max: g.values.length > 0 ? max : 0,
    };
  });

  result.sort((a, b) => b[valueKey] - a[valueKey]);
  return result.slice(0, maxGroups);
}

/**
 * Aggregate count by a categorical column (for when there's no numeric measure).
 */
export function countByCategory(data, groupKey, maxGroups = 20) {
  const freq = frequencyDistribution(data, groupKey, maxGroups);
  return freq.categories.map(c => ({
    [groupKey]: c.value,
    count: c.count,
    pct: c.pct,
  }));
}

/**
 * Aggregate a numeric column by a date column (time series).
 * Groups by year, month, or day depending on range.
 */
export function aggregateByTime(data, dateKey, valueKey, granularity = 'auto') {
  const groups = {};

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const dateVal = row[dateKey];
    if (dateVal == null || String(dateVal).trim() === '') continue;

    const d = new Date(dateVal);
    if (isNaN(d.getTime())) continue;

    let key;
    if (granularity === 'year' || (granularity === 'auto' && data.length > 365)) {
      key = String(d.getFullYear());
    } else if (granularity === 'month' || (granularity === 'auto' && data.length > 60)) {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    if (!groups[key]) groups[key] = { date: key, count: 0, sum: 0, values: [] };
    groups[key].count++;

    if (valueKey) {
      const v = parseFloat(row[valueKey]);
      if (!isNaN(v)) {
        groups[key].sum += v;
        groups[key].values.push(v);
      }
    } else {
      groups[key].sum++;
    }
  }

  const result = Object.values(groups).map(g => ({
    date: g.date,
    [valueKey || 'count']: valueKey ? g.sum : g.count,
    count: g.count,
    mean: g.values && g.values.length > 0 ? parseFloat((g.sum / g.values.length).toFixed(4)) : null,
  }));

  result.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return result;
}

/**
 * Aggregate count by year (for YEAR role columns).
 */
export function countByYear(data, yearKey, maxYears = 50) {
  const years = {};
  for (let i = 0; i < data.length; i++) {
    const v = data[i][yearKey];
    if (v == null) continue;
    const y = parseInt(String(v), 10);
    if (!isNaN(y)) years[y] = (years[y] || 0) + 1;
  }

  return Object.entries(years)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .slice(-maxYears)
    .map(([year, count]) => ({ year: parseInt(year), count, pct: parseFloat(((count / data.length) * 100).toFixed(2)) }));
}
