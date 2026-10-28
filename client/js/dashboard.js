import { apiRequest } from './api.js';
import { getCurrentUser } from './auth.js';
import { showToast } from './toast.js';
import { openModal, closeModal } from './modal.js';

let selectedFile = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (user) {
    const greetingEl = document.getElementById('greetingTitle');
    if (greetingEl) {
      greetingEl.textContent = `Welcome back, ${user.name}!`;
    }
  }

  await loadDashboardData();
  setupUploadModal();
  setupSampleDataLoader();
});

async function loadDashboardData() {
  try {
    const data = await apiRequest('/api/v1/dashboard/summary');
    if (!data) return;

    // Metric Cards
    document.getElementById('statTotalDatasets').textContent = data.totalDatasets.toLocaleString();
    document.getElementById('statTotalAnalyses').textContent = data.totalAnalyses.toLocaleString();
    document.getElementById('statAvgQuality').textContent = `${data.avgQualityScore} / 100`;
    document.getElementById('statTotalRows').textContent = data.totalRows.toLocaleString();

    // Render Recent Datasets
    renderRecentDatasets(data.recentDatasets || []);

    // Render Recent Analyses
    renderRecentAnalyses(data.recentAnalyses || []);
  } catch (err) {
    console.error('Error loading dashboard summary:', err);
    showToast('Failed to load dashboard metrics.', 'error');
  }
}

function renderRecentDatasets(datasets) {
  const container = document.getElementById('recentDatasetsContainer');

  if (datasets.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="border: none; margin: 0; padding: 40px 20px;">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-title">No Datasets Yet</div>
        <p class="empty-state-desc">Upload a CSV file or load our sample benchmark to begin exploring data quality and generating insights.</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('btnOpenUpload').click()">+ Upload Your First Dataset</button>
      </div>
    `;
    return;
  }

  const rowsHtml = datasets
    .map(d => {
      const score = d.qualitySummary ? d.qualitySummary.score : 100;
      const status = d.qualitySummary ? d.qualitySummary.status : 'High';
      const badgeClass = score >= 85 ? 'badge-success' : score >= 60 ? 'badge-warning' : 'badge-danger';
      const createdStr = new Date(d.createdAt).toLocaleDateString();

      return `
      <tr>
        <td>
          <a href="/dataset-detail.html?id=${d._id}" style="font-weight: 600;">${escapeHtml(d.name)}</a>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${d.rowCount.toLocaleString()} rows • ${d.columnCount} cols</div>
        </td>
        <td>
          <span class="badge ${badgeClass}">${score}% ${status}</span>
        </td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${createdStr}</td>
        <td style="text-align: right;">
          <a href="/dataset-detail.html?id=${d._id}" class="btn btn-secondary btn-sm">Workspace &rarr;</a>
        </td>
      </tr>
    `;
    })
    .join('');

  container.innerHTML = `
    <div class="table-responsive" style="border: none; border-radius: 0;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Dataset</th>
            <th>Quality Health</th>
            <th>Uploaded</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

function renderRecentAnalyses(analyses) {
  const container = document.getElementById('recentAnalysesContainer');

  if (analyses.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="border: none; margin: 0; padding: 40px 20px;">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title">No Saved Analyses</div>
        <p class="empty-state-desc">Open a dataset to build charts, discover correlations, and save analytical reports.</p>
        <a href="/datasets.html" class="btn btn-secondary btn-sm">Explore Datasets &rarr;</a>
      </div>
    `;
    return;
  }

  const rowsHtml = analyses
    .map(a => {
      const datasetName = a.datasetId ? a.datasetId.name : 'Unknown Dataset';
      const updatedStr = new Date(a.updatedAt).toLocaleDateString();

      return `
      <tr>
        <td>
          <a href="/analysis.html?id=${a._id}" style="font-weight: 600;">${escapeHtml(a.title)}</a>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(datasetName)}</div>
        </td>
        <td>
          <span class="badge badge-primary" style="text-transform: capitalize;">${a.chartType} Chart</span>
        </td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${updatedStr}</td>
        <td style="text-align: right;">
          <a href="/analysis.html?id=${a._id}" class="btn btn-secondary btn-sm">Open &rarr;</a>
        </td>
      </tr>
    `;
    })
    .join('');

  container.innerHTML = `
    <div class="table-responsive" style="border: none; border-radius: 0;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Analysis Title</th>
            <th>Chart Archetype</th>
            <th>Last Modified</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

function setupSampleDataLoader() {
  const btnLoad = document.getElementById('btnLoadSample');
  if (!btnLoad) return;

  btnLoad.addEventListener('click', async () => {
    try {
      btnLoad.disabled = true;
      btnLoad.innerHTML = 'Seeding benchmark...';

      const res = await apiRequest('/api/v1/datasets/sample', { method: 'POST' });
      showToast('COVID-19 Benchmark dataset loaded successfully!', 'success');

      // Reload dashboard
      await loadDashboardData();
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

        // Redirect directly to the dataset workspace!
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
