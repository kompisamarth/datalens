import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { QualityService } from '../src/services/quality.service.js';
import { InsightService } from '../src/services/insight.service.js';
import { ChartService } from '../src/services/chart.service.js';

describe('Data Quality, Statistical Insights & Chart Advisor Unit Tests', () => {
  const sampleSchema = [
    { name: 'Date', type: 'date', missingCount: 0, uniqueCount: 5, isConstant: false },
    { name: 'Region', type: 'string', missingCount: 0, uniqueCount: 3, isConstant: false },
    { name: 'Cases', type: 'numeric', missingCount: 1, uniqueCount: 5, isConstant: false },
    { name: 'Deaths', type: 'numeric', missingCount: 0, uniqueCount: 5, isConstant: false }
  ];

  const sampleRows = [
    { Date: '2020-03-01', Region: 'Europe', Cases: 100, Deaths: 10 },
    { Date: '2020-03-02', Region: 'Europe', Cases: 200, Deaths: 20 },
    { Date: '2020-03-03', Region: 'Europe', Cases: 300, Deaths: 30 },
    { Date: '2020-03-04', Region: 'Asia', Cases: 400, Deaths: 40 },
    { Date: '2020-03-05', Region: 'Asia', Cases: 500, Deaths: 50 },
    { Date: '2020-03-06', Region: 'Americas', Cases: 600, Deaths: 60 },
    { Date: '2020-03-07', Region: 'Americas', Cases: 700, Deaths: 70 },
    { Date: '2020-03-08', Region: 'Americas', Cases: 800, Deaths: 80 },
    { Date: '2020-03-09', Region: 'Americas', Cases: 900, Deaths: 90 },
    { Date: '2020-03-10', Region: 'Americas', Cases: 50000, Deaths: 500 }, // Outlier
    { Date: '2020-03-11', Region: 'Asia', Cases: null, Deaths: 15 } // Missing value
  ];

  test('QualityService.auditDataset — Calculates score, detects missing cells & Tukey IQR outliers', () => {
    const report = QualityService.auditDataset(sampleRows, sampleSchema);

    assert.ok(report.score >= 0 && report.score <= 100);
    assert.equal(report.missingCells, 1, 'Should detect exactly 1 missing cell');
    assert.ok(report.outlierCount >= 1, 'Should flag 50000 as Tukey IQR outlier');
    assert.ok(report.issues.length >= 2, 'Should create issues for missing values and outliers');
  });

  test('QualityService.cleanDataset — Imputes missing numeric values with mean and removes duplicates', () => {
    const rowsWithDup = [
      ...sampleRows,
      { Date: '2020-03-01', Region: 'Europe', Cases: 100, Deaths: 10 } // Exact duplicate
    ];

    const { cleanedRows, stats } = QualityService.cleanDataset(rowsWithDup, sampleSchema, {
      removeDuplicates: true,
      imputeMissing: [{ column: 'Cases', strategy: 'mean' }]
    });

    assert.equal(stats.removedDuplicatesCount, 1);
    assert.equal(stats.imputedValuesCount, 1);
    // Verified imputed value is non-null
    const nullRow = cleanedRows.find(r => r.Date === '2020-03-11');
    assert.ok(typeof nullRow.Cases === 'number' && nullRow.Cases > 0);
  });

  test('InsightService.calculatePearson — Computes exact positive correlation (r = 1.0)', () => {
    const r = InsightService.calculatePearson(sampleRows.slice(0, 9), 'Cases', 'Deaths');
    assert.ok(r !== null);
    assert.ok(Math.abs(r - 1.0) < 0.001, `Expected r = 1.0 for proportional values, got ${r}`);
  });

  test('InsightService.generateInsights — Generates summary metrics, correlations & trends', () => {
    const insights = InsightService.generateInsights(sampleRows, sampleSchema);

    assert.ok(insights.cards.length >= 2);
    assert.ok(insights.numericProfiles.Cases);
    assert.equal(insights.numericProfiles.Cases.min, 100);
    assert.equal(insights.numericProfiles.Cases.max, 50000);
    assert.ok(insights.correlationMatrix.matrix.length === 2);
  });

  test('ChartService.recommendCharts — Recommends Line for temporal, Bar for category, Scatter for numeric pair', () => {
    const recommendations = ChartService.recommendCharts(sampleSchema);

    assert.ok(recommendations.length >= 3);
    const lineRec = recommendations.find(r => r.chartType === 'line');
    assert.ok(lineRec, 'Should recommend Line chart');
    assert.equal(lineRec.xAxisColumn, 'Date');

    const barRec = recommendations.find(r => r.chartType === 'bar');
    assert.ok(barRec, 'Should recommend Bar chart');
    assert.equal(barRec.xAxisColumn, 'Region');

    const scatterRec = recommendations.find(r => r.chartType === 'scatter');
    assert.ok(scatterRec, 'Should recommend Scatter plot');
  });

  test('ChartService.buildChartData — Correctly aggregates values by category', () => {
    const chartPayload = ChartService.buildChartData(sampleRows.slice(0, 5), {
      chartType: 'bar',
      xAxisColumn: 'Region',
      yAxisColumn: 'Cases',
      aggregation: 'sum'
    });

    assert.ok(chartPayload.labels.includes('Europe'));
    assert.ok(chartPayload.labels.includes('Asia'));
    const europeIdx = chartPayload.labels.indexOf('Europe');
    // Europe has 100 + 200 + 300 = 600
    assert.equal(chartPayload.datasets[0].data[europeIdx], 600);
  });
});
