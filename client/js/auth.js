import { apiRequest } from './api.js';
import { showToast } from './toast.js';

let currentUser = null;

/**
 * Fetch currently authenticated user or null.
 */
export async function getCurrentUser() {
  if (currentUser) return currentUser;

  try {
    const data = await apiRequest('/api/v1/auth/me');
    if (data && data.user) {
      currentUser = data.user;
      return currentUser;
    }
  } catch (err) {
    currentUser = null;
  }
  return null;
}

/**
 * Handle user logout.
 */
export async function logoutUser() {
  try {
    await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    currentUser = null;
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 400);
  } catch (err) {
    console.error('Logout error:', err);
    window.location.href = '/login.html';
  }
}

/**
 * Route protection guard executed on page load.
 */
export async function checkAuthGuard() {
  const cleanPath = window.location.pathname.toLowerCase().replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  const isLoginPage = cleanPath === '/login';
  const isRegisterPage = cleanPath === '/register';
  const isLandingPage = cleanPath === '' || cleanPath === '/';

  const user = await getCurrentUser();

  if (user) {
    // If logged in and visiting login or register, forward to dashboard
    if (isLoginPage || isRegisterPage) {
      window.location.href = '/dashboard.html';
      return user;
    }

    // Populate user profile info in navbar if present
    const navNameEl = document.getElementById('navUserName');
    if (navNameEl) navNameEl.textContent = user.name;

    const navAvatarEl = document.getElementById('navUserAvatar');
    if (navAvatarEl) {
      const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
      navAvatarEl.textContent = initial;
    }
  } else {
    // If not logged in and visiting protected view, redirect to login
    if (!isLoginPage && !isRegisterPage && !isLandingPage) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return null;
    }
  }

  // Bind logout button if present in navbar
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', e => {
      e.preventDefault();
      logoutUser();
    });
  }

  return user;
}

// Automatically run auth check
document.addEventListener('DOMContentLoaded', checkAuthGuard);
