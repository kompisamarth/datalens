/**
 * Export and Reporting Service.
 * Handles formula-injection safe CSV generation and standalone print-ready HTML analytical reports.
 */
export class ExportService {
  /**
   * Escape individual CSV cell to prevent formula injection in Excel/Calc.
   * Prepends a single quote if the cell begins with dangerous trigger characters (=, +, -, @, \t, \r).
   * @param {any} value
   * @returns {string}
   */
  static escapeCsvCell(value) {
    if (value === null || value === undefined) {
      return '';
    }

    let str = String(value);

    // Prevent formula injection
    const injectionChars = ['=', '+', '-', '@', '\t', '\r'];
    if (injectionChars.includes(str.charAt(0))) {
      str = `'${str}`;
    }

    // Wrap in RFC 4180 quotes if contains commas, quotes, or line breaks
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Generate safe CSV string from columns and row records.
   * @param {string[]} columns
   * @param {Array<Record<string, any>>} rows
   * @returns {string}
   */
  static generateCsv(columns, rows) {
    const headerLine = columns.map(col => ExportService.escapeCsvCell(col)).join(',');
    const dataLines = rows.map(row => {
      return columns.map(col => ExportService.escapeCsvCell(row[col])).join(',');
    });

    return [headerLine, ...dataLines].join('\r\n');
  }

  /**
   * Generate standalone HTML report document with embedded Chart.js and print styling.
   * @param {object} analysis - SavedAnalysis document
   * @param {object} dataset - Dataset document
   * @param {object} chartData - Chart.js data payload
   * @returns {string} Standalone HTML document string
   */
  static generateHtmlReport(analysis, dataset, chartData) {
    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const chartJson = JSON.stringify(chartData || {});
    const chartType = analysis.chartType || 'bar';

    const insightsHtml = (analysis.summaryInsights || [])
      .map(
        i => `
      <div class="insight-card">
        <h4>${ExportService.escapeHtml(i.title)}</h4>
        <p>${ExportService.escapeHtml(i.text)}</p>
      </div>`
      )
      .join('');

    const filtersHtml = (analysis.filterRules || []).length > 0
      ? analysis.filterRules.map(f => `<li><code>${f.column}</code> ${f.operator} <strong>"${f.value}"</strong></li>`).join('')
      : '<li>No filters applied (Full dataset)</li>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ExportService.escapeHtml(analysis.title)} — DataLens Studio Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --primary: #2563eb;
      --text: #1e293b;
      --text-muted: #64748b;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--text);
      background: var(--bg);
      margin: 0;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .report-header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .report-title {
      font-size: 2rem;
      font-weight: 800;
      margin: 10px 0 6px 0;
      color: #0f172a;
    }
    .report-desc {
      color: var(--text-muted);
      font-size: 1.05rem;
      margin: 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      background: #f1f5f9;
      padding: 18px 24px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .meta-item strong {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .meta-item span {
      font-size: 1.1rem;
      font-weight: 600;
    }
    .chart-box {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 30px;
      background: #ffffff;
      min-height: 380px;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 30px 0 14px 0;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }
    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .insight-card {
      border: 1px solid var(--border);
      border-left: 4px solid var(--primary);
      padding: 16px;
      border-radius: 6px;
      background: #f8fafc;
    }
    .insight-card h4 {
      margin: 0 0 6px 0;
      font-size: 0.95rem;
      color: #1e293b;
    }
    .insight-card p {
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-muted);
    }
    .disclaimer-box {
      font-size: 0.8rem;
      color: #94a3b8;
      border-top: 1px solid var(--border);
      padding-top: 20px;
      margin-top: 40px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .report-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .print-btn { display: none; }
    }
    .print-btn {
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <div>
        <div class="brand-title">DataLens Studio — Analytical Report</div>
        <h1 class="report-title">${ExportService.escapeHtml(analysis.title)}</h1>
        <p class="report-desc">${ExportService.escapeHtml(analysis.description || 'Automated data exploration and visualization report.')}</p>
      </div>
      <div>
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <strong>Dataset Name</strong>
        <span>${ExportService.escapeHtml(dataset.name)}</span>
      </div>
      <div class="meta-item">
        <strong>Dimensions</strong>
        <span>${dataset.rowCount.toLocaleString()} rows x ${dataset.columnCount} cols</span>
      </div>
      <div class="meta-item">
        <strong>Data Quality Score</strong>
        <span>${dataset.qualitySummary ? dataset.qualitySummary.score : 100} / 100 (${dataset.qualitySummary ? dataset.qualitySummary.status : 'High'})</span>
      </div>
      <div class="meta-item">
        <strong>Generated On</strong>
        <span>${reportDate}</span>
      </div>
    </div>

    <h2 class="section-title">Visual Analysis (${chartType.toUpperCase()} Chart)</h2>
    <div class="chart-box">
      <canvas id="reportChart" style="max-height: 400px; width: 100%;"></canvas>
    </div>

    <div class="config-summary" style="margin-bottom: 24px;">
      <strong>Configuration Details:</strong>
      <ul>
        <li>X-Axis Dimension: <code>${ExportService.escapeHtml(analysis.xAxisColumn)}</code></li>
        <li>Y-Axis Metric: <code>${ExportService.escapeHtml(analysis.yAxisColumn || 'N/A')}</code> (${ExportService.escapeHtml(analysis.aggregation || 'none')})</li>
        <li>Grouping Dimension: <code>${ExportService.escapeHtml(analysis.groupByColumn || 'None')}</code></li>
        <li>Active Filters: <ul>${filtersHtml}</ul></li>
      </ul>
    </div>

    ${
      (analysis.summaryInsights || []).length > 0
        ? `<h2 class="section-title">Automated Insights & Findings</h2>
           <div class="insights-grid">${insightsHtml}</div>`
        : ''
    }

    <div class="disclaimer-box">
      <p><strong>Methodology & Attribution:</strong> This analytical report was generated using DataLens Studio. Descriptive statistics and visualizations are calculated directly from uploaded source records. Observed correlations reflect empirical co-variation and do not demonstrate causal linkages. Archival COVID-19 datasets are sourced from historical public health tracking repositories (WHO / Our World in Data) for demonstration purposes.</p>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const ctx = document.getElementById('reportChart').getContext('2d');
      const chartData = ${chartJson};
      const chartType = '${chartType}' === 'histogram' ? 'bar' : '${chartType}';

      new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: chartType === 'pie' || chartType === 'doughnut' ? {} : {
            y: { beginAtZero: true }
          }
        }
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Escape HTML entities to prevent XSS in exported reports.
   * @param {string} str
   * @returns {string}
   */
  static escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
