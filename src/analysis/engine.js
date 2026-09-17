/**
 * Analysis Engine — the single source of truth.
 * 
 * Pipeline: DATA → PROFILE → CLASSIFY → QUALITY → STATS → KPIs → CHARTS → INSIGHTS → RECOMMENDATIONS
 * 
 * Both the Dashboard and PDF report consume the same AnalysisResult.
 */

import { profileDataset, classifyColumns } from './profiler';
import { analyzeDataQuality } from './dataQuality';
import { computeStats, correlationMatrix, frequencyDistribution, aggregateBy, aggregateByTime, countByYear, countByCategory } from './statistics';
import { generateKPIs } from './kpiGenerator';
import { generateCharts } from './chartSelector';
import { generateInsights } from './insightGenerator';
import { generateRecommendations, generateQuestions } from './recommendationGenerator';

/**
 * Run the full analysis pipeline on a dataset.
 * @param {Array} data - row objects (full dataset or large sample)
 * @param {string[]} columns - column names
 * @param {Object} options - { sampleSize, datasetName, fileType, fileSize }
 * @returns {Object} AnalysisResult — shared analysis model
 */
export function runAnalysis(data, columns, options = {}) {
  const { datasetName = 'Dataset', fileType = 'csv', fileSize = 0 } = options;
  const totalRows = data.length;

  // Determine sample size for profiling (max 5000 rows for speed)
  const profileSampleSize = data.length;
  const profileSample = data;

  // 1. PROFILE — detect column roles
  const profiles = profileDataset(profileSample, columns, totalRows);

  // 2. CLASSIFY — group columns by role
  const classification = classifyColumns(profiles);

  // 3. DATA QUALITY
  const dataQuality = analyzeDataQuality(profileSample, columns, profiles);

  // 4. STATISTICS — for all numeric measures (not IDs/years)
  const statistics = {};
  for (const measure of classification.measures) {
    const stats = computeStats(profileSample.map(r => r[measure.column]));
    if (stats) statistics[measure.column] = stats;
  }

  // 5. CORRELATIONS — only between genuine measures
  let correlations = null;
  if (classification.measures.length >= 2) {
    correlations = correlationMatrix(profileSample, classification.measures);
  }

  // 6. FREQUENCY DISTRIBUTIONS — for categorical dimensions
  const distributions = {};
  for (const dim of classification.dimensions.slice(0, 5)) {
    distributions[dim.column] = frequencyDistribution(profileSample, dim.column, 50);
  }
  for (const geo of classification.geoColumns.slice(0, 3)) {
    distributions[geo.column] = frequencyDistribution(profileSample, geo.column, 50);
  }
  for (const boolCol of classification.booleans.slice(0, 2)) {
    distributions[boolCol.column] = frequencyDistribution(profileSample, boolCol.column, 2);
  }

  // 7. TIME SERIES — if date columns exist
  let timeSeries = null;
  if (classification.dateColumns.length > 0) {
    const dateCol = classification.dateColumns[0];
    if (classification.measures.length > 0) {
      timeSeries = {
        column: dateCol.column,
        measure: classification.measures[0].column,
        data: aggregateByTime(profileSample, dateCol.column, classification.measures[0].column, 'auto'),
      };
    } else {
      timeSeries = {
        column: dateCol.column,
        measure: null,
        data: aggregateByTime(profileSample, dateCol.column, null, 'auto'),
      };
    }
  }

  // 8. YEAR DISTRIBUTION — if year columns exist
  let yearDistribution = null;
  if (classification.yearColumns.length > 0 && classification.dateColumns.length === 0) {
    const yearCol = classification.yearColumns[0];
    yearDistribution = {
      column: yearCol.column,
      data: countByYear(profileSample, yearCol.column, 50),
    };
  }

  // 9. SEGMENT ANALYSIS — top dimension × measure aggregations
  const segments = {};
  const dimsForSegment = classification.dimensions.slice(0, 3);
  for (const dim of dimsForSegment) {
    if (classification.measures.length > 0) {
      segments[dim.column] = aggregateBy(profileSample, dim.column, classification.measures[0].column, 15);
    } else {
      segments[dim.column] = countByCategory(profileSample, dim.column, 15);
    }
  }

  // 10. KPIs
  const kpis = generateKPIs(classification, profileSample);

  // 11. CHARTS
  const charts = [...kpis, ...generateCharts(classification, profileSample)];

  // Build partial result for insight cross-referencing
  const partialResult = {
    datasetProfile: { totalRows, totalColumns: columns.length, name: datasetName, fileType, fileSize },
    dataQuality,
    statistics,
    correlations,
    distributions,
    timeSeries,
    yearDistribution,
    segments,
  };

  // 12. INSIGHTS
  const insights = generateInsights(classification, profileSample, partialResult);

  // 13. RECOMMENDATIONS
  const recommendations = generateRecommendations(insights, classification, partialResult);

  // 14. ANALYTICAL QUESTIONS
  const questions = generateQuestions(classification);

  // Assemble full AnalysisResult
  return {
    datasetProfile: {
      name: datasetName,
      fileType,
      fileSize,
      totalRows,
      totalColumns: columns.length,
      columnNames: columns,
      sampleSize: profileSampleSize,
      analysisDate: new Date().toISOString(),
    },
    columnProfiles: profiles,
    classification,
    dataQuality,
    statistics,
    correlations,
    distributions,
    timeSeries,
    yearDistribution,
    segments,
    kpis,
    charts,
    insights,
    recommendations,
    questions,
  };
}

/**
 * Re-run analysis on filtered data.
 * Uses the same pipeline but with a filtered subset.
 */
export function runFilteredAnalysis(data, columns, options = {}) {
  return runAnalysis(data, columns, options);
}
