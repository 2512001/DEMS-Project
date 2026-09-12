import { apiClient } from './client.js';

export async function getMyFiles(page = 1, limit = 10) {
  const { data } = await apiClient.get(`/evidence/my-files?page=${page}&limit=${limit}`);
  return data;
}

export async function getEvidenceByCase(caseId) {
  const { data } = await apiClient.get(`/evidence/case/${encodeURIComponent(caseId)}`);
  return data;
}

export async function getUploadPolicy() {
  const { data } = await apiClient.get('/evidence/upload-policy');
  return data.data;
}

export async function getOrganizationEvidence() {
  const { data } = await apiClient.get('/evidence/organization');
  return data;
}

export async function uploadEvidence(formData) {
  const { data } = await apiClient.post('/evidence/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function finalizeEvidence(evidenceId, txHash) {
  const { data } = await apiClient.post(`/evidence/finalize/${evidenceId}`, { txHash });
  return data;
}

export async function markBlockchainFailed(evidenceId, reason) {
  const { data } = await apiClient.post(`/evidence/${evidenceId}/blockchain-failed`, { reason });
  return data;
}

export async function downloadEvidence(evidenceId) {
  const response = await apiClient.get(`/evidence/download/${evidenceId}`);
  return response.data;
}

export async function verifyEvidenceBlockchain(evidenceId) {
  const { data } = await apiClient.post(`/evidence/${evidenceId}/verify-blockchain`);
  return data;
}
