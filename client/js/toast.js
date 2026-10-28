/**
 * Lightweight Toast Notification Module.
 */
let container = null;

function ensureContainer() {
  if (!container) {
    container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }
  return container;
}

/**
 * Display a toast notification.
 * @param {string} message - Message text
 * @param {'success'|'error'|'warning'|'info'} type - Toast type
 * @param {number} duration - Milliseconds before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 4000) {
  const cont = ensureContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-weight: 700;">${iconMap[type] || '•'}</span>
      <span>${escapeHtml(message)}</span>
    </div>
    <button style="background: none; border: none; color: inherit; cursor: pointer; padding: 2px 6px; font-size: 1.1rem;" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.2s ease-in';
    setTimeout(() => toast.remove(), 200);
  };

  closeBtn.addEventListener('click', removeToast);
  setTimeout(removeToast, duration);

  cont.appendChild(toast);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
