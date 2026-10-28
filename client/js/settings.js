import { apiRequest } from './api.js';
import { getCurrentUser } from './auth.js';
import { showToast } from './toast.js';
import { applyTheme } from './theme.js';
import { openModal, closeModal } from './modal.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (user) {
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    if (currentTheme === 'dark') {
      document.getElementById('themeDarkRadio').checked = true;
    } else {
      document.getElementById('themeLightRadio').checked = true;
    }
  }

  setupProfileForm();
  setupThemeChoice();
  setupPasswordForm();
  setupDeleteAccount();
});

function setupProfileForm() {
  const form = document.getElementById('profileForm');
  const btn = document.getElementById('btnSaveProfile');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('profileName').value.trim();

    if (!name || name.length < 2) {
      showToast('Name must be at least 2 characters long.', 'warning');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = 'Saving...';

      await apiRequest('/api/v1/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name })
      });

      // Update navbar
      const navName = document.getElementById('navUserName');
      if (navName) navName.textContent = name;

      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Save Profile Changes';
    }
  });
}

function setupThemeChoice() {
  const radios = document.querySelectorAll('input[name="themeChoice"]');
  radios.forEach(r => {
    r.addEventListener('change', async () => {
      const selected = r.value;
      applyTheme(selected);

      try {
        await apiRequest('/api/v1/user/profile', {
          method: 'PATCH',
          body: JSON.stringify({ theme: selected })
        });
        showToast(`Theme changed to ${selected} mode.`, 'info');
      } catch (err) {
        console.warn('Failed to persist theme to backend:', err);
      }
    });
  });
}

function setupPasswordForm() {
  const form = document.getElementById('passwordForm');
  const btn = document.getElementById('btnUpdatePassword');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    if (!currentPassword || !newPassword) {
      showToast('Please enter both current and new passwords.', 'warning');
      return;
    }

    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'warning');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = 'Updating...';

      await apiRequest('/api/v1/user/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      form.reset();
      showToast('Password updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Update Password';
    }
  });
}

function setupDeleteAccount() {
  const btnOpen = document.getElementById('btnOpenDeleteAccountModal');
  const btnClose = document.getElementById('btnCloseDeleteModal');
  const btnCancel = document.getElementById('btnCancelDelete');
  const form = document.getElementById('deleteAccountForm');
  const submitBtn = document.getElementById('btnConfirmDeleteAccount');

  if (btnOpen) btnOpen.addEventListener('click', () => openModal('deleteAccountModal'));
  if (btnClose) btnClose.addEventListener('click', () => closeModal('deleteAccountModal'));
  if (btnCancel) btnCancel.addEventListener('click', () => closeModal('deleteAccountModal'));

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const password = document.getElementById('deleteConfirmPassword').value;

      if (!password) {
        showToast('Password is required to confirm deletion.', 'warning');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Deleting Account...';

        await apiRequest('/api/v1/user/account', {
          method: 'DELETE',
          body: JSON.stringify({ password })
        });

        showToast('Account deleted successfully. Goodbye!', 'info');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 600);
      } catch (err) {
        showToast(err.message || 'Failed to delete account', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Delete Account & Everything';
      }
    });
  }
}
