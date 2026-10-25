import { apiClient } from './client.js';

export async function createGroup(data) {
  const { data: response } = await apiClient.post('/groups', data);
  return response;
}

export async function getOrganizationGroups() {
  const { data } = await apiClient.get('/groups/organization');
  return data;
}

export async function getUserGroups() {
  const { data } = await apiClient.get('/groups/my-groups');
  return data;
}

export async function addMemberToGroup(groupId, userId) {
  const { data } = await apiClient.post(`/groups/${groupId}/members`, { userId });
  return data;
}

export async function removeMemberFromGroup(groupId, userId) {
  const { data } = await apiClient.delete(`/groups/${groupId}/members/${userId}`);
  return data;
}

export async function deleteGroup(groupId) {
  const { data } = await apiClient.delete(`/groups/${groupId}`);
  return data;
}
