/**
 * Data Quality Intelligence Service.
 * Provides automated audits, 0-100 reproducible scoring, Tukey IQR outlier detection,
 * and deterministic cleaning transformations.
 */
export class QualityService {
  /**
   * Run a comprehensive data quality audit on dataset rows.
   * @param {Array<Record<string, any>>} rows
   * @param {Array<object>} schemaInfo
   * @returns {object} Quality summary object
   */
  static auditDataset(rows, schemaInfo) {
    const totalRows = rows.length;
    const totalCols = schemaInfo.length;
    const totalCells = totalRows * totalCols;

    if (totalRows === 0 || totalCols === 0) {
      return {
        score: 0,
        status: 'Low',
        missingCells: 0,
        missingPct: 0,
        duplicateRows: 0,
        outlierCount: 0,
        issues: [
          {
            severity: 'Critical',
            title: 'Empty Dataset',
            column: 'All',
            affectedCount: 0,
            percentage: 100,
            recommendation: 'Upload a CSV dataset containing valid records.'
          }
        ]
      };
    }

    const issues = [];
    let totalMissingCells = 0;

    // 1. Missing cell audit
    schemaInfo.forEach(col => {
      totalMissingCells += col.missingCount;
      const colMissingPct = (col.missingCount / totalRows) * 100;

      if (colMissingPct > 50) {
        issues.push({
          severity: 'Critical',
          title: `Severe Missing Values (${colMissingPct.toFixed(1)}%)`,
          column: col.name,
          affectedCount: col.missingCount,
          percentage: Number(colMissingPct.toFixed(1)),
          recommendation: `Consider dropping column "${col.name}" as over half the records are null.`
        });
      } else if (colMissingPct > 5) {
        issues.push({
          severity: 'Warning',
          title: `Moderate Missing Values (${colMissingPct.toFixed(1)}%)`,
          column: col.name,
          affectedCount: col.missingCount,
          percentage: Number(colMissingPct.toFixed(1)),
          recommendation: `Impute missing values in "${col.name}" using column mean, median, or placeholder.`
        });
      } else if (col.missingCount > 0) {
        issues.push({
          severity: 'Info',
          title: `Minor Missing Values (${col.missingCount} cells)`,
          column: col.name,
          affectedCount: col.missingCount,
          percentage: Number(colMissingPct.toFixed(1)),
          recommendation: `Verify whether missing entries in "${col.name}" can be filled or safely ignored.`
        });
      }
    });

    const overallMissingPct = Number(((totalMissingCells / totalCells) * 100).toFixed(2));

    // 2. Duplicate row detection
    const rowHashes = new Set();
    let duplicateRows = 0;

    rows.forEach(row => {
      // Create a deterministic string representation of the row
      const serialized = JSON.stringify(row);
      if (rowHashes.has(serialized)) {
        duplicateRows++;
      } else {
        rowHashes.add(serialized);
      }
    });

    if (duplicateRows > 0) {
      const dupPct = (duplicateRows / totalRows) * 100;
      issues.push({
        severity: duplicateRows > totalRows * 0.1 ? 'Critical' : 'Warning',
        title: `Duplicate Records Detected (${duplicateRows} rows)`,
        column: 'Dataset-wide',
        affectedCount: duplicateRows,
        percentage: Number(dupPct.toFixed(1)),
        recommendation: 'Remove exact duplicate rows to prevent distorted frequency counts and averages.'
      });
    }

    // 3. Constant columns check
    let constantColCount = 0;
    schemaInfo.forEach(col => {
      if (col.isConstant) {
        constantColCount++;
        issues.push({
          severity: 'Warning',
          title: 'Constant Column (Zero Variance)',
          column: col.name,
          affectedCount: totalRows,
          percentage: 100,
          recommendation: `Column "${col.name}" contains only a single unique value. Consider removing it to reduce noise.`
        });
      }
    });

    // 4. Outlier detection using Tukey's IQR Fences on numeric columns
    let totalOutliers = 0;
    schemaInfo
      .filter(c => c.type === 'numeric')
      .forEach(col => {
        const values = rows
          .map(r => r[col.name])
          .filter(v => typeof v === 'number' && !isNaN(v))
          .sort((a, b) => a - b);

        if (values.length >= 8) {
          const q1Index = Math.floor(values.length * 0.25);
          const q3Index = Math.floor(values.length * 0.75);
          const q1 = values[q1Index];
          const q3 = values[q3Index];
          const iqr = q3 - q1;

          if (iqr > 0) {
            const lowerFence = q1 - 1.5 * iqr;
            const upperFence = q3 + 1.5 * iqr;

            const outliers = values.filter(v => v < lowerFence || v > upperFence);
            if (outliers.length > 0) {
              totalOutliers += outliers.length;
              const outlierPct = (outliers.length / values.length) * 100;
              issues.push({
                severity: outlierPct > 5 ? 'Warning' : 'Info',
                title: `Statistical Outliers Detected (${outliers.length} records)`,
                column: col.name,
                affectedCount: outliers.length,
                percentage: Number(outlierPct.toFixed(1)),
                recommendation: `Values outside [${lowerFence.toFixed(2)}, ${upperFence.toFixed(2)}] were detected via Tukey IQR. Verify if extreme values are genuine observations or entry errors.`
              });
            }
          }
        }
      });

    // 5. Calculate 0-100 Reproducible Data Quality Score
    let score = 100;

    // Deduct for missing cell ratio (up to -35 points)
    const missingPenalty = (totalMissingCells / totalCells) * 35;
    score -= missingPenalty;

    // Deduct for duplicate rows ratio (up to -25 points)
    const dupPenalty = (duplicateRows / totalRows) * 25;
    score -= dupPenalty;

    // Deduct for constant columns (up to -15 points)
    const constantPenalty = (constantColCount / totalCols) * 15;
    score -= constantPenalty;

    // Deduct for outliers (up to -10 points)
    const outlierPenalty = Math.min(10, totalOutliers > 0 ? (totalOutliers / totalRows) * 15 : 0);
    score -= outlierPenalty;

    // Bound between 0 and 100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let status = 'High';
    if (finalScore < 60) {
      status = 'Low';
    } else if (finalScore < 85) {
      status = 'Medium';
    }

    return {
      score: finalScore,
      status,
      missingCells: totalMissingCells,
      missingPct: overallMissingPct,
      duplicateRows,
      outlierCount: totalOutliers,
      issues
    };
  }

  /**
   * Apply explicit, validated cleaning transformations to dataset rows.
   * @param {Array<Record<string, any>>} rows
   * @param {Array<object>} schemaInfo
   * @param {object} options - Cleaning options
   * @returns {{ cleanedRows: Array<Record<string, any>>, stats: object }}
   */
  static cleanDataset(rows, schemaInfo, options = {}) {
    const {
      removeDuplicates = false,
      dropColumns = [],
      imputeMissing = [], // [{ column, strategy: 'mean'|'median'|'mode'|'constant', value }]
      filterRules = [] // [{ column, operator, value }]
    } = options;

    let currentRows = [...rows];
    let removedDuplicatesCount = 0;
    let filteredOutRowsCount = 0;
    let imputedValuesCount = 0;

    // 1. Remove duplicate rows
    if (removeDuplicates) {
      const seen = new Set();
      const deduped = [];
      for (const row of currentRows) {
        const key = JSON.stringify(row);
        if (seen.has(key)) {
          removedDuplicatesCount++;
        } else {
          seen.add(key);
          deduped.push(row);
        }
      }
      currentRows = deduped;
    }

    // 2. Drop specified columns
    if (Array.isArray(dropColumns) && dropColumns.length > 0) {
      const dropSet = new Set(dropColumns);
      currentRows = currentRows.map(row => {
        const newRow = {};
        for (const [k, v] of Object.entries(row)) {
          if (!dropSet.has(k)) {
            newRow[k] = v;
          }
        }
        return newRow;
      });
    }

    // 3. Impute missing values
    if (Array.isArray(imputeMissing) && imputeMissing.length > 0) {
      for (const item of imputeMissing) {
        const { column, strategy, value } = item;
        const colMeta = schemaInfo.find(c => c.name === column);
        if (!colMeta) continue;

        let replacementValue = null;

        if (strategy === 'mean' && colMeta.type === 'numeric') {
          const nums = currentRows.map(r => r[column]).filter(v => typeof v === 'number' && !isNaN(v));
          if (nums.length > 0) {
            replacementValue = Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
          }
        } else if (strategy === 'median' && colMeta.type === 'numeric') {
          const nums = currentRows
            .map(r => r[column])
            .filter(v => typeof v === 'number' && !isNaN(v))
            .sort((a, b) => a - b);
          if (nums.length > 0) {
            const mid = Math.floor(nums.length / 2);
            replacementValue = nums.length % 2 !== 0 ? nums[mid] : Number(((nums[mid - 1] + nums[mid]) / 2).toFixed(2));
          }
        } else if (strategy === 'mode') {
          const freq = new Map();
          for (const r of currentRows) {
            const v = r[column];
            if (v !== null && v !== undefined && v !== '') {
              freq.set(v, (freq.get(v) || 0) + 1);
            }
          }
          let maxCount = 0;
          for (const [val, count] of freq.entries()) {
            if (count > maxCount) {
              maxCount = count;
              replacementValue = val;
            }
          }
        } else if (strategy === 'constant') {
          replacementValue = colMeta.type === 'numeric' ? Number(value) : String(value);
        }

        if (replacementValue !== null) {
          for (const r of currentRows) {
            if (r[column] === null || r[column] === undefined || r[column] === '') {
              r[column] = replacementValue;
              imputedValuesCount++;
            }
          }
        }
      }
    }

    // 4. Filter rows based on rules
    if (Array.isArray(filterRules) && filterRules.length > 0) {
      const initialCount = currentRows.length;
      currentRows = currentRows.filter(row => {
        return filterRules.every(rule => {
          const { column, operator, value } = rule;
          const cell = row[column];

          if (operator === 'is_not_empty') {
            return cell !== null && cell !== undefined && cell !== '';
          }
          if (operator === 'is_empty') {
            return cell === null || cell === undefined || cell === '';
          }
          if (operator === 'equals') {
            return String(cell).toLowerCase() === String(value).toLowerCase();
          }
          if (operator === 'not_equals') {
            return String(cell).toLowerCase() !== String(value).toLowerCase();
          }
          if (operator === 'contains') {
            return String(cell).toLowerCase().includes(String(value).toLowerCase());
          }
          if (operator === 'greater_than') {
            const numVal = Number(value);
            return typeof cell === 'number' && !isNaN(numVal) && cell > numVal;
          }
          if (operator === 'less_than') {
            const numVal = Number(value);
            return typeof cell === 'number' && !isNaN(numVal) && cell < numVal;
          }
          return true;
        });
      });
      filteredOutRowsCount = initialCount - currentRows.length;
    }

    return {
      cleanedRows: currentRows,
      stats: {
        initialRowCount: rows.length,
        finalRowCount: currentRows.length,
        removedDuplicatesCount,
        filteredOutRowsCount,
        imputedValuesCount,
        droppedColumnsCount: (dropColumns || []).length
      }
    };
  }
}
