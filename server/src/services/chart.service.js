/**
 * Smart Chart Recommendation & Visual Data Processing Service.
 */
export class ChartService {
  /**
   * Recommend appropriate visualizations based on column types and cardinality.
   * @param {Array<object>} schemaInfo
   * @returns {Array<object>} Array of chart recommendations
   */
  static recommendCharts(schemaInfo) {
    if (!schemaInfo || schemaInfo.length === 0) return [];

    const recommendations = [];
    const dateCols = schemaInfo.filter(c => c.type === 'date');
    const numCols = schemaInfo.filter(c => c.type === 'numeric');
    const catCols = schemaInfo.filter(c => c.type === 'string' || c.type === 'boolean');

    // Recommendation 1: Time Series Line Chart
    if (dateCols.length > 0 && numCols.length > 0) {
      recommendations.push({
        chartType: 'line',
        xAxisColumn: dateCols[0].name,
        yAxisColumn: numCols[0].name,
        aggregation: 'sum',
        title: `${numCols[0].name} over Time`,
        reason: `Ideal for revealing trends, seasonal cycles, and momentum over temporal intervals using "${dateCols[0].name}".`,
        suitabilityScore: 5
      });
    }

    // Recommendation 2: Bar Chart for Categorical Comparisons
    const suitableCatCol = catCols.find(c => c.uniqueCount >= 2 && c.uniqueCount <= 30);
    if (suitableCatCol && numCols.length > 0) {
      recommendations.push({
        chartType: 'bar',
        xAxisColumn: suitableCatCol.name,
        yAxisColumn: numCols[0].name,
        aggregation: 'sum',
        title: `${numCols[0].name} by ${suitableCatCol.name}`,
        reason: `Best suited for comparing discrete category magnitudes across "${suitableCatCol.name}" without clutter.`,
        suitabilityScore: 5
      });
    }

    // Recommendation 3: Doughnut Chart for Part-to-Whole Composition (Low cardinality)
    const lowCardCatCol = catCols.find(c => c.uniqueCount >= 2 && c.uniqueCount <= 7);
    if (lowCardCatCol && numCols.length > 0) {
      recommendations.push({
        chartType: 'doughnut',
        xAxisColumn: lowCardCatCol.name,
        yAxisColumn: numCols[0].name,
        aggregation: 'sum',
        title: `Share of ${numCols[0].name} by ${lowCardCatCol.name}`,
        reason: `Low category count (${lowCardCatCol.uniqueCount} items) makes "${lowCardCatCol.name}" ideal for clean proportional breakdown.`,
        suitabilityScore: 4
      });
    }

    // Recommendation 4: Scatter Plot for 2 Continuous Numeric Variables
    if (numCols.length >= 2) {
      recommendations.push({
        chartType: 'scatter',
        xAxisColumn: numCols[0].name,
        yAxisColumn: numCols[1].name,
        aggregation: 'none',
        title: `${numCols[1].name} vs ${numCols[0].name}`,
        reason: `Enables visual assessment of correlation, clustering, and outlier anomalies between two continuous metrics.`,
        suitabilityScore: 4
      });
    }

    // Recommendation 5: Numeric Distribution Histogram
    if (numCols.length > 0) {
      recommendations.push({
        chartType: 'histogram',
        xAxisColumn: numCols[0].name,
        yAxisColumn: '',
        aggregation: 'count',
        title: `Distribution of ${numCols[0].name}`,
        reason: `Reveals skewness, kurtosis, and modal clusters across continuous values of "${numCols[0].name}".`,
        suitabilityScore: 3
      });
    }

    return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }

  /**
   * Process raw dataset rows into Chart.js formatted labels and datasets.
   * @param {Array<Record<string, any>>} rows
   * @param {object} config - Chart configuration
   * @returns {object} Chart.js data payload
   */
  static buildChartData(rows, config) {
    const {
      chartType = 'bar',
      xAxisColumn,
      yAxisColumn,
      aggregation = 'sum',
      groupByColumn = '',
      filterRules = []
    } = config;

    if (!xAxisColumn) {
      throw new Error('X-axis dimension is required to construct a visualization.');
    }

    // 1. Filter rows
    let filteredRows = [...rows];
    if (Array.isArray(filterRules) && filterRules.length > 0) {
      filteredRows = filteredRows.filter(row => {
        return filterRules.every(rule => {
          const { column, operator, value } = rule;
          const cell = row[column];
          if (operator === 'is_not_empty') return cell !== null && cell !== undefined && cell !== '';
          if (operator === 'is_empty') return cell === null || cell === undefined || cell === '';
          if (operator === 'equals') return String(cell).toLowerCase() === String(value).toLowerCase();
          if (operator === 'not_equals') return String(cell).toLowerCase() !== String(value).toLowerCase();
          if (operator === 'contains') return String(cell).toLowerCase().includes(String(value).toLowerCase());
          if (operator === 'greater_than') return Number(cell) > Number(value);
          if (operator === 'less_than') return Number(cell) < Number(value);
          return true;
        });
      });
    }

    // Palette generator
    const modernPalette = [
      '#2563eb', // Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#8b5cf6', // Violet
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#ec4899', // Pink
      '#14b8a6', // Teal
      '#f97316', // Orange
      '#6366f1'  // Indigo
    ];

    // Special Case: Histogram
    if (chartType === 'histogram') {
      const vals = filteredRows
        .map(r => Number(r[xAxisColumn]))
        .filter(v => !isNaN(v) && isFinite(v))
        .sort((a, b) => a - b);

      if (vals.length === 0) {
        return { labels: [], datasets: [{ label: 'Frequency', data: [] }] };
      }

      const min = vals[0];
      const max = vals[vals.length - 1];
      const binCount = Math.min(10, Math.max(5, Math.floor(Math.sqrt(vals.length))));
      const binWidth = (max - min) / (binCount || 1);

      const labels = [];
      const counts = new Array(binCount).fill(0);

      for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binWidth;
        const binEnd = min + (i + 1) * binWidth;
        labels.push(`${binStart.toFixed(1)} - ${binEnd.toFixed(1)}`);
      }

      vals.forEach(v => {
        let binIdx = Math.floor((v - min) / binWidth);
        if (binIdx >= binCount) binIdx = binCount - 1;
        counts[binIdx]++;
      });

      return {
        labels,
        datasets: [
          {
            label: `Frequency of ${xAxisColumn}`,
            data: counts,
            backgroundColor: 'rgba(37, 99, 235, 0.7)',
            borderColor: '#2563eb',
            borderWidth: 1
          }
        ]
      };
    }

    // Special Case: Scatter Plot
    if (chartType === 'scatter') {
      const scatterPoints = filteredRows
        .map(r => ({
          x: Number(r[xAxisColumn]),
          y: Number(r[yAxisColumn]),
          label: groupByColumn ? String(r[groupByColumn] || 'Unknown') : null
        }))
        .filter(p => !isNaN(p.x) && isFinite(p.x) && !isNaN(p.y) && isFinite(p.y));

      if (groupByColumn) {
        // Group points by group column into distinct datasets
        const groups = new Map();
        scatterPoints.forEach(p => {
          const gName = p.label || 'Default';
          if (!groups.has(gName)) groups.set(gName, []);
          groups.get(gName).push({ x: p.x, y: p.y });
        });

        const datasets = Array.from(groups.entries()).map(([groupName, data], idx) => ({
          label: groupName,
          data,
          backgroundColor: modernPalette[idx % modernPalette.length],
          borderColor: modernPalette[idx % modernPalette.length],
          pointRadius: 5
        }));

        return { datasets };
      }

      return {
        datasets: [
          {
            label: `${yAxisColumn} vs ${xAxisColumn}`,
            data: scatterPoints.map(p => ({ x: p.x, y: p.y })),
            backgroundColor: 'rgba(37, 99, 235, 0.7)',
            borderColor: '#2563eb',
            pointRadius: 5
          }
        ]
      };
    }

    // Standard Aggregated Charts (Line, Bar, Doughnut, Pie)
    if (groupByColumn) {
      // 2-Dimensional grouping (xAxis x groupByColumn)
      const xLabelsSet = new Set();
      const groupsMap = new Map(); // groupVal -> Map(xVal -> [yVals])

      filteredRows.forEach(row => {
        const xVal = row[xAxisColumn] !== null ? String(row[xAxisColumn]) : '(empty)';
        const gVal = row[groupByColumn] !== null ? String(row[groupByColumn]) : '(empty)';
        const yVal = Number(row[yAxisColumn]);

        xLabelsSet.add(xVal);

        if (!groupsMap.has(gVal)) groupsMap.set(gVal, new Map());
        const xMap = groupsMap.get(gVal);
        if (!xMap.has(xVal)) xMap.set(xVal, []);
        if (!isNaN(yVal)) xMap.get(xVal).push(yVal);
      });

      const labels = Array.from(xLabelsSet).sort((a, b) => {
        // Try date sort if parseable
        const dateA = Date.parse(a);
        const dateB = Date.parse(b);
        if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
        return a.localeCompare(b);
      });

      const datasets = Array.from(groupsMap.entries()).map(([gName, xMap], idx) => {
        const color = modernPalette[idx % modernPalette.length];
        const data = labels.map(xKey => {
          const vals = xMap.get(xKey) || [];
          return ChartService.aggregateValues(vals, aggregation);
        });

        return {
          label: gName,
          data,
          backgroundColor: chartType === 'line' ? 'transparent' : color,
          borderColor: color,
          borderWidth: 2,
          fill: false,
          tension: 0.2
        };
      });

      return { labels, datasets };
    }

    // 1-Dimensional grouping (xAxis only)
    const xGroupMap = new Map(); // xVal -> [yVals]

    filteredRows.forEach(row => {
      const xVal = row[xAxisColumn] !== null ? String(row[xAxisColumn]) : '(empty)';
      const yVal = yAxisColumn ? Number(row[yAxisColumn]) : 1;

      if (!xGroupMap.has(xVal)) xGroupMap.set(xVal, []);
      if (!isNaN(yVal)) xGroupMap.get(xVal).push(yVal);
    });

    let labels = Array.from(xGroupMap.keys()).sort((a, b) => {
      const dateA = Date.parse(a);
      const dateB = Date.parse(b);
      if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
      return a.localeCompare(b);
    });

    // Limit categories for readability in pie/doughnut/bar if unbounded
    if ((chartType === 'doughnut' || chartType === 'pie') && labels.length > 10) {
      labels = labels.slice(0, 10);
    }

    const aggregatedData = labels.map(label => {
      const vals = xGroupMap.get(label) || [];
      return ChartService.aggregateValues(vals, aggregation);
    });

    // Color assignment
    let backgroundColor = '#2563eb';
    let borderColor = '#1d4ed8';

    if (chartType === 'doughnut' || chartType === 'pie') {
      backgroundColor = labels.map((_, i) => modernPalette[i % modernPalette.length]);
      borderColor = '#ffffff';
    } else if (chartType === 'line') {
      backgroundColor = 'rgba(37, 99, 235, 0.1)';
      borderColor = '#2563eb';
    } else {
      backgroundColor = 'rgba(37, 99, 235, 0.8)';
      borderColor = '#1d4ed8';
    }

    return {
      labels,
      datasets: [
        {
          label: yAxisColumn ? `${aggregation.toUpperCase()} of ${yAxisColumn}` : 'Count',
          data: aggregatedData,
          backgroundColor,
          borderColor,
          borderWidth: 2,
          fill: chartType === 'line',
          tension: 0.2
        }
      ]
    };
  }

  /**
   * Helper to perform mathematical aggregation over an array of numbers.
   */
  static aggregateValues(vals, method = 'sum') {
    if (!vals || vals.length === 0) return 0;

    switch (method.toLowerCase()) {
      case 'sum':
        return Number(vals.reduce((a, b) => a + b, 0).toFixed(2));
      case 'average':
      case 'avg':
        return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
      case 'count':
        return vals.length;
      case 'min':
        return Math.min(...vals);
      case 'max':
        return Math.max(...vals);
      default:
        return Number(vals.reduce((a, b) => a + b, 0).toFixed(2));
    }
  }
}
