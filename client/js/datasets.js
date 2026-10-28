import { apiRequest } from './api.js';
import { showToast } from './toast.js';
import { openModal, closeModal, showConfirmModal } from './modal.js';

let currentPage = 1;
const limit = 9;
let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
  loadDatasets();
  setupFilters();
  setupUploadModal();
  setupEditModal();
  setupSampleDataLoader();
});

function setupFilters() {
  const searchInput = document.getElementById('datasetSearch');
  const sortSelect = document.getElementById('datasetSort');
  const sourceSelect = document.getElementById('datasetSource');
  const prevBtn = document.getElementById('btnPrevPage');
  const nextBtn = document.getElementById('btnNextPage');

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentPage = 1;
      loadDatasets();
    }, 300);
  });

  sortSelect.addEventListener('change', () => {
    currentPage = 1;
    loadDatasets();
  });

  sourceSelect.addEventListener('change', () => {
    currentPage = 1;
    loadDatasets();
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadDatasets();
    }
  });

  nextBtn.addEventListener('click', () => {
    currentPage++;
    loadDatasets();
  });
}

async function loadDatasets() {
  const container = document.getElementById('datasetsContainer');
  const search = document.getElementById('datasetSearch').value.trim();
  const sort = document.getElementById('datasetSort').value;
  const sourceType = document.getElementById('datasetSource').value;

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit,
      search,
      sort,
      sourceType
    });

    const res = await apiRequest(`/api/v1/datasets?${params.toString()}`);
    const { datasets, pagination } = res;

    renderDatasets(datasets);
    updatePagination(pagination);
  } catch (err) {
    console.error('Error loading datasets:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title" style="color: var(--danger);">Failed to load datasets</div>
        <p class="empty-state-desc">${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function renderDatasets(datasets) {
  const container = document.getElementById('datasetsContainer');

  if (datasets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <div class="empty-state-title">No Datasets Found</div>
        <p class="empty-state-desc">No datasets match your search or filter criteria. Upload a CSV or load our benchmark dataset.</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('btnOpenUpload').click()">+ Upload CSV</button>
      </div>
    `;
    return;
  }

  const cardsHtml = datasets
    .map(d => {
      const score = d.qualitySummary ? d.qualitySummary.score : 100;
      const status = d.qualitySummary ? d.qualitySummary.status : 'High';
      const badgeClass = score >= 85 ? 'badge-success' : score >= 60 ? 'badge-warning' : 'badge-danger';
      const sizeKb = (d.fileSizeBytes / 1024).toFixed(1);
      const dateStr = new Date(d.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const sourceTypeBadge =
        d.sourceType === 'built-in-sample'
          ? '<span class="badge badge-accent">Sample Benchmark</span>'
          : d.sourceType === 'cleaned-derived'
          ? '<span class="badge badge-neutral">Cleaned Derived</span>'
          : '<span class="badge badge-primary">Uploaded CSV</span>';

      return `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div class="card-body">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px;">
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); word-break: break-word;">
              ${escapeHtml(d.name)}
            </h3>
            ${sourceTypeBadge}
          </div>

          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px; min-height: 40px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(d.description || 'No description provided.')}
          </p>

          <!-- Quality & Metrics Grid -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle); padding: 12px 14px; border-radius: var(--radius-sm); margin-bottom: 16px;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Dimensions</div>
              <div style="font-weight: 700; font-size: 0.95rem;">${d.rowCount.toLocaleString()} rows × ${d.columnCount} cols</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted);">Quality</div>
              <span class="badge ${badgeClass}">${score}% ${status}</span>
            </div>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; justify-content: space-between;">
            <span>File: ${escapeHtml(d.originalFilename)} (${sizeKb} KB)</span>
            <span>${dateStr}</span>
          </div>
        </div>

        <div class="card-footer" style="gap: 8px; flex-wrap: wrap;">
          <a href="/dataset-detail.html?id=${d._id}" class="btn btn-primary btn-sm" style="flex: 1;">
            Workspace &rarr;
          </a>
          <a href="/analysis.html?datasetId=${d._id}" class="btn btn-secondary btn-sm" title="Build Chart">
            📊
          </a>
          <button type="button" class="btn btn-secondary btn-sm btn-edit-dataset" data-id="${d._id}" data-name="${escapeHtml(d.name)}" data-desc="${escapeHtml(d.description || '')}" title="Edit Name & Description">
            ✏️
          </button>
          <button type="button" class="btn btn-secondary btn-sm btn-delete-dataset" data-id="${d._id}" data-name="${escapeHtml(d.name)}" title="Delete Dataset" style="color: var(--danger);">
            🗑️
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
      ${cardsHtml}
    </div>
  `;

  // Bind edit buttons
  container.querySelectorAll('.btn-edit-dataset').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const desc = btn.getAttribute('data-desc');

      document.getElementById('editDatasetId').value = id;
      document.getElementById('editNameInput').value = name;
      document.getElementById('editDescInput').value = desc;
      openModal('editModal');
    });
  });

  // Bind delete buttons
  container.querySelectorAll('.btn-delete-dataset').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');

      showConfirmModal({
        title: 'Delete Dataset',
        message: `Are you sure you want to permanently delete "${name}"? All associated data records and saved analyses will be cascade removed.`,
        confirmText: 'Yes, Delete Dataset',
        isDanger: true,
        onConfirm: async () => {
          try {
            await apiRequest(`/api/v1/datasets/${id}`, { method: 'DELETE' });
            showToast(`Dataset "${name}" deleted.`, 'info');
            loadDatasets();
          } catch (err) {
            showToast(err.message || 'Failed to delete dataset', 'error');
          }
        }
      });
    });
  });
}

function updatePagination(pagination) {
  const wrap = document.getElementById('paginationWrap');
  const summary = document.getElementById('pageSummary');
  const prevBtn = document.getElementById('btnPrevPage');
  const nextBtn = document.getElementById('btnNextPage');

  if (pagination.totalPages <= 1) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'flex';
  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.total, pagination.page * pagination.limit);
  summary.textContent = `Showing ${start} to ${end} of ${pagination.total} datasets (Page ${pagination.page} of ${pagination.totalPages})`;

  prevBtn.disabled = pagination.page <= 1;
  nextBtn.disabled = pagination.page >= pagination.totalPages;
}

function setupEditModal() {
  const closeBtn = document.getElementById('btnCloseEditModal');
  const cancelBtn = document.getElementById('btnCancelEdit');
  const form = document.getElementById('editForm');

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal('editModal'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('editModal'));

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const id = document.getElementById('editDatasetId').value;
      const name = document.getElementById('editNameInput').value.trim();
      const description = document.getElementById('editDescInput').value.trim();

      if (!name) return;

      try {
        await apiRequest(`/api/v1/datasets/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, description })
        });

        showToast('Dataset information updated.', 'success');
        closeModal('editModal');
        loadDatasets();
      } catch (err) {
        showToast(err.message || 'Failed to update dataset', 'error');
      }
    });
  }
}

function setupSampleDataLoader() {
  const btnLoad = document.getElementById('btnLoadSample');
  if (!btnLoad) return;

  btnLoad.addEventListener('click', async () => {
    try {
      btnLoad.disabled = true;
      btnLoad.innerHTML = 'Seeding benchmark...';

      await apiRequest('/api/v1/datasets/sample', { method: 'POST' });
      showToast('COVID-19 Benchmark dataset added to your workspace!', 'success');
      loadDatasets();
    } catch (err) {
      showToast(err.message || 'Failed to load sample dataset', 'error');
    } finally {
      btnLoad.disabled = false;
      btnLoad.innerHTML = '⚡ Load Sample COVID-19 Dataset';
    }
  });
}

function setupUploadModal() {
  const btnOpen = document.getElementById('btnOpenUpload');
  const btnClose = document.getElementById('btnCloseUploadModal');
  const btnCancel = document.getElementById('btnCancelUpload');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('csvFileInput');
  const fileInfo = document.getElementById('selectedFileInfo');
  const fileNameEl = document.getElementById('selectedFileName');
  const fileSizeEl = document.getElementById('selectedFileSize');
  const uploadForm = document.getElementById('uploadForm');
  const errorEl = document.getElementById('uploadError');
  const submitBtn = document.getElementById('btnSubmitUpload');

  if (btnOpen) btnOpen.addEventListener('click', () => openModal('uploadModal'));
  if (btnClose) btnClose.addEventListener('click', () => closeModal('uploadModal'));
  if (btnCancel) btnCancel.addEventListener('click', () => closeModal('uploadModal'));

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      errorEl.textContent = 'Invalid file format. Please choose a valid .csv file.';
      errorEl.style.display = 'block';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      errorEl.textContent = 'File exceeds maximum limit of 5 MB.';
      errorEl.style.display = 'block';
      return;
    }

    errorEl.style.display = 'none';
    selectedFile = file;

    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    fileInfo.style.display = 'flex';
  }

  if (uploadForm) {
    uploadForm.addEventListener('submit', async e => {
      e.preventDefault();

      if (!selectedFile) {
        errorEl.textContent = 'Please select a CSV file to upload.';
        errorEl.style.display = 'block';
        return;
      }

      const name = document.getElementById('datasetNameInput').value.trim();
      const description = document.getElementById('datasetDescInput').value.trim();

      const formData = new FormData();
      formData.append('file', selectedFile);
      if (name) formData.append('name', name);
      if (description) formData.append('description', description);

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Uploading & Profiling...';
        errorEl.style.display = 'none';

        const dataset = await apiRequest('/api/v1/datasets', {
          method: 'POST',
          body: formData
        });

        showToast('Dataset imported and profiled successfully!', 'success');
        closeModal('uploadModal');
        window.location.href = `/dataset-detail.html?id=${dataset._id}`;
      } catch (err) {
        errorEl.textContent = err.message || 'Upload failed.';
        errorEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Upload & Audit Data &rarr;';
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
