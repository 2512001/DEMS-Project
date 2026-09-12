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

export async function reviewMembershipApplication(payload) {
  const { data } = await apiClient.post('/admin/membership-applications/review', payload);
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

// Super Admin organization management
export async function listOrganizations() {
  const { data } = await apiClient.get('/organization/directory');
  return data;
}

export async function createOrganization(payload) {
  const { data } = await apiClient.post('/organization/create', payload);
  return data;
}

export async function assignOrganizationAdmin(payload) {
  const { data } = await apiClient.post('/organization/assign-admin', payload);
  return data;
}

export async function resolveOrganizationByCode(code) {
  const { data } = await apiClient.get(`/organization/resolve/${code}`);
  return data;
}

export async function getOrganization() {
  const { data } = await apiClient.get('/organization/me');
  return data.data;
}

export async function getOrganizationDetails(organizationId) {
  const { data } = await apiClient.get(`/organization/${organizationId}`);
  return data.data;
}

export async function getOrganizationAdmins(organizationId) {
  const { data } = await apiClient.get(`/organization/${organizationId}/admins`);
  return data;
}

export async function getOrganizationOverview() {
  const { data } = await apiClient.get('/organization/overview');
  return data.data;
}

export async function updateOrganizationSettings(payload) {
  const { data } = await apiClient.put('/organization/settings', payload);
  return data.data;
}

export async function listQuarantine() {
  const { data } = await apiClient.get('/quarantine');
  return data;
}

export async function getQuarantineById(id) {
  const { data } = await apiClient.get(`/quarantine/${id}`);
  return data;
}

export async function reviewQuarantine(id, payload) {
  const { data } = await apiClient.post(`/quarantine/${id}/review`, payload);
  return data;
}

export async function listModificationRequests() {
  const { data } = await apiClient.get('/modifications');
  return data;
}

export async function createModificationRequest(payload) {
  const { data } = await apiClient.post('/modifications', payload);
  return data;
}

export async function reviewModificationRequest(id, payload) {
  const { data } = await apiClient.post(`/modifications/${id}/review`, payload);
  return data;
}
