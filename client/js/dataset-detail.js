import { apiRequest } from './api.js';
import { showToast } from './toast.js';
import { openModal, closeModal } from './modal.js';

let datasetId = null;
let dataset = null;
let previewPage = 1;
let previewLimit = 25;
let previewSortCol = '';
let previewSortDir = 'asc';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  datasetId = urlParams.get('id');

  if (!datasetId) {
    showToast('No dataset specified', 'error');
    setTimeout(() => (window.location.href = '/datasets.html'), 1000);
    return;
  }

  setupTabs();
  setupPreviewControls();
  setupCleanModal();
  setupExport();

  await loadDatasetWorkspace();
});

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');

      // Lazy load tab data on click
      if (targetId === 'tabInsights' && !pane.dataset.loaded) {
        loadInsightsTab();
        pane.dataset.loaded = 'true';
      } else if (targetId === 'tabRecommendations' && !pane.dataset.loaded) {
        loadRecommendationsTab();
        pane.dataset.loaded = 'true';
      }
    });
  });
}

async function loadDatasetWorkspace() {
  try {
    dataset = await apiRequest(`/api/v1/datasets/${datasetId}`);
    if (!dataset) return;

    // Populate Headers & Metadata
    document.getElementById('datasetTitle').textContent = dataset.name;
    document.getElementById('datasetDescription').textContent =
      dataset.description || 'Imported tabular dataset.';
    document.getElementById('metaDimensions').textContent = `${dataset.rowCount.toLocaleString()} rows × ${dataset.columnCount} columns`;
    document.getElementById('metaFilename').textContent = dataset.originalFilename;
    document.getElementById('metaSize').textContent = `${(dataset.fileSizeBytes / 1024).toFixed(1)} KB`;
    document.getElementById('metaDate').textContent = new Date(dataset.createdAt).toLocaleDateString();

    const launchBtn = document.getElementById('btnLaunchStudio');
    if (launchBtn) launchBtn.href = `/analysis.html?datasetId=${dataset._id}`;

    // Source Badge
    const badgeEl = document.getElementById('datasetSourceBadge');
    if (badgeEl) {
      if (dataset.sourceType === 'built-in-sample') {
        badgeEl.innerHTML = '<span class="badge badge-accent">Sample Benchmark</span>';
      } else if (dataset.sourceType === 'cleaned-derived') {
        badgeEl.innerHTML = '<span class="badge badge-neutral">Cleaned Derived</span>';
      } else {
        badgeEl.innerHTML = '<span class="badge badge-primary">Uploaded CSV</span>';
      }
    }

    // Render Preview Table
    await loadPreviewTable();

    // Render Quality Intelligence Tab
    renderQualityTab();
  } catch (err) {
    showToast(err.message || 'Failed to load dataset details', 'error');
  }
}

async function loadPreviewTable() {
  const search = document.getElementById('previewSearchInput').value.trim();

  try {
    const params = new URLSearchParams({
      page: previewPage,
      limit: previewLimit,
      search,
      sortCol: previewSortCol,
      sortDir: previewSortDir
    });

    const res = await apiRequest(`/api/v1/datasets/${datasetId}/preview?${params.toString()}`);
    const { rows, pagination } = res;

    renderTableHeaders();
    renderTableRows(rows);
    updatePreviewPagination(pagination);
  } catch (err) {
    console.error('Preview load error:', err);
  }
}

function renderTableHeaders() {
  const headEl = document.getElementById('previewTableHead');
  if (!dataset.schemaInfo) return;

  const thHtml = dataset.schemaInfo
    .map(col => {
      let typeIcon = 'Aa';
      if (col.type === 'numeric') typeIcon = '#';
      if (col.type === 'date') typeIcon = '📅';
      if (col.type === 'boolean') typeIcon = '✓';

      const sortIndicator =
        previewSortCol === col.name ? (previewSortDir === 'asc' ? ' ▲' : ' ▼') : '';

      return `
      <th class="sortable" data-col="${escapeHtml(col.name)}">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <span>${escapeHtml(col.name)}${sortIndicator}</span>
          <span class="badge badge-neutral" style="font-size: 0.65rem; padding: 1px 4px;">${typeIcon} ${col.type}</span>
        </div>
      </th>
    `;
    })
    .join('');

  headEl.innerHTML = `<tr>${thHtml}</tr>`;

  // Bind sorting clicks
  headEl.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-col');
      if (previewSortCol === col) {
        previewSortDir = previewSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        previewSortCol = col;
        previewSortDir = 'asc';
      }
      previewPage = 1;
      loadPreviewTable();
    });
  });
}

function renderTableRows(rows) {
  const bodyEl = document.getElementById('previewTableBody');

  if (rows.length === 0) {
    bodyEl.innerHTML = `
      <tr>
        <td colspan="${dataset.columnCount}" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No matching records found.
        </td>
      </tr>
    `;
    return;
  }

  const trHtml = rows
    .map(r => {
      const cells = dataset.schemaInfo
        .map(col => {
          const val = r.rowData[col.name];
          if (val === null || val === undefined || val === '') {
            return `<td><span class="badge badge-missing">&lt;empty&gt;</span></td>`;
          }
          return `<td>${escapeHtml(String(val))}</td>`;
        })
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  bodyEl.innerHTML = trHtml;
}

function updatePreviewPagination(pagination) {
  const summaryEl = document.getElementById('previewPageSummary');
  const prevBtn = document.getElementById('btnPrevPreview');
  const nextBtn = document.getElementById('btnNextPreview');

  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.totalRows, pagination.page * pagination.limit);
  summaryEl.textContent = `Showing ${start.toLocaleString()} to ${end.toLocaleString()} of ${pagination.totalRows.toLocaleString()} rows (Page ${pagination.page} of ${pagination.totalPages})`;

  prevBtn.disabled = pagination.page <= 1;
  nextBtn.disabled = pagination.page >= pagination.totalPages;
}

function setupPreviewControls() {
  const searchInput = document.getElementById('previewSearchInput');
  const limitSelect = document.getElementById('previewLimitSelect');
  const prevBtn = document.getElementById('btnPrevPreview');
  const nextBtn = document.getElementById('btnNextPreview');

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      previewPage = 1;
      loadPreviewTable();
    }, 300);
  });

  limitSelect.addEventListener('change', () => {
    previewLimit = parseInt(limitSelect.value, 10);
    previewPage = 1;
    loadPreviewTable();
  });

  prevBtn.addEventListener('click', () => {
    if (previewPage > 1) {
      previewPage--;
      loadPreviewTable();
    }
  });

  nextBtn.addEventListener('click', () => {
    previewPage++;
    loadPreviewTable();
  });
}

function renderQualityTab() {
  const quality = dataset.qualitySummary || {
    score: 100,
    status: 'High',
    missingCells: 0,
    missingPct: 0,
    duplicateRows: 0,
    outlierCount: 0,
    issues: []
  };

  const circleEl = document.getElementById('qualityScoreCircle');
  circleEl.textContent = quality.score;
  circleEl.className = `score-circle ${quality.status.toLowerCase()}`;

  document.getElementById('qualityStatusTitle').textContent = `${quality.status} Data Quality Health`;
  const badgeEl = document.getElementById('qualityStatusBadge');
  badgeEl.textContent = quality.status;
  badgeEl.className = `badge ${quality.score >= 85 ? 'badge-success' : quality.score >= 60 ? 'badge-warning' : 'badge-danger'}`;

  // Metrics
  document.getElementById('statMissingCells').textContent = quality.missingCells.toLocaleString();
  document.getElementById('statMissingPct').textContent = `${quality.missingPct}% of all cells`;
  document.getElementById('statDuplicateRows').textContent = quality.duplicateRows.toLocaleString();
  document.getElementById('statOutliers').textContent = quality.outlierCount.toLocaleString();
  document.getElementById('statTotalCols').textContent = dataset.columnCount;

  // Types summary
  const typesCount = dataset.schemaInfo.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});
  const typesStr = Object.entries(typesCount)
    .map(([t, count]) => `${count} ${t}`)
    .join(', ');
  document.getElementById('statInferredTypes').textContent = typesStr;

  // Render Issues list
  const issuesContainer = document.getElementById('qualityIssuesContainer');
  if (!quality.issues || quality.issues.length === 0) {
    issuesContainer.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--success);">
        <div style="font-size: 2rem; margin-bottom: 6px;">✓</div>
        <div style="font-weight: 700;">No Critical Issues Detected</div>
        <p style="font-size: 0.88rem; color: var(--text-muted);">This dataset demonstrates high data completeness and consistency.</p>
      </div>
    `;
    return;
  }

  const issuesHtml = quality.issues
    .map(issue => {
      const severityBadge =
        issue.severity === 'Critical'
          ? '<span class="badge badge-danger">Critical</span>'
          : issue.severity === 'Warning'
          ? '<span class="badge badge-warning">Warning</span>'
          : '<span class="badge badge-primary">Informational</span>';

      return `
      <div style="border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 12px; background: var(--bg-surface);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${severityBadge}
            <strong style="font-size: 0.95rem; color: var(--text-main);">${escapeHtml(issue.title)}</strong>
          </div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Column: <code>${escapeHtml(issue.column)}</code></span>
        </div>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 8px;">
          ${escapeHtml(issue.recommendation)}
        </p>
      </div>
    `;
    })
    .join('');

  issuesContainer.innerHTML = issuesHtml;
}

async function loadInsightsTab() {
  const cardsContainer = document.getElementById('insightsCardsContainer');
  const matrixContainer = document.getElementById('correlationMatrixContainer');
  const summariesContainer = document.getElementById('numericSummariesContainer');

  try {
    const insights = await apiRequest(`/api/v1/datasets/${datasetId}/insights`);

    // Render Cards
    if (insights.cards && insights.cards.length > 0) {
      cardsContainer.innerHTML = insights.cards
        .map(card => {
          return `
          <div class="insight-card ${card.type}">
            <div class="insight-card-title">${escapeHtml(card.title)}</div>
            <div class="insight-card-text">${escapeHtml(card.text)}</div>
          </div>
        `;
        })
        .join('');
    } else {
      cardsContainer.innerHTML = `<div style="color: var(--text-muted); padding: 20px;">No statistical outliers or strong correlations detected.</div>`;
    }

    // Render Pearson Correlation Matrix
    if (insights.correlationMatrix && insights.correlationMatrix.columns.length >= 2) {
      const cols = insights.correlationMatrix.columns;
      const headTh = `<th>Dimension</th>` + cols.map(c => `<th>${escapeHtml(c)}</th>`).join('');

      const rowsTr = cols
        .map((colA, i) => {
          const cells = cols
            .map((colB, j) => {
              const val = insights.correlationMatrix.matrix[i][j];
              if (val === null) return `<td>--</td>`;
              const formatted = val.toFixed(2);
              const absVal = Math.abs(val);

              let style = '';
              if (absVal >= 0.7 && i !== j) {
                style = val > 0 ? 'background: rgba(16, 185, 129, 0.2); font-weight: 700;' : 'background: rgba(139, 92, 246, 0.2); font-weight: 700;';
              }
              return `<td style="${style}">${formatted}</td>`;
            })
            .join('');

          return `<tr><td><strong>${escapeHtml(colA)}</strong></td>${cells}</tr>`;
        })
        .join('');

      matrixContainer.innerHTML = `
        <table class="data-table">
          <thead><tr>${headTh}</tr></thead>
          <tbody>${rowsTr}</tbody>
        </table>
      `;
    } else {
      matrixContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted);">
          Dataset requires at least 2 continuous numeric columns to construct a correlation matrix.
        </div>
      `;
    }

    // Render Five-Number Summaries
    const numProfiles = insights.numericProfiles || {};
    const numCols = Object.keys(numProfiles);

    if (numCols.length > 0) {
      const trRows = numCols
        .map(col => {
          const p = numProfiles[col];
          return `
          <tr>
            <td><strong>${escapeHtml(col)}</strong></td>
            <td>${p.count.toLocaleString()}</td>
            <td>${p.min.toLocaleString()}</td>
            <td>${p.q1.toLocaleString()}</td>
            <td><strong>${p.median.toLocaleString()}</strong></td>
            <td>${p.mean.toLocaleString()}</td>
            <td>${p.q3.toLocaleString()}</td>
            <td>${p.max.toLocaleString()}</td>
            <td>${p.stdDev.toLocaleString()}</td>
            <td>${p.iqr.toLocaleString()}</td>
          </tr>
        `;
        })
        .join('');

      summariesContainer.innerHTML = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Count</th>
              <th>Min</th>
              <th>Q1 (25%)</th>
              <th>Median</th>
              <th>Mean</th>
              <th>Q3 (75%)</th>
              <th>Max</th>
              <th>Std Dev</th>
              <th>IQR</th>
            </tr>
          </thead>
          <tbody>
            ${trRows}
          </tbody>
        </table>
      `;
    } else {
      summariesContainer.innerHTML = `<div style="padding: 24px; color: var(--text-muted); text-align: center;">No continuous numeric columns available.</div>`;
    }
  } catch (err) {
    cardsContainer.innerHTML = `<div style="color: var(--danger);">Failed to calculate insights: ${escapeHtml(err.message)}</div>`;
  }
}

async function loadRecommendationsTab() {
  const container = document.getElementById('recommendationsContainer');

  try {
    const recommendations = await apiRequest(`/api/v1/datasets/${datasetId}/recommendations`);

    if (recommendations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No Chart Recommendations</div>
          <p class="empty-state-desc">The dataset does not have suitable combinations of temporal, categorical, or numeric dimensions.</p>
        </div>
      `;
      return;
    }

    const cardsHtml = recommendations
      .map(rec => {
        const starIcons = '★'.repeat(rec.suitabilityScore) + '☆'.repeat(5 - rec.suitabilityScore);
        const queryParams = new URLSearchParams({
          datasetId: dataset._id,
          chartType: rec.chartType,
          xAxis: rec.xAxisColumn,
          yAxis: rec.yAxisColumn || '',
          aggregation: rec.aggregation || 'sum'
        });

        return `
        <div class="card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="badge badge-primary" style="text-transform: capitalize;">${rec.chartType} Chart</span>
              <span style="color: #f59e0b; font-size: 0.95rem;">${starIcons}</span>
            </div>

            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
              ${escapeHtml(rec.title)}
            </h3>

            <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 16px;">
              ${escapeHtml(rec.reason)}
            </p>

            <div style="background: var(--bg-subtle); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 16px;">
              <div><strong>X-Axis Dimension:</strong> <code>${escapeHtml(rec.xAxisColumn)}</code></div>
              ${rec.yAxisColumn ? `<div><strong>Y-Axis Metric:</strong> <code>${escapeHtml(rec.yAxisColumn)}</code> (${rec.aggregation})</div>` : ''}
            </div>
          </div>

          <a href="/analysis.html?${queryParams.toString()}" class="btn btn-primary btn-sm" style="width: 100%;">
            Launch in Chart Studio &rarr;
          </a>
        </div>
      `;
      })
      .join('');

    container.innerHTML = cardsHtml;
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger);">Failed to load recommendations.</div>`;
  }
}

function setupExport() {
  const btnExport = document.getElementById('btnExportCsv');
  if (!btnExport) return;

  btnExport.addEventListener('click', async () => {
    try {
      btnExport.disabled = true;
      btnExport.innerHTML = 'Exporting...';

      const blob = await apiRequest(`/api/v1/datasets/${datasetId}/export`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast('CSV export downloaded successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      btnExport.disabled = false;
      btnExport.innerHTML = '📥 Export CSV';
    }
  });
}

function setupCleanModal() {
  const btnOpen = document.getElementById('btnOpenCleanModal');
  const btnClose = document.getElementById('btnCloseCleanModal');
  const btnCancel = document.getElementById('btnCancelClean');
  const form = document.getElementById('cleanForm');
  const dropColsContainer = document.getElementById('cleanDropColsContainer');
  const cleanTargetRadios = document.querySelectorAll('input[name="cleanTarget"]');
  const newNameWrap = document.getElementById('newDatasetNameWrap');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      // Populate drop column options
      dropColsContainer.innerHTML = dataset.schemaInfo
        .map(c => `
          <label style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.82rem; padding: 4px 8px; background: var(--bg-subtle); border-radius: var(--radius-sm); cursor: pointer;">
            <input type="checkbox" name="dropCol" value="${escapeHtml(c.name)}">
            <span>${escapeHtml(c.name)}</span>
          </label>
        `)
        .join('');

      document.getElementById('cleanNewName').value = `${dataset.name} (Cleaned)`;
      openModal('cleanModal');
    });
  }

  if (btnClose) btnClose.addEventListener('click', () => closeModal('cleanModal'));
  if (btnCancel) btnCancel.addEventListener('click', () => closeModal('cleanModal'));

  cleanTargetRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      newNameWrap.style.display = radio.value === 'new' ? 'block' : 'none';
    });
  });

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const removeDuplicates = document.getElementById('cleanRemoveDups').checked;
      const dropColumns = Array.from(document.querySelectorAll('input[name="dropCol"]:checked')).map(
        i => i.value
      );
      const isCreateNew = document.querySelector('input[name="cleanTarget"]:checked').value === 'new';
      const newDatasetName = document.getElementById('cleanNewName').value.trim();

      const submitBtn = document.getElementById('btnExecuteClean');

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Cleaning data...';

        const res = await apiRequest(`/api/v1/datasets/${datasetId}/clean`, {
          method: 'POST',
          body: JSON.stringify({
            removeDuplicates,
            dropColumns,
            createNewDataset: isCreateNew,
            newDatasetName
          })
        });

        showToast('Data cleaning operation completed!', 'success');
        closeModal('cleanModal');

        if (isCreateNew && res.dataset) {
          window.location.href = `/dataset-detail.html?id=${res.dataset._id}`;
        } else {
          // Reload in-place
          window.location.reload();
        }
      } catch (err) {
        showToast(err.message || 'Cleaning operation failed', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Execute Clean';
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
