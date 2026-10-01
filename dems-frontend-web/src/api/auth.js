import { apiClient } from './client.js';

export async function requestNonce(walletAddress) {
  console.log('[API] Requesting nonce for:', walletAddress);
  console.log('[API] API Base URL:', apiClient.defaults.baseURL);
  const { data } = await apiClient.get(`/auth/nonce/${walletAddress}`);
  console.log('[API] Nonce response:', data);
  return data;
}

export async function verifySignature(payload) {
  console.log('[API] Verifying signature for:', payload.walletAddress);
  const { data } = await apiClient.post('/auth/verify', payload);
  console.log('[API] Verification response:', data);
  return data;
}

export async function getMe() {
  console.log('[API] Getting current user');
  const { data } = await apiClient.get('/auth/me');
  console.log('[API] Current user response:', data);
  return data.user;
}

export async function updateProfile(payload) {
  const { data } = await apiClient.put('/auth/profile', payload);
  return data.user;
}
