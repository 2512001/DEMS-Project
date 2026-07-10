import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

export function installAuthInterceptors(getToken, onUnauthorized) {
  apiClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        onUnauthorized();
      }
      return Promise.reject(error);
    }
  );
}

export function apiErrorMessage(error, fallback = 'Request failed.') {
  return error.response?.data?.message || error.message || fallback;
}
