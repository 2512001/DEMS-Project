import { apiClient } from './client.js';

export async function requestNonce(walletAddress) {
  const { data } = await apiClient.get(`/auth/nonce/${walletAddress}`);
  return data;
}

export async function verifySignature(payload) {
  const { data } = await apiClient.post('/auth/verify', payload);
  return data;
}

export async function getMe() {
  const { data } = await apiClient.get('/auth/me');
  return data.user;
}

export async function updateProfile(payload) {
  const { data } = await apiClient.put('/auth/profile', payload);
  return data.user;
}
