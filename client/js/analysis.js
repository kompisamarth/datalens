import { apiRequest } from './api.js';
import { showToast } from './toast.js';
import { openModal, closeModal } from './modal.js';

let activeChartInstance = null;
let currentAnalysisId = null;
let currentDataset = null;
let datasetsList = [];
let currentInsights = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupFilterBuilder();
  setupSaveModal();

  // Load user datasets
  await loadDatasetsDropdown();

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const analysisId = urlParams.get('id');
  const queryDatasetId = urlParams.get('datasetId');
  const queryChartType = urlParams.get('chartType');
  const queryXAxis = urlParams.get('xAxis');
  const queryYAxis = urlParams.get('yAxis');
  const queryAgg = urlParams.get('aggregation');

  if (analysisId) {
    await loadExistingAnalysis(analysisId);
  } else if (queryDatasetId) {
    document.getElementById('datasetSelect').value = queryDatasetId;
    await handleDatasetChange(queryDatasetId);

    if (queryChartType) document.getElementById('chartTypeSelect').value = queryChartType;
    if (queryXAxis) document.getElementById('xAxisSelect').value = queryXAxis;
    if (queryYAxis) document.getElementById('yAxisSelect').value = queryYAxis;
    if (queryAgg) document.getElementById('aggregationSelect').value = queryAgg;

    // Automatically render chart if parameters supplied
    triggerRender();
  } else if (datasetsList.length > 0) {
    // Select first dataset by default
    document.getElementById('datasetSelect').value = datasetsList[0]._id;
    await handleDatasetChange(datasetsList[0]._id);
  }

  // Form Submit Handler
  document.getElementById('chartConfigForm').addEventListener('submit', e => {
    e.preventDefault();
    triggerRender();
  });

  // Chart type change listener (adjusts visibility of Y axis for histogram)
  document.getElementById('chartTypeSelect').addEventListener('change', e => {
    const type = e.target.value;
    const yGroup = document.getElementById('yAxisGroup');
    const aggGroup = document.getElementById('aggregationGroup');

    if (type === 'histogram') {
      yGroup.style.display = 'none';
      aggGroup.style.display = 'none';
    } else if (type === 'scatter') {
      yGroup.style.display = 'block';
      aggGroup.style.display = 'none';
    } else {
      yGroup.style.display = 'block';
      aggGroup.style.display = 'block';
    }
  });

  // Duplicate button
  const dupBtn = document.getElementById('btnDuplicateAnalysis');
  if (dupBtn) {
    dupBtn.addEventListener('click', async () => {
      if (!currentAnalysisId) return;
      try {
        const copy = await apiRequest(`/api/v1/analyses/${currentAnalysisId}/duplicate`, {
          method: 'POST'
        });
        showToast('Analysis duplicated successfully', 'success');
        window.location.href = `/analysis.html?id=${copy._id}`;
      } catch (err) {
        showToast(err.message || 'Duplication failed', 'error');
      }
    });
  }

  // Export report button
  const exportBtn = document.getElementById('btnExportReport');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      if (!currentAnalysisId) {
        showToast('Please save the analysis first before exporting a report.', 'warning');
        return;
      }
      try {
        exportBtn.disabled = true;
        exportBtn.innerHTML = 'Generating Report...';

        const htmlStr = await apiRequest(`/api/v1/analyses/${currentAnalysisId}/export`);
        const blob = new Blob([htmlStr], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${currentAnalysisId}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        showToast('HTML analytical report downloaded successfully!', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to export report', 'error');
      } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '📑 Download HTML Report';
      }
    });
  }
});

async function loadDatasetsDropdown() {
  const select = document.getElementById('datasetSelect');

  try {
    const res = await apiRequest('/api/v1/datasets?limit=50');
    datasetsList = res.datasets || [];

    if (datasetsList.length === 0) {
      select.innerHTML = '<option value="">No datasets available. Please upload one.</option>';
      return;
    }

    select.innerHTML =
      '<option value="">Select target dataset...</option>' +
      datasetsList
        .map(
          d => `
        <option value="${d._id}">${escapeHtml(d.name)} (${d.rowCount} rows, ${d.columnCount} cols)</option>
      `
        )
        .join('');

    select.addEventListener('change', e => {
      if (e.target.value) {
        handleDatasetChange(e.target.value);
      }
    });
  } catch (err) {
    console.error('Error loading datasets dropdown:', err);
  }
}

async function handleDatasetChange(dId) {
  try {
    currentDataset = await apiRequest(`/api/v1/datasets/${dId}`);
    if (!currentDataset || !currentDataset.schemaInfo) return;

    populateColumnSelectors(currentDataset.schemaInfo);
  } catch (err) {
    console.error('Error loading dataset metadata:', err);
  }
}

function populateColumnSelectors(schema) {
  const xSelect = document.getElementById('xAxisSelect');
  const ySelect = document.getElementById('yAxisSelect');
  const groupSelect = document.getElementById('groupBySelect');

  const xOptions = schema.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} (${c.type})</option>`).join('');
  xSelect.innerHTML = '<option value="">Choose X-Axis column...</option>' + xOptions;

  const numCols = schema.filter(c => c.type === 'numeric');
  const yOptions = numCols.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  ySelect.innerHTML = '<option value="">Choose Y-Axis metric...</option>' + yOptions;

  const catCols = schema.filter(c => c.type === 'string' || c.type === 'boolean');
  const groupOptions = catCols.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
  groupSelect.innerHTML = '<option value="">No grouping (single series)</option>' + groupOptions;

  // Auto-select smart defaults
  const dateCol = schema.find(c => c.type === 'date');
  if (dateCol) {
    xSelect.value = dateCol.name;
    document.getElementById('chartTypeSelect').value = 'line';
  } else if (catCols.length > 0) {
    xSelect.value = catCols[0].name;
    document.getElementById('chartTypeSelect').value = 'bar';
  }

  if (numCols.length > 0) {
    ySelect.value = numCols[0].name;
  }
}

async function loadExistingAnalysis(id) {
  try {
    const analysis = await apiRequest(`/api/v1/analyses/${id}`);
    if (!analysis) return;

    currentAnalysisId = analysis._id;

    // Update Header
    document.getElementById('studioHeaderTitle').textContent = `Analysis: "${analysis.title}"`;
    document.getElementById('studioHeaderSubtitle').textContent =
      analysis.description || 'Saved analytical report workspace.';

    // Show Action Buttons
    document.getElementById('btnExportReport').style.display = 'inline-flex';
    document.getElementById('btnDuplicateAnalysis').style.display = 'inline-flex';
    document.getElementById('btnOpenSaveModal').innerHTML = '💾 Update Analysis';

    // Populate Dataset & Form Controls
    document.getElementById('datasetSelect').value = analysis.datasetId._id || analysis.datasetId;
    await handleDatasetChange(analysis.datasetId._id || analysis.datasetId);

    document.getElementById('chartTypeSelect').value = analysis.chartType;
    document.getElementById('xAxisSelect').value = analysis.xAxisColumn;
    document.getElementById('yAxisSelect').value = analysis.yAxisColumn || '';
    document.getElementById('aggregationSelect').value = analysis.aggregation || 'sum';
    document.getElementById('groupBySelect').value = analysis.groupByColumn || '';

    // Restore Filter Rules
    const filtersList = document.getElementById('filterRulesList');
    filtersList.innerHTML = '';
    if (analysis.filterRules && analysis.filterRules.length > 0) {
      analysis.filterRules.forEach(rule => addFilterRow(rule));
    }

    currentInsights = analysis.summaryInsights || [];
    renderActiveInsights(currentInsights);

    // Trigger render
    triggerRender();
  } catch (err) {
    showToast(err.message || 'Failed to load saved analysis', 'error');
  }
}

function setupFilterBuilder() {
  const addBtn = document.getElementById('btnAddFilter');
  if (addBtn) {
    addBtn.addEventListener('click', () => addFilterRow());
  }
}

function addFilterRow(existingRule = null) {
  const list = document.getElementById('filterRulesList');
  if (!currentDataset || !currentDataset.schemaInfo) {
    showToast('Please select a dataset before configuring filters.', 'warning');
    return;
  }

  const row = document.createElement('div');
  row.className = 'filter-rule-row';
  row.style.cssText =
    'display: flex; gap: 6px; align-items: center; background: var(--bg-subtle); padding: 6px; border-radius: var(--radius-sm);';

  const colOptions = currentDataset.schemaInfo
    .map(
      c => `
    <option value="${escapeHtml(c.name)}" ${existingRule && existingRule.column === c.name ? 'selected' : ''}>
      ${escapeHtml(c.name)}
    </option>
  `
    )
    .join('');

  row.innerHTML = `
    <select class="form-select filter-col" style="padding: 4px 6px; font-size: 0.8rem; flex: 2;">
      ${colOptions}
    </select>
    <select class="form-select filter-op" style="padding: 4px 6px; font-size: 0.8rem; flex: 2;">
      <option value="equals" ${existingRule && existingRule.operator === 'equals' ? 'selected' : ''}>equals</option>
      <option value="not_equals" ${existingRule && existingRule.operator === 'not_equals' ? 'selected' : ''}>not equals</option>
      <option value="contains" ${existingRule && existingRule.operator === 'contains' ? 'selected' : ''}>contains</option>
      <option value="greater_than" ${existingRule && existingRule.operator === 'greater_than' ? 'selected' : ''}>&gt; greater than</option>
      <option value="less_than" ${existingRule && existingRule.operator === 'less_than' ? 'selected' : ''}>&lt; less than</option>
      <option value="is_not_empty" ${existingRule && existingRule.operator === 'is_not_empty' ? 'selected' : ''}>is not empty</option>
    </select>
    <input type="text" class="form-input filter-val" placeholder="Value..." value="${existingRule ? escapeHtml(existingRule.value) : ''}" style="padding: 4px 6px; font-size: 0.8rem; flex: 2;">
    <button type="button" class="btn btn-secondary btn-sm filter-remove-btn" style="padding: 2px 6px; color: var(--danger);">&times;</button>
  `;

  row.querySelector('.filter-remove-btn').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

function extractFilterRules() {
  const rows = document.querySelectorAll('.filter-rule-row');
  const rules = [];

  rows.forEach(r => {
    const column = r.querySelector('.filter-col').value;
    const operator = r.querySelector('.filter-op').value;
    const value = r.querySelector('.filter-val').value.trim();

    if (column) {
      rules.push({ column, operator, value });
    }
  });

  return rules;
}

async function triggerRender() {
  const datasetId = document.getElementById('datasetSelect').value;
  const chartType = document.getElementById('chartTypeSelect').value;
  const xAxisColumn = document.getElementById('xAxisSelect').value;
  const yAxisColumn = document.getElementById('yAxisSelect').value;
  const aggregation = document.getElementById('aggregationSelect').value;
  const groupByColumn = document.getElementById('groupBySelect').value;
  const filterRules = extractFilterRules();

  if (!datasetId || !xAxisColumn) {
    showToast('Please select both a dataset and an X-Axis dimension.', 'warning');
    return;
  }

  const renderBtn = document.getElementById('btnRenderChart');
  try {
    renderBtn.disabled = true;
    renderBtn.innerHTML = 'Computing aggregations...';

    const chartData = await apiRequest('/api/v1/analyses/chart-data', {
      method: 'POST',
      body: JSON.stringify({
        datasetId,
        chartType,
        xAxisColumn,
        yAxisColumn,
        aggregation,
        groupByColumn,
        filterRules
      })
    });

    renderChartOnCanvas(chartType, chartData, xAxisColumn, yAxisColumn, aggregation);
    generateChartInsights(chartType, chartData, xAxisColumn, yAxisColumn);
  } catch (err) {
    showToast(err.message || 'Failed to render visualization', 'error');
  } finally {
    renderBtn.disabled = false;
    renderBtn.innerHTML = 'Render Visualization &rarr;';
  }
}

function renderChartOnCanvas(chartType, chartData, xAxis, yAxis, aggregation) {
  const placeholder = document.getElementById('chartPlaceholder');
  if (placeholder) placeholder.style.display = 'none';

  const canvas = document.getElementById('studioChartCanvas');
  const ctx = canvas.getContext('2d');

  if (activeChartInstance) {
    activeChartInstance.destroy();
  }

  // Update header text
  const chartTitleEl = document.getElementById('renderedChartTitle');
  const chartSubEl = document.getElementById('renderedChartSubtitle');
  const badgeEl = document.getElementById('activeAggregationBadge');

  chartTitleEl.textContent = yAxis
    ? `${aggregation.toUpperCase()} of ${yAxis} by ${xAxis}`
    : `Distribution of ${xAxis}`;
  chartSubEl.textContent = `Visualized as ${chartType.toUpperCase()} chart. Filtered data processed live on server.`;
  badgeEl.innerHTML = `<span class="badge badge-primary">${chartType.toUpperCase()}</span>`;

  const chartJsType = chartType === 'histogram' ? 'bar' : chartType;

  activeChartInstance = new Chart(ctx, {
    type: chartJsType,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          padding: 10,
          cornerRadius: 6
        }
      },
      scales:
        chartType === 'pie' || chartType === 'doughnut'
          ? {}
          : chartType === 'scatter'
          ? {
              x: {
                type: 'linear',
                position: 'bottom',
                grid: { color: 'rgba(150, 150, 150, 0.1)' }
              },
              y: {
                grid: { color: 'rgba(150, 150, 150, 0.1)' }
              }
            }
          : {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(150, 150, 150, 0.1)' }
              },
              x: {
                grid: { display: false }
              }
            }
    }
  });
}

function generateChartInsights(chartType, chartData, xAxis, yAxis) {
  const container = document.getElementById('activeInsightsContainer');

  const insights = [];

  if (chartData.datasets && chartData.datasets.length > 0) {
    const ds = chartData.datasets[0];
    const dataVals = ds.data;

    // Scatter plot coordinate observations
    if (chartType === 'scatter' && Array.isArray(dataVals) && dataVals.length > 0 && typeof dataVals[0] === 'object' && dataVals[0] !== null) {
      const count = dataVals.length;
      insights.push({
        title: `Scatter Distribution (${xAxis} vs ${yAxis})`,
        text: `Plotted ${count} coordinate points comparing ${xAxis} (horizontal) and ${yAxis} (vertical).`,
        type: 'highlight'
      });
    }

    if (chartData.labels && Array.isArray(dataVals) && dataVals.length > 0 && typeof dataVals[0] === 'number') {
      const maxVal = Math.max(...dataVals);
      const minVal = Math.min(...dataVals);
      const maxIdx = dataVals.indexOf(maxVal);
      const minIdx = dataVals.indexOf(minVal);
      const sum = dataVals.reduce((a, b) => a + b, 0);

      insights.push({
        title: `Peak Observation: ${chartData.labels[maxIdx]}`,
        text: `Highest magnitude reached ${maxVal.toLocaleString()} (${((maxVal / (sum || 1)) * 100).toFixed(1)}% of series sum).`,
        type: 'highlight'
      });

      if (minVal !== maxVal) {
        insights.push({
          title: `Minimum Baseline: ${chartData.labels[minIdx]}`,
          text: `Lowest recorded observation across this view was ${minVal.toLocaleString()}.`,
          type: 'distribution'
        });
      }
    }
  }

  currentInsights = insights;
  renderActiveInsights(insights);
}

function renderActiveInsights(insights) {
  const container = document.getElementById('activeInsightsContainer');

  if (!insights || insights.length === 0) {
    container.innerHTML = `<p style="font-size: 0.88rem; color: var(--text-muted);">No automatic anomalies detected for this configuration.</p>`;
    return;
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
      ${insights
        .map(
          i => `
        <div class="insight-card ${i.type || 'highlight'}">
          <div class="insight-card-title">${escapeHtml(i.title)}</div>
          <div class="insight-card-text">${escapeHtml(i.text)}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function setupSaveModal() {
  const openBtn = document.getElementById('btnOpenSaveModal');
  const closeBtn = document.getElementById('btnCloseSaveModal');
  const cancelBtn = document.getElementById('btnCancelSave');
  const form = document.getElementById('saveAnalysisForm');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const xAxis = document.getElementById('xAxisSelect').value;
      const yAxis = document.getElementById('yAxisSelect').value;
      const agg = document.getElementById('aggregationSelect').value;

      if (!xAxis) {
        showToast('Please render a chart before saving.', 'warning');
        return;
      }

      // Default title if empty
      const titleInput = document.getElementById('saveTitleInput');
      if (!titleInput.value) {
        titleInput.value = yAxis ? `${agg.toUpperCase()} of ${yAxis} by ${xAxis}` : `Distribution of ${xAxis}`;
      }

      openModal('saveAnalysisModal');
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal('saveAnalysisModal'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('saveAnalysisModal'));

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const datasetId = document.getElementById('datasetSelect').value;
      const chartType = document.getElementById('chartTypeSelect').value;
      const xAxisColumn = document.getElementById('xAxisSelect').value;
      const yAxisColumn = document.getElementById('yAxisSelect').value;
      const aggregation = document.getElementById('aggregationSelect').value;
      const groupByColumn = document.getElementById('groupBySelect').value;
      const filterRules = extractFilterRules();

      const title = document.getElementById('saveTitleInput').value.trim();
      const description = document.getElementById('saveDescInput').value.trim();

      const payload = {
        datasetId,
        title,
        description,
        chartType,
        xAxisColumn,
        yAxisColumn,
        aggregation,
        groupByColumn,
        filterRules,
        summaryInsights: currentInsights
      };

      const submitBtn = document.getElementById('btnConfirmSave');

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Saving...';

        let savedAnalysis = null;

        if (currentAnalysisId) {
          // Update existing
          savedAnalysis = await apiRequest(`/api/v1/analyses/${currentAnalysisId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
          showToast('Analysis updated successfully!', 'success');
        } else {
          // Create new
          savedAnalysis = await apiRequest('/api/v1/analyses', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          currentAnalysisId = savedAnalysis._id;
          showToast('Analysis saved to your reports library!', 'success');

          // Update URL without full refresh
          const newUrl = `${window.location.pathname}?id=${savedAnalysis._id}`;
          window.history.pushState({ path: newUrl }, '', newUrl);

          document.getElementById('studioHeaderTitle').textContent = `Analysis: "${savedAnalysis.title}"`;
          document.getElementById('btnExportReport').style.display = 'inline-flex';
          document.getElementById('btnDuplicateAnalysis').style.display = 'inline-flex';
          document.getElementById('btnOpenSaveModal').innerHTML = '💾 Update Analysis';
        }

        closeModal('saveAnalysisModal');
      } catch (err) {
        showToast(err.message || 'Failed to save analysis', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Analysis';
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
