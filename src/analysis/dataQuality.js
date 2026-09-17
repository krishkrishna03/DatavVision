/**
 * Data Quality Analyzer — computes data quality metrics from a data sample.
 * Does NOT silently remove missing values. Reports everything.
 */

/**
 * Analyze data quality for a dataset.
 * @param {Array} data - row objects (can be a sample)
 * @param {string[]} columns - column names
 * @param {Object[]} profiles - column profiles from profiler.js
 * @returns {Object} data quality report
 */
export function analyzeDataQuality(data, columns, profiles) {
  const totalRows = data.length;
  const totalCells = totalRows * columns.length;

  let totalMissing = 0;
  let totalDuplicateRows = 0;
  let totalEmptyColumns = 0;
  let totalConstantColumns = 0;
  let totalHighCardinalityColumns = 0;
  const columnQuality = [];
  const suspiciousColumns = [];

  // Track row signatures for duplicate detection
  const rowSignatures = new Map();

  for (const profile of profiles) {
    const colMissing = profile.missingCount;
    const missingPct = profile.missingPct;
    totalMissing += colMissing;

    let isConstant = profile.uniqueCount === 1 && profile.missingCount < totalRows;
    let isEmpty = profile.missingCount === totalRows;
    let isHighCardinality = profile.isHighCardinality;

    if (isConstant) totalConstantColumns++;
    if (isEmpty) totalEmptyColumns++;
    if (isHighCardinality) totalHighCardinalityColumns++;

    // Suspicious: high missing %, or constant column, or all unique in a small dataset
    if (missingPct > 50) {
      suspiciousColumns.push({
        column: profile.column,
        issue: 'High missing rate',
        detail: `${missingPct.toFixed(1)}% missing`,
        severity: 'high',
      });
    } else if (missingPct > 20) {
      suspiciousColumns.push({
        column: profile.column,
        issue: 'Moderate missing rate',
        detail: `${missingPct.toFixed(1)}% missing`,
        severity: 'medium',
      });
    }

    if (isConstant && !isEmpty) {
      suspiciousColumns.push({
        column: profile.column,
        issue: 'Constant column',
        detail: 'All values are identical',
        severity: 'low',
      });
    }

    columnQuality.push({
      column: profile.column,
      role: profile.role,
      missingCount: colMissing,
      missingPct: parseFloat(missingPct.toFixed(2)),
      uniqueCount: profile.uniqueCount,
      uniquePct: parseFloat(((profile.uniqueCount / Math.max(totalRows - colMissing, 1)) * 100).toFixed(2)),
      isConstant,
      isEmpty,
      isHighCardinality,
      duplicateCount: totalRows - colMissing - profile.uniqueCount,
      duplicatePct: parseFloat(((totalRows - colMissing - profile.uniqueCount) / Math.max(totalRows - colMissing, 1)) * 100).toFixed(2),
    });
  }

  // Detect duplicate rows (using first 8 columns as signature, limited to 2000 rows for performance)
  const sigCols = columns.slice(0, 8);
  const dupSample = data.slice(0, 2000);
  for (const row of dupSample) {
    const sig = sigCols.map(c => String(row[c] ?? '')).join('|||');
    rowSignatures.set(sig, (rowSignatures.get(sig) || 0) + 1);
  }
  for (const count of rowSignatures.values()) {
    if (count > 1) totalDuplicateRows += count - 1;
  }

  const duplicatePct = (totalDuplicateRows / Math.max(totalRows, 1)) * 100;
  const missingPct = (totalMissing / Math.max(totalCells, 1)) * 100;
  const completenessPct = 100 - missingPct;

  // Overall quality score (0-100)
  let qualityScore = 100;
  qualityScore -= missingPct * 0.5;
  qualityScore -= duplicatePct * 0.3;
  qualityScore -= totalConstantColumns * 5;
  qualityScore -= totalEmptyColumns * 10;
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  return {
    totalRows,
    totalColumns: columns.length,
    totalCells,
    totalMissing,
    missingPct: parseFloat(missingPct.toFixed(2)),
    completenessPct: parseFloat(completenessPct.toFixed(2)),
    duplicateRows: totalDuplicateRows,
    duplicatePct: parseFloat(duplicatePct.toFixed(2)),
    emptyColumns: totalEmptyColumns,
    constantColumns: totalConstantColumns,
    highCardinalityColumns: totalHighCardinalityColumns,
    suspiciousColumns,
    columnQuality,
    qualityScore: parseFloat(qualityScore.toFixed(1)),
  };
}
