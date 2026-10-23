const API_BASE = import.meta.env.VITE_API_BASE || (window.location.port === '5173' ? 'http://localhost:5000/api' : '/api');

export function getAuthHeader() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function apiRequest(endpoint, options = {}) {
  const headers = { ...getAuthHeader(), ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (data.error && (data.error.includes('expired') || data.error.includes('token') || data.error.includes('deactivated'))) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      }
    }
    const errorMsg = data.error || (res.status === 401 ? 'Invalid username or password' : `Server returned HTTP ${res.status}`);
    throw new Error(errorMsg);
  }

  return data;
}
