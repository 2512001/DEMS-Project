import { apiClient } from './client.js';

export async function submitVerificationRequest(formData) {
  const { data } = await apiClient.post('/admin/verification-request', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function getVerificationRequests() {
  const { data } = await apiClient.get('/admin/verification-requests');
  return data;
}

export async function reviewVerificationRequest(payload) {
  const { data } = await apiClient.post('/admin/verification-requests/review', payload);
  return data;
}

export async function getUsers() {
  const { data } = await apiClient.get('/admin/users');
  return data;
}

export async function getAuditLogs() {
  const { data } = await apiClient.get('/admin/audit-logs');
  return data;
}

export async function upgradeOfficer(walletAddress) {
  const { data } = await apiClient.post('/admin/upgrade-officer', { walletAddress });
  return data;
}
