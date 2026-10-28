import { apiRequest } from './api.js';
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordConfirmInput = document.getElementById('passwordConfirm');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const btnSubmit = document.getElementById('btnSubmit');
  const errorBanner = document.getElementById('errorBanner');

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.textContent = isPassword ? '🙈' : '👁️';
    });
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.style.display = 'block';
  }

  function hideError() {
    errorBanner.style.display = 'none';
    errorBanner.textContent = '';
  }

  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideError();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;

    if (!name || name.length < 2) {
      return showError('Please enter your full name (minimum 2 characters).');
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !emailRegex.test(email)) {
      return showError('Please enter a valid email address.');
    }

    if (!password || password.length < 8) {
      return showError('Password must be at least 8 characters long.');
    }

    if (password !== passwordConfirm) {
      return showError('Passwords do not match. Please re-enter.');
    }

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = 'Creating account...';

      await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, passwordConfirm })
      });

      showToast('Account created successfully! Loading dashboard...', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 500);
    } catch (err) {
      showError(err.message || 'Registration failed. Please check your information.');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = 'Create Free Account &rarr;';
    }
  });
});
