/**
 * Centralized API Fetch Client for DataLens Studio.
 * Handles credential cookies, CSRF token management, and structured error responses.
 */

let cachedCsrfToken = null;

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * Fetch or retrieve stored CSRF token.
 */
export async function getCsrfToken() {
  const cookieToken = getCookie('XSRF-TOKEN');
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
    return cookieToken;
  }

  if (cachedCsrfToken) return cachedCsrfToken;

  try {
    const res = await fetch('/api/v1/auth/csrf', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.csrfToken) {
        cachedCsrfToken = data.data.csrfToken;
        return cachedCsrfToken;
      }
    }
  } catch (err) {
    console.warn('[API] Could not fetch CSRF token:', err);
  }
  return null;
}

/**
 * Perform an authenticated API request.
 * @param {string} endpoint - Relative path (e.g., '/api/v1/datasets')
 * @param {object} options - Fetch options
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };

  // Set CSRF token on mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken();
    if (token) {
      headers['x-csrf-token'] = token;
    }
  }

  // Set default JSON content-type unless sending FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    method,
    headers,
    credentials: 'include' // Send session cookie
  };

  const response = await fetch(endpoint, config);

  // If response is file download (CSV or HTML attachment), return blob or text
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    return response.blob();
  }

  if (contentType.includes('text/html') && endpoint.includes('/export')) {
    if (!response.ok) {
      throw new Error(`Export failed with status ${response.status}`);
    }
    return response.text();
  }

  let result = null;
  try {
    result = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    return null;
  }

  if (!response.ok || (result && result.success === false)) {
    const errObj = (result && result.error) || {
      code: 'API_ERROR',
      message: `Request failed with status ${response.status}`
    };

    // Check if current page is a public / authentication view
    const cleanPath = window.location.pathname.toLowerCase().replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    const isPublicPage = cleanPath === '' || cleanPath === '/' || cleanPath === '/login' || cleanPath === '/register';

    // Only redirect to login if an authenticated API call fails on a protected workspace page
    const isAuthBootstrapEndpoint =
      endpoint.includes('/auth/me') ||
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/register') ||
      endpoint.includes('/auth/csrf');

    if (response.status === 401 && !isPublicPage && !isAuthBootstrapEndpoint) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }

    const error = new Error(errObj.message || 'API request failed');
    error.code = errObj.code;
    error.details = errObj.details;
    error.status = response.status;
    throw error;
  }

  return result.data;
}
