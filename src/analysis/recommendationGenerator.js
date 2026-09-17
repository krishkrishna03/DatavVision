/**
 * Recommendation Generator — generates recommendations based on actual insights.
 * Every recommendation references real data findings.
 */

function prettifyName(name) {
  return name.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

/**
 * Generate recommendations from insights and analysis.
 * @param {Object[]} insights - generated insights
 * @param {Object} classification - column classification
 * @param {Object} analysisResult - full analysis result
 * @returns {Object[]} array of recommendation objects
 */
export function generateRecommendations(insights, classification, analysisResult) {
  const recs = [];

  // Distribution-based recommendations
  const distributionInsights = insights.filter(i => i.type === 'distribution');
  for (const insight of distributionInsights.slice(0, 2)) {
    recs.push({
      title: `Focus on top-performing ${insight.title.replace(' Distribution', '')}`,
      body: `Since the data shows a concentration in specific categories (${insight.body.substring(0, 100)}...), consider allocating resources proportionally. The leading category represents a significant share and warrants priority attention.`,
      basedOn: insight.title,
    });
  }

  // Trend-based recommendations
  const trendInsights = insights.filter(i => i.type === 'trend-up' || i.type === 'trend-down');
  for (const insight of trendInsights.slice(0, 2)) {
    const isUp = insight.type === 'trend-up';
    recs.push({
      title: isUp ? `Capitalize on upward trend in ${insight.title.replace(' Trend', '')}` : `Address declining trend in ${insight.title.replace(' Trend', '')}`,
      body: isUp
        ? `The data shows a positive trend: ${insight.body}. This growth pattern suggests opportunities for expansion and investment in the trending area.`
        : `The data shows a decline: ${insight.body}. Investigate root causes and consider corrective actions to reverse the downward trajectory.`,
      basedOn: insight.title,
    });
  }

  // Outlier-based recommendations
  const outlierInsights = insights.filter(i => i.type === 'outlier');
  for (const insight of outlierInsights.slice(0, 1)) {
    recs.push({
      title: `Investigate outliers in ${insight.title.replace('Outliers in ', '')}`,
      body: `${insight.body} Outliers may indicate data quality issues, exceptional cases, or anomalies worth investigating. Review these records to determine if they are errors or genuine extreme values.`,
      basedOn: insight.title,
    });
  }

  // Correlation-based recommendations
  const corrInsights = insights.filter(i => i.type === 'correlation');
  for (const insight of corrInsights.slice(0, 1)) {
    recs.push({
      title: `Leverage detected correlation`,
      body: `${insight.body} This relationship can be used for predictive modeling or as a leading indicator. Note: correlation does not imply causation — further investigation is needed to establish causal links.`,
      basedOn: insight.title,
    });
  }

  // Data quality recommendations
  const qualityInsights = insights.filter(i => i.type === 'quality');
  for (const insight of qualityInsights.slice(0, 1)) {
    recs.push({
      title: `Address data quality issues`,
      body: `${insight.body} Improving data completeness and reducing duplicates will enhance the reliability of future analyses. Consider implementing data validation at the point of entry.`,
      basedOn: insight.title,
    });
  }

  // Geographic recommendations
  const geoInsights = insights.filter(i => i.type === 'geographic');
  for (const insight of geoInsights.slice(0, 1)) {
    recs.push({
      title: `Geographic concentration analysis`,
      body: `${insight.body} The geographic concentration suggests potential for targeted regional strategies. Consider expanding presence in underrepresented areas or doubling down on high-performing regions.`,
      basedOn: insight.title,
    });
  }

  // Fallback: if no specific recommendations, add a general one based on the dataset
  if (recs.length === 0) {
    recs.push({
      title: 'Continue monitoring key metrics',
      body: `The current dataset provides a baseline of ${analysisResult.datasetProfile?.totalRows?.toLocaleString() || 'the'} records. Establish regular monitoring of the detected measures and dimensions to track changes over time.`,
      basedOn: 'Dataset overview',
    });
  }

  return recs.slice(0, 6);
}

/**
 * Generate analytical questions based on detected columns.
 */
export function generateQuestions(classification) {
  const questions = [];
  const { measures, dimensions, dateColumns, yearColumns, geoColumns, booleans } = classification;

  // Measure-based questions
  for (const m of measures.slice(0, 2)) {
    questions.push(`What is the total and average ${prettifyName(m.column)}?`);
    questions.push(`How does ${prettifyName(m.column)} vary across categories?`);
  }

  // Dimension-based questions
  for (const d of dimensions.slice(0, 2)) {
    questions.push(`Which ${prettifyName(d.column)} has the most records?`);
    if (measures.length > 0) {
      questions.push(`What is the ${prettifyName(measures[0].column)} by ${prettifyName(d.column)}?`);
    }
  }

  // Date-based questions
  if (dateColumns.length > 0) {
    questions.push(`What is the trend over time by ${prettifyName(dateColumns[0].column)}?`);
    if (measures.length > 0) {
      questions.push(`How has ${prettifyName(measures[0].column)} changed over time?`);
    }
  }

  // Year-based questions
  if (yearColumns.length > 0 && dateColumns.length === 0) {
    questions.push(`How many records exist per ${prettifyName(yearColumns[0].column)}?`);
  }

  // Geographic questions
  if (geoColumns.length > 0) {
    questions.push(`Which ${prettifyName(geoColumns[0].column)} has the most records?`);
  }

  // Correlation questions
  if (measures.length >= 2) {
    questions.push(`Is there a relationship between ${prettifyName(measures[0].column)} and ${prettifyName(measures[1].column)}?`);
  }

  // Boolean questions
  if (booleans.length > 0) {
    questions.push(`What is the distribution of ${prettifyName(booleans[0].column)}?`);
  }

  return questions.slice(0, 8);
}
