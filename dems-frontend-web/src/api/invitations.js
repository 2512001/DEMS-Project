import { apiClient } from './client.js';

export async function getInvitationByToken(token) {
  const { data } = await apiClient.get(`/invitations/token/${token}`);
  return data;
}

export async function acceptAdminInvitation(token, profileData) {
  const { data } = await apiClient.post(`/invitations/admin/${token}/accept`, profileData);
  return data;
}

export async function acceptEmployeeInvitation(token) {
  const { data } = await apiClient.post(`/invitations/employee/${token}/accept`);
  return data;
}

export async function submitEmployeeApplication(token, formData) {
  const { data } = await apiClient.post(`/invitations/employee/${token}/submit`, formData, {
    timeout: 120000
  });
  return data;
}

export async function createAdminInvitation(payload) {
  const { data } = await apiClient.post('/invitations/admin/create', payload);
  return data;
}

export async function createEmployeeInvitation(payload) {
  const { data } = await apiClient.post('/invitations/employee/create', payload);
  return data;
}

export async function getPendingInvitations(organizationId) {
  const { data } = await apiClient.get(`/invitations/pending/${organizationId}`);
  return data;
}

export async function revokeInvitation(invitationId) {
  const { data } = await apiClient.delete(`/invitations/${invitationId}/revoke`);
  return data;
}