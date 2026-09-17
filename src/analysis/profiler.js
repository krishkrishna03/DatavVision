/**
 * Column Profiler — detects semantic role of each column based on data, not just names.
 * 
 * Roles: ID, DATE, DATETIME, NUMERIC_MEASURE, CATEGORICAL_DIMENSION, TEXT, BOOLEAN,
 *        GEOGRAPHIC, PERCENTAGE, CURRENCY, COUNT, YEAR, DURATION, UNKNOWN
 * 
 * Uses multiple signals: column name, data type, cardinality, uniqueness ratio,
 * value patterns, date parsing, string patterns, semantic keywords.
 */

const SEMANTIC_KEYWORDS = {
  id: ['id', '_id', 'uuid', 'guid', 'identifier', 'ref', 'key', 'pk', 'serial'],
  currency: ['price', 'cost', 'revenue', 'sales', 'profit', 'amount', 'salary', 'fee', 'charge', 'payment', 'bill', 'income', 'expense', 'budget', 'value', 'total'],
  percentage: ['rate', 'percent', 'ratio', 'pct', 'score', 'rating', 'grade'],
  count: ['count', 'qty', 'quantity', 'num', 'number', 'units', 'volume', 'frequency', 'occurrence'],
  date: ['date', 'time', 'timestamp', 'created', 'updated', 'modified', 'admission', 'order', 'release', 'hire', 'join', 'start', 'end', 'due', 'expiry', 'birth'],
  year: ['year', 'yr', 'release_year', 'fiscal_year', 'calendar_year'],
  duration: ['duration', 'length', 'runtime', 'elapsed', 'span', 'period', 'tenure', 'experience'],
  geographic: ['country', 'state', 'city', 'region', 'province', 'territory', 'zip', 'postal', 'address', 'location', 'lat', 'lon', 'latitude', 'longitude', 'geo', 'zone', 'area', 'district', 'county'],
  boolean: ['is', 'has', 'active', 'enabled', 'verified', 'approved', 'status', 'flag', 'bool', 'deleted', 'published', 'available'],
  measure: ['total', 'sum', 'avg', 'average', 'mean', 'median', 'min', 'max', 'amount', 'value', 'score', 'rating', 'price', 'cost', 'revenue', 'profit', 'salary', 'bill', 'fee', 'age', 'temperature', 'weight', 'height', 'distance', 'speed'],
  name: ['name', 'title', 'label', 'description', 'comment', 'note', 'text', 'summary', 'review', 'feedback', 'address', 'subject', 'content', 'message', 'body'],
};

const COUNTRY_CODES = new Set(['us', 'usa', 'uk', 'gb', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'in', 'br', 'mx', 'es', 'it', 'ru', 'kr', 'nl', 'se', 'no', 'fi', 'dk', 'be', 'ch', 'at', 'pt', 'ie', 'pl', 'tr', 'gr', 'cz', 'hu', 'ro', 'bg', 'hr', 'sk', 'si', 'ee', 'lv', 'lt', 'lu', 'mt', 'cy', 'is', 'li', 'no', 'sg', 'hk', 'tw', 'th', 'my', 'id', 'ph', 'vn', 'nz', 'za', 'eg', 'ma', 'ng', 'ke', 'sa', 'ae', 'il', 'ar', 'cl', 'co', 'pe', 've', 'ec', 'uy', 'py', 'bo', 'cr', 'pa', 'gt', 'hn', 'sv', 'ni', 'do', 'cu', 'jm', 'tt', 'bb', 'bs', 'gd', 'kn', 'lc', 'vc', 'ag', 'dm', 'vc', 'bz', 'gy', 'sr', 'gf', 'pf', 'nc', 're', 'mq', 'gp', 'yt']);
const US_STATE_CODES = new Set(['al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc']);

/**
 * Detect if a string value looks like a date.
 */
function tryParseDate(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.length < 4) return null;
  // ISO date
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s) || /^\d{1,2}-\d{1,2}-\d{2,4}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  // Year only
  if (/^\d{4}$/.test(s)) {
    const y = parseInt(s, 10);
    if (y >= 1900 && y <= 2100) return new Date(y, 0, 1);
  }
  return null;
}

function isDateTimeString(s) {
  if (!s) return false;
  return /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(String(s)) || /\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}/.test(String(s));
}

function looksLikeCurrency(v) {
  if (v == null) return false;
  const s = String(v).trim();
  return /^[$€£¥₹₩₽₹]\s*[\d,.]+/.test(s) || /[\d,.]+\s*(?:usd|eur|gbp|jpy|inr|krw|rub|cad|aud)$/.test(s.toLowerCase());
}

function looksLikePercentage(v) {
  if (v == null) return false;
  const s = String(v).trim();
  return /%\s*$/.test(s) || /^\d+(\.\d+)?\s*%$/.test(s);
}

function isBooleanValue(v) {
  if (v == null || v === '') return false;
  const s = String(v).toLowerCase().trim();
  return ['true', 'false', 'yes', 'no', 'y', 'n', '0', '1', 't', 'f'].includes(s);
}

/**
 * Check if numeric values look like an ID (sequential or unique integers).
 */
function looksLikeID(values, totalRows) {
  if (values.length === 0) return false;
  const uniqueRatio = new Set(values).size / values.length;
  if (uniqueRatio > 0.95 && totalRows > 10) return true;
  // Check if sequential integers
  const nums = values.map(Number).filter(n => !isNaN(n));
  if (nums.length === values.length && nums.length > 5) {
    const sorted = [...nums].sort((a, b) => a - b);
    let sequential = true;
    for (let i = 1; i < Math.min(sorted.length, 50); i++) {
      if (sorted[i] !== sorted[i - 1] + 1) { sequential = false; break; }
    }
    if (sequential) return true;
  }
  return false;
}

/**
 * Check if numeric values look like a year.
 */
function looksLikeYear(values) {
  const nums = values.map(Number).filter(n => !isNaN(n));
  if (nums.length === 0) return false;
  const allInRange = nums.every(n => n >= 1900 && n <= 2100);
  const mostlyIntegers = nums.every(n => n === Math.floor(n));
  return allInRange && mostlyIntegers && nums.length > 0;
}

/**
 * Detect geographic data from string values.
 */
function looksGeographic(values) {
  const sample = values.slice(0, 200).filter(v => v != null && v !== '');
  if (sample.length === 0) return false;
  let geoCount = 0;
  for (const v of sample) {
    const s = String(v).toLowerCase().trim();
    if (COUNTRY_CODES.has(s) || US_STATE_CODES.has(s)) geoCount++;
    else if (/^[A-Z]{2,3},\s*[A-Z]{2}$/i.test(String(v))) geoCount++; // "US, CA" format
  }
  return geoCount / sample.length > 0.5;
}

/**
 * Match column name against semantic keywords.
 */
function matchKeywords(colName) {
  const lower = colName.toLowerCase().replace(/[\s_-]+/g, '');
  const matches = {};
  for (const [role, keywords] of Object.entries(SEMANTIC_KEYWORDS)) {
    for (const kw of keywords) {
      const cleanKw = kw.replace(/[\s_-]+/g, '');
      if (lower === cleanKw || lower.includes(cleanKw)) {
        matches[role] = true;
        break;
      }
    }
  }
  return Object.keys(matches);
}

/**
 * Profile a single column.
 * @param {string} colName - column name
 * @param {Array} values - sample of values from this column
 * @param {number} totalRows - total rows in dataset
 * @param {number} sampleSize - how many values were sampled
 * @returns {Object} column profile with role, confidence, and stats
 */
export function profileColumn(colName, values, totalRows, sampleSize) {
  const nonNull = values.filter(v => v != null && v !== '' && !isNaN(v) || (v != null && String(v).trim() !== ''));
  const nonNullCount = nonNull.length;
  const missingCount = sampleSize - nonNullCount;
  const missingPct = (missingCount / sampleSize) * 100;

  const uniqueValues = new Set(nonNull.map(v => String(v)));
  const uniqueCount = uniqueValues.size;
  const cardinalityRatio = nonNullCount > 0 ? uniqueCount / nonNullCount : 0;

  // Detect base data type
  const numericVals = [];
  const dateVals = [];
  let boolCount = 0;
  let currencyCount = 0;
  let pctCount = 0;

  for (const v of nonNull) {
    const s = String(v).trim();
    if (s === '') continue;

    // Boolean check
    if (isBooleanValue(v)) { boolCount++; }

    // Currency check
    if (looksLikeCurrency(v)) { currencyCount++; }

    // Percentage check
    if (looksLikePercentage(v)) { pctCount++; }

    // Numeric check
    const n = parseFloat(s.replace(/[$€£¥₹₩₽,%\s]/g, ''));
    if (!isNaN(n) && isFinite(n)) {
      numericVals.push(n);
    }

    // Date check
    const d = tryParseDate(v);
    if (d) dateVals.push(d);
  }

  const numericRatio = numericVals.length / Math.max(nonNullCount, 1);
  const dateRatio = dateVals.length / Math.max(nonNullCount, 1);
  const boolRatio = boolCount / Math.max(nonNullCount, 1);
  const currencyRatio = currencyCount / Math.max(nonNullCount, 1);
  const pctRatio = pctCount / Math.max(nonNullCount, 1);

  // Keyword matches
  const kwMatches = matchKeywords(colName);

  // Determine role with confidence
  let role = 'UNKNOWN';
  let confidence = 0;
  let dataType = 'unknown';
  const signals = [];

  // ID detection
  if (looksLikeID(nonNull, totalRows) || (kwMatches.includes('id') && cardinalityRatio > 0.8)) {
    role = 'ID';
    confidence = 0.95;
    dataType = 'integer';
    signals.push('high uniqueness + keyword match');
  }
  // Year detection
  else if (looksLikeYear(numericVals) && (kwMatches.includes('year') || numericVals.every(n => n >= 1900 && n <= 2100))) {
    role = 'YEAR';
    confidence = 0.9;
    dataType = 'integer';
    signals.push('values in 1900-2100 range');
  }
  // Date detection
  else if (dateRatio > 0.7) {
    const hasTime = nonNull.some(v => isDateTimeString(String(v)));
    role = hasTime ? 'DATETIME' : 'DATE';
    confidence = Math.min(0.95, dateRatio);
    dataType = hasTime ? 'datetime' : 'date';
    signals.push(`${(dateRatio * 100).toFixed(0)}% parseable dates`);
  }
  // Boolean detection
  else if (boolRatio > 0.8) {
    role = 'BOOLEAN';
    confidence = 0.9;
    dataType = 'boolean';
    signals.push(`${(boolRatio * 100).toFixed(0)}% boolean values`);
  }
  // Currency detection
  else if (currencyRatio > 0.3 || (kwMatches.includes('currency') && numericRatio > 0.7)) {
    role = 'CURRENCY';
    confidence = 0.85;
    dataType = 'decimal';
    signals.push(currencyRatio > 0.3 ? 'currency symbols detected' : 'currency keyword + numeric');
  }
  // Percentage detection
  else if (pctRatio > 0.3 || (kwMatches.includes('percentage') && numericRatio > 0.7)) {
    role = 'PERCENTAGE';
    confidence = 0.85;
    dataType = 'decimal';
    signals.push(pctRatio > 0.3 ? '% symbols detected' : 'percentage keyword + numeric');
  }
  // Geographic detection
  else if (looksGeographic(nonNull) || (kwMatches.includes('geographic') && cardinalityRatio < 0.5)) {
    role = 'GEOGRAPHIC';
    confidence = 0.8;
    dataType = 'category';
    signals.push('geographic values or keywords');
  }
  // Duration detection
  else if (kwMatches.includes('duration') && numericRatio > 0.7) {
    role = 'DURATION';
    confidence = 0.8;
    dataType = 'decimal';
    signals.push('duration keyword + numeric');
  }
  // Count detection
  else if (kwMatches.includes('count') && numericRatio > 0.7) {
    role = 'COUNT';
    confidence = 0.8;
    dataType = 'integer';
    signals.push('count keyword + numeric');
  }
  // Numeric measure detection
  else if (numericRatio > 0.85) {
    const isInteger = numericVals.every(n => n === Math.floor(n));
    dataType = isInteger ? 'integer' : 'decimal';

    // Check if it's actually an ID despite being numeric
    if (cardinalityRatio > 0.95 && totalRows > 20 && !kwMatches.includes('measure')) {
      role = 'ID';
      confidence = 0.75;
      signals.push('high cardinality numeric, likely ID');
    } else if (kwMatches.includes('measure')) {
      role = 'NUMERIC_MEASURE';
      confidence = 0.9;
      signals.push('measure keyword + numeric');
    } else if (cardinalityRatio < 0.05 && isInteger) {
      // Low cardinality integer might be a category
      role = 'CATEGORICAL_DIMENSION';
      confidence = 0.6;
      dataType = 'category';
      signals.push('low cardinality integer, possibly categorical');
    } else {
      role = 'NUMERIC_MEASURE';
      confidence = 0.75;
      signals.push(`${(numericRatio * 100).toFixed(0)}% numeric values`);
    }
  }
  // Categorical dimension detection
  else if (cardinalityRatio < 0.5 && nonNullCount > 0) {
    role = 'CATEGORICAL_DIMENSION';
    confidence = 0.8;
    dataType = 'category';
    signals.push(`cardinality ratio ${(cardinalityRatio * 100).toFixed(0)}%`);

    // Check if it's actually geographic
    if (kwMatches.includes('geographic')) {
      role = 'GEOGRAPHIC';
      confidence = 0.75;
      signals.push('geographic keyword + categorical');
    }
  }
  // Text detection
  else {
    role = 'TEXT';
    confidence = 0.6;
    dataType = 'text';
    signals.push('high cardinality text');

    if (kwMatches.includes('name')) {
      role = 'TEXT';
      confidence = 0.7;
      signals.push('text/name keyword');
    }
  }

  // Compute basic stats for numeric values
  let stats = null;
  if (numericVals.length > 0 && (role === 'NUMERIC_MEASURE' || role === 'CURRENCY' || role === 'PERCENTAGE' || role === 'COUNT' || role === 'DURATION')) {
    let min = Infinity, max = -Infinity, sum = 0;
    for (const n of numericVals) {
      if (n < min) min = n;
      if (n > max) max = n;
      sum += n;
    }
    const mean = sum / numericVals.length;
    stats = { min, max, mean, sum, count: numericVals.length };
  }

  // Date range
  let dateRange = null;
  if (dateVals.length > 0 && (role === 'DATE' || role === 'DATETIME')) {
    let minDate = Infinity, maxDate = -Infinity;
    for (const d of dateVals) {
      const t = d.getTime();
      if (t < minDate) minDate = t;
      if (t > maxDate) maxDate = t;
    }
    dateRange = { min: new Date(minDate), max: new Date(maxDate) };
  }

  // Top values for categorical
  let topValues = null;
  if (role === 'CATEGORICAL_DIMENSION' || role === 'GEOGRAPHIC' || role === 'BOOLEAN') {
    const freq = {};
    for (const v of nonNull) {
      const s = String(v);
      freq[s] = (freq[s] || 0) + 1;
    }
    topValues = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([value, count]) => ({ value, count }));
  }

  return {
    column: colName,
    role,
    confidence,
    dataType,
    signals,
    uniqueCount,
    cardinalityRatio,
    missingCount,
    missingPct,
    stats,
    dateRange,
    topValues,
    isHighCardinality: cardinalityRatio > 0.8 && uniqueCount > 100,
    isLowCardinality: cardinalityRatio < 0.05 || (uniqueCount <= 12 && uniqueCount > 0),
    isPotentialMeasure: ['NUMERIC_MEASURE', 'CURRENCY', 'PERCENTAGE', 'COUNT', 'DURATION'].includes(role),
    isPotentialDimension: ['CATEGORICAL_DIMENSION', 'GEOGRAPHIC', 'BOOLEAN'].includes(role),
    isPotentialDate: ['DATE', 'DATETIME', 'YEAR'].includes(role),
  };
}

/**
 * Profile all columns in a dataset.
 * @param {Array} data - row objects (can be a sample)
 * @param {string[]} columns - column names
 * @param {number} totalRows - total rows (may be larger than data.length)
 * @returns {Object[]} array of column profiles
 */
export function profileDataset(data, columns, totalRows) {
  const sampleSize = data.length;
  return columns.map(colName => {
    const values = data.map(row => row[colName]);
    return profileColumn(colName, values, totalRows, sampleSize);
  });
}

/**
 * Classify columns into roles for analysis.
 * @param {Object[]} profiles - output of profileDataset
 * @returns {Object} { measures, dimensions, dateColumns, ids, textColumns, booleans, geoColumns }
 */
export function classifyColumns(profiles) {
  const measures = profiles.filter(p => p.isPotentialMeasure);
  const dimensions = profiles.filter(p => p.isPotentialDimension);
  const dateColumns = profiles.filter(p => p.isPotentialDate);
  const ids = profiles.filter(p => p.role === 'ID');
  const textColumns = profiles.filter(p => p.role === 'TEXT');
  const booleans = profiles.filter(p => p.role === 'BOOLEAN');
  const geoColumns = profiles.filter(p => p.role === 'GEOGRAPHIC');
  const yearColumns = profiles.filter(p => p.role === 'YEAR');
  const percentageColumns = profiles.filter(p => p.role === 'PERCENTAGE');
  const currencyColumns = profiles.filter(p => p.role === 'CURRENCY');
  const countColumns = profiles.filter(p => p.role === 'COUNT');
  const durationColumns = profiles.filter(p => p.role === 'DURATION');

  return {
    measures,
    dimensions,
    dateColumns,
    ids,
    textColumns,
    booleans,
    geoColumns,
    yearColumns,
    percentageColumns,
    currencyColumns,
    countColumns,
    durationColumns,
    all: profiles,
  };
}
