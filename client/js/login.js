import { apiRequest } from './api.js';
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const btnSubmit = document.getElementById('btnSubmit');
  const errorBanner = document.getElementById('errorBanner');
  const btnDemoLogin = document.getElementById('btnDemoLogin');

  // Toggle Password Visibility
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.textContent = isPassword ? '🙈' : '👁️';
    });
  }

  // Demo Credentials Fill
  if (btnDemoLogin) {
    btnDemoLogin.addEventListener('click', () => {
      emailInput.value = 'elena.rostova@university.edu';
      passwordInput.value = 'Password123';
      showToast('Demo researcher credentials filled', 'info', 2000);
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

  // Submit Handler
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      return showError('Please enter both your email address and password.');
    }

    try {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = 'Signing in...';

      await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      showToast('Welcome back! Loading your dashboard...', 'success');

      // Check for redirect query param
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect') || '/dashboard.html';

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } catch (err) {
      showError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = 'Sign In to Studio';
    }
  });
});
