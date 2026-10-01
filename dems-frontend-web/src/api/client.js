import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api';

console.log('[API] API Base URL:', API_BASE_URL);
console.log('[API] Environment VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

// Add a request interceptor for debugging
function stripFormDataContentType(config) {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers?.delete === 'function') {
      config.headers.delete('Content-Type');
    } else if (config.headers) {
      delete config.headers['Content-Type'];
    }
  }
}

apiClient.interceptors.request.use((config) => {
  stripFormDataContentType(config);
  console.log('[API] Request:', config.method.toUpperCase(), config.url);
  console.log('[API] Full URL:', config.baseURL + config.url);
  return config;
});

apiClient.interceptors.response.use((response) => {
  console.log('[API] Response:', response.status, response.config.url);
  return response;
}, (error) => {
  console.error('[API] Error:', error.message);
  console.error('[API] Error config:', error.config);
  if (error.code === 'ECONNREFUSED') {
    console.error('[API] Connection refused - backend may not be running');
  }
  return Promise.reject(error);
});

let currentGetToken = null;
let currentOnUnauthorized = null;
let interceptorInstalled = false;

export function installAuthInterceptors(getToken, onUnauthorized) {
  // Store the token getter function
  currentGetToken = getToken;
  currentOnUnauthorized = onUnauthorized;

  // Only install interceptors once
  if (interceptorInstalled) {
    return;
  }

  const requestInterceptor = apiClient.interceptors.request.use((config) => {
    stripFormDataContentType(config);
    const token = currentGetToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const url = error.config?.url || '';
      const isAuthHandshake = url.includes('/auth/nonce') || url.includes('/auth/verify');
      if (error.response?.status === 401 && !isAuthHandshake && currentGetToken?.()) {
        currentOnUnauthorized?.();
      }
      return Promise.reject(error);
    }
  );

  interceptorInstalled = true;
}

export function apiErrorMessage(error, fallback = 'Request failed.') {
  return error.response?.data?.message || error.message || fallback;
}
