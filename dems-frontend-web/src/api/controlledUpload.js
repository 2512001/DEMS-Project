import { apiClient } from './client.js';

export async function createPendingUpload(formData) {
  const { data } = await apiClient.post('/controlled-upload/pending', formData, {
    timeout: 120000
  });
  return data;
}

export async function signPendingUpload(requestId, signature) {
  const { data } = await apiClient.post(`/controlled-upload/pending/${requestId}/sign`, { signature });
  return data;
}

export async function approvePendingUpload(requestId, signature, reason) {
  const { data } = await apiClient.post(`/controlled-upload/pending/${requestId}/approve`, { signature, reason });
  return data;
}

export async function superAdminApprovePendingUpload(requestId, signature, reason) {
  const { data } = await apiClient.post(`/controlled-upload/pending/${requestId}/super-approve`, { signature, reason });
  return data;
}

export async function rejectPendingUpload(requestId, reason) {
  const { data } = await apiClient.post(`/controlled-upload/pending/${requestId}/reject`, { reason });
  return data;
}

export async function getPendingUploads(params = {}) {
  const { page = 1, limit = 20, status = '' } = params;
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(status && { status })
  });
  const { data } = await apiClient.get(`/controlled-upload/pending?${queryParams}`);
  return data;
}

export async function getPendingUploadById(requestId) {
  const { data } = await apiClient.get(`/controlled-upload/pending/${requestId}`);
  return data.data;
}
