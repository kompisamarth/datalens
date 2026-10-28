/**
 * Reusable Modal Dialog Manager.
 */

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/**
 * Open a generic confirmation modal.
 * @param {object} options - { title, message, confirmText, isDanger, onConfirm }
 */
export function showConfirmModal({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  isDanger = false,
  onConfirm = () => {}
}) {
  let modal = document.getElementById('confirmModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title" id="confirmModalTitle">Confirm</h3>
          <button type="button" class="btn btn-secondary btn-sm" id="confirmModalClose">&times;</button>
        </div>
        <div class="modal-body">
          <p id="confirmModalMessage"></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="confirmModalCancel">Cancel</button>
          <button type="button" class="btn" id="confirmModalOk">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#confirmModalClose').addEventListener('click', () => closeModal('confirmModal'));
    modal.querySelector('#confirmModalCancel').addEventListener('click', () => closeModal('confirmModal'));
  }

  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMessage').textContent = message;

  const okBtn = document.getElementById('confirmModalOk');
  okBtn.textContent = confirmText;
  okBtn.className = `btn ${isDanger ? 'btn-danger' : 'btn-primary'}`;

  // Replace click listener
  const newOkBtn = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);

  newOkBtn.addEventListener('click', async () => {
    closeModal('confirmModal');
    if (typeof onConfirm === 'function') {
      await onConfirm();
    }
  });

  openModal('confirmModal');
}

// Global listener for backdrop clicks to close
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});
