/**
 * Automatic Insight Discovery Engine.
 * Computes descriptive statistics, category frequency distributions,
 * Pearson correlation matrices, and time-series trends.
 */
export class InsightService {
  /**
   * Generate comprehensive analytical insights from dataset rows.
   * @param {Array<Record<string, any>>} rows
   * @param {Array<object>} schemaInfo
   * @returns {object} Insights payload
   */
  static generateInsights(rows, schemaInfo) {
    if (!rows || rows.length === 0 || !schemaInfo || schemaInfo.length === 0) {
      return {
        cards: [],
        numericProfiles: {},
        categoricalProfiles: {},
        correlationMatrix: { columns: [], matrix: [] }
      };
    }

    const cards = [];
    const numericCols = schemaInfo.filter(c => c.type === 'numeric');
    const categoricalCols = schemaInfo.filter(c => c.type === 'string' || c.type === 'boolean');
    const dateCols = schemaInfo.filter(c => c.type === 'date');

    // 1. Detailed Numeric Profiles & Five-Number Summary
    const numericProfiles = {};
    numericCols.forEach(col => {
      const vals = rows
        .map(r => r[col.name])
        .filter(v => typeof v === 'number' && !isNaN(v))
        .sort((a, b) => a - b);

      if (vals.length > 0) {
        const count = vals.length;
        const min = vals[0];
        const max = vals[count - 1];
        const sum = vals.reduce((a, b) => a + b, 0);
        const mean = Number((sum / count).toFixed(2));

        const mid = Math.floor(count / 2);
        const median = count % 2 !== 0 ? vals[mid] : Number(((vals[mid - 1] + vals[mid]) / 2).toFixed(2));

        const q1Index = Math.floor(count * 0.25);
        const q3Index = Math.floor(count * 0.75);
        const q1 = vals[q1Index];
        const q3 = vals[q3Index];
        const iqr = Number((q3 - q1).toFixed(2));

        // Standard Deviation
        const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
        const stdDev = Number(Math.sqrt(variance).toFixed(2));

        numericProfiles[col.name] = {
          count,
          min,
          max,
          mean,
          median,
          q1,
          q3,
          iqr,
          stdDev
        };

        // Generate highlight card for wide range / variance
        if (max > min && stdDev > 0) {
          cards.push({
            title: `Summary Metric: ${col.name}`,
            text: `Values range from ${min.toLocaleString()} to ${max.toLocaleString()} with an average of ${mean.toLocaleString()} (Median: ${median.toLocaleString()}, StdDev: ${stdDev.toLocaleString()}).`,
            type: 'highlight',
            columns: [col.name]
          });
        }
      }
    });

    // 2. Categorical Distribution & Dominant Categories
    const categoricalProfiles = {};
    categoricalCols.forEach(col => {
      const freq = new Map();
      let nonNullCount = 0;

      rows.forEach(r => {
        const val = r[col.name];
        if (val !== null && val !== undefined && val !== '') {
          nonNullCount++;
          const str = String(val);
          freq.set(str, (freq.get(str) || 0) + 1);
        }
      });

      const sorted = Array.from(freq.entries())
        .map(([value, count]) => ({
          value,
          count,
          percentage: Number(((count / (nonNullCount || 1)) * 100).toFixed(1))
        }))
        .sort((a, b) => b.count - a.count);

      categoricalProfiles[col.name] = {
        uniqueCount: sorted.length,
        totalEntries: nonNullCount,
        topValues: sorted.slice(0, 5)
      };

      // Flag dominant categories (> 40% of observations)
      if (sorted.length > 1 && sorted[0].percentage >= 40) {
        cards.push({
          title: `Dominant Category: ${col.name}`,
          text: `"${sorted[0].value}" represents ${sorted[0].percentage}% (${sorted[0].count.toLocaleString()} occurrences) of all recorded entries in ${col.name}.`,
          type: 'distribution',
          columns: [col.name]
        });
      }
    });

    // 3. Pearson Correlation Matrix for Numeric Columns
    const correlationMatrix = {
      columns: numericCols.map(c => c.name),
      matrix: []
    };

    if (numericCols.length >= 2) {
      const colNames = numericCols.map(c => c.name);

      colNames.forEach((colA, i) => {
        const row = [];
        colNames.forEach((colB, j) => {
          if (i === j) {
            row.push(1.0);
          } else {
            const r = InsightService.calculatePearson(rows, colA, colB);
            row.push(r !== null ? Number(r.toFixed(3)) : null);

            // Add insight card for strong relationships once (i < j)
            if (i < j && r !== null && Math.abs(r) >= 0.7) {
              const strength = Math.abs(r) >= 0.85 ? 'Very strong' : 'Strong';
              const direction = r > 0 ? 'positive' : 'inverse';
              cards.push({
                title: `${strength} ${direction} Correlation (r = ${r.toFixed(2)})`,
                text: `"${colA}" and "${colB}" exhibit a high degree of linear co-variation (r = ${r.toFixed(2)}). Note: Correlation indicates statistical association, not direct causality.`,
                type: 'correlation',
                columns: [colA, colB]
              });
            }
          }
        });
        correlationMatrix.matrix.push(row);
      });
    }

    // 4. Temporal Trends (if Date + Numeric columns exist)
    if (dateCols.length > 0 && numericCols.length > 0) {
      const dateCol = dateCols[0].name;
      const primaryNumCol = numericCols[0].name;

      // Extract valid date rows and sort chronologically
      const validPoints = rows
        .map(r => ({
          dateStr: r[dateCol],
          date: Date.parse(r[dateCol]),
          val: Number(r[primaryNumCol])
        }))
        .filter(p => !isNaN(p.date) && !isNaN(p.val))
        .sort((a, b) => a.date - b.date);

      if (validPoints.length >= 5) {
        const firstVal = validPoints[0].val;
        const lastVal = validPoints[validPoints.length - 1].val;
        const delta = lastVal - firstVal;
        const pctChange = firstVal !== 0 ? ((delta / Math.abs(firstVal)) * 100).toFixed(1) : 'N/A';

        const trendDirection = delta > 0 ? 'upward' : delta < 0 ? 'downward' : 'stable';

        cards.push({
          title: `Temporal Trajectory: ${primaryNumCol}`,
          text: `Across the timeline from ${validPoints[0].dateStr} to ${validPoints[validPoints.length - 1].dateStr}, "${primaryNumCol}" shows an overall ${trendDirection} movement (${delta >= 0 ? '+' : ''}${pctChange}% change).`,
          type: 'trend',
          columns: [dateCol, primaryNumCol]
        });

        // Detect largest periodic surge / spike
        let maxJumpPct = 0;
        let spikeDate = null;
        for (let i = 1; i < validPoints.length; i++) {
          const prev = validPoints[i - 1].val;
          const curr = validPoints[i].val;
          if (prev > 0) {
            const jumpPct = ((curr - prev) / prev) * 100;
            if (jumpPct > maxJumpPct && jumpPct >= 50) {
              maxJumpPct = jumpPct;
              spikeDate = validPoints[i].dateStr;
            }
          }
        }

        if (spikeDate && maxJumpPct > 50) {
          cards.push({
            title: `Acceleration Spike Detected`,
            text: `A notable surge of +${maxJumpPct.toFixed(1)}% in "${primaryNumCol}" occurred around ${spikeDate}.`,
            type: 'trend',
            columns: [dateCol, primaryNumCol]
          });
        }
      }
    }

    return {
      cards,
      numericProfiles,
      categoricalProfiles,
      correlationMatrix
    };
  }

  /**
   * Compute Pearson correlation coefficient (r) between two numeric fields.
   * @param {Array<Record<string, any>>} rows
   * @param {string} colA
   * @param {string} colB
   * @returns {number|null}
   */
  static calculatePearson(rows, colA, colB) {
    const paired = [];
    rows.forEach(r => {
      const a = Number(r[colA]);
      const b = Number(r[colB]);
      if (!isNaN(a) && isFinite(a) && !isNaN(b) && isFinite(b)) {
        paired.push([a, b]);
      }
    });

    const n = paired.length;
    if (n < 3) return null;

    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < n; i++) {
      sumA += paired[i][0];
      sumB += paired[i][1];
    }

    const meanA = sumA / n;
    const meanB = sumB / n;

    let num = 0;
    let denA = 0;
    let denB = 0;

    for (let i = 0; i < n; i++) {
      const diffA = paired[i][0] - meanA;
      const diffB = paired[i][1] - meanB;
      num += diffA * diffB;
      denA += diffA * diffA;
      denB += diffB * diffB;
    }

    const den = Math.sqrt(denA * denB);
    if (den === 0) return null; // constant column has 0 variance

    return num / den;
  }
}
