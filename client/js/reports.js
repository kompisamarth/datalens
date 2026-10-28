import { apiRequest } from './api.js';
import { showToast } from './toast.js';
import { showConfirmModal } from './modal.js';

document.addEventListener('DOMContentLoaded', () => {
  loadReports();
  setupFilterHandlers();
});

function setupFilterHandlers() {
  const searchInput = document.getElementById('reportSearch');
  const sortSelect = document.getElementById('reportSort');

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadReports();
    }, 300);
  });

  sortSelect.addEventListener('change', () => {
    loadReports();
  });
}

async function loadReports() {
  const container = document.getElementById('reportsContainer');
  const search = document.getElementById('reportSearch').value.trim();
  const sort = document.getElementById('reportSort').value;

  try {
    const params = new URLSearchParams({ search, sort });
    const reports = await apiRequest(`/api/v1/analyses?${params.toString()}`);

    renderReports(reports);
  } catch (err) {
    console.error('Error loading reports:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title" style="color: var(--danger);">Failed to load reports</div>
        <p class="empty-state-desc">${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function renderReports(reports) {
  const container = document.getElementById('reportsContainer');

  if (reports.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title">No Saved Analyses Found</div>
        <p class="empty-state-desc">You have not saved any analytical configurations yet. Create one by selecting a dataset.</p>
        <a href="/analysis.html" class="btn btn-primary btn-sm">+ Create New Analysis</a>
      </div>
    `;
    return;
  }

  const cardsHtml = reports
    .map(r => {
      const datasetName = r.datasetId ? r.datasetId.name : 'Unknown Dataset';
      const updatedDate = new Date(r.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const filtersCount = (r.filterRules || []).length;
      const filtersBadge =
        filtersCount > 0 ? `<span class="badge badge-warning">${filtersCount} Filter(s)</span>` : '';

      return `
      <div class="card" style="padding: 22px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
              <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-main);">
                ${escapeHtml(r.title)}
              </h3>
              <span class="badge badge-primary" style="text-transform: capitalize;">${r.chartType} Chart</span>
              ${filtersBadge}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              Dataset: <strong>${escapeHtml(datasetName)}</strong> • Last updated ${updatedDate}
            </div>
          </div>

          <!-- Actions Group -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="/analysis.html?id=${r._id}" class="btn btn-primary btn-sm">
              Open in Studio &rarr;
            </a>
            <button type="button" class="btn btn-secondary btn-sm btn-export-report" data-id="${r._id}" data-title="${escapeHtml(r.title)}" title="Download HTML Report">
              📑 HTML Report
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-dup-report" data-id="${r._id}" title="Duplicate Analysis">
              📋 Duplicate
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-del-report" data-id="${r._id}" data-title="${escapeHtml(r.title)}" title="Delete Analysis" style="color: var(--danger);">
              🗑️
            </button>
          </div>
        </div>

        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 14px;">
          ${escapeHtml(r.description || 'No descriptive notes added.')}
        </p>

        <!-- Metric badges -->
        <div style="display: flex; gap: 10px; font-size: 0.82rem; background: var(--bg-subtle); padding: 8px 14px; border-radius: var(--radius-sm); flex-wrap: wrap;">
          <span><strong>X-Axis:</strong> <code>${escapeHtml(r.xAxisColumn)}</code></span>
          <span>•</span>
          <span><strong>Y-Axis:</strong> <code>${escapeHtml(r.yAxisColumn || 'N/A')}</code> (${r.aggregation || 'none'})</span>
          ${r.groupByColumn ? `<span>•</span><span><strong>Group:</strong> <code>${escapeHtml(r.groupByColumn)}</code></span>` : ''}
        </div>
      </div>
    `;
    })
    .join('');

  container.innerHTML = cardsHtml;

  // Bind Export HTML Buttons
  container.querySelectorAll('.btn-export-report').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title');

      try {
        btn.disabled = true;
        btn.innerHTML = 'Generating...';

        const htmlStr = await apiRequest(`/api/v1/analyses/${id}/export`);
        const blob = new Blob([htmlStr], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_report.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        showToast('HTML analytical report downloaded.', 'success');
      } catch (err) {
        showToast(err.message || 'Export failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '📑 HTML Report';
      }
    });
  });

  // Bind Duplicate Buttons
  container.querySelectorAll('.btn-dup-report').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        await apiRequest(`/api/v1/analyses/${id}/duplicate`, { method: 'POST' });
        showToast('Analysis duplicated.', 'success');
        loadReports();
      } catch (err) {
        showToast(err.message || 'Duplication failed', 'error');
      }
    });
  });

  // Bind Delete Buttons
  container.querySelectorAll('.btn-del-report').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title');

      showConfirmModal({
        title: 'Delete Saved Analysis',
        message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        confirmText: 'Yes, Delete',
        isDanger: true,
        onConfirm: async () => {
          try {
            await apiRequest(`/api/v1/analyses/${id}`, { method: 'DELETE' });
            showToast(`Analysis "${title}" deleted.`, 'info');
            loadReports();
          } catch (err) {
            showToast(err.message || 'Delete failed', 'error');
          }
        }
      });
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
