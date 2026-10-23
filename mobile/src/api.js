import AsyncStorage from './storage';

// In Expo Go on physical device, localhost maps to the phone itself.
// We default to your computer's LAN IP on port 5000:
export const DEFAULT_API_URL = 'http://192.168.2.220:5000/api';

export const getApiUrl = async () => {
  try {
    const custom = await AsyncStorage.getItem('custom_api_url');
    if (custom && custom.trim()) {
      return custom.trim();
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_API_URL;
};

export const setApiUrl = async (url) => {
  if (!url) {
    await AsyncStorage.removeItem('custom_api_url');
  } else {
    await AsyncStorage.setItem('custom_api_url', url.trim());
  }
};

export const apiRequest = async (endpoint, options = {}) => {
  const baseUrl = await getApiUrl();
  const token = await AsyncStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      }
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
};
