import { apiClient } from './client.js';

export async function getPlatformAnalytics() {
  const { data } = await apiClient.get('/analytics/platform');
  return data.data;
}

export async function getOrganizationAnalytics() {
  const { data } = await apiClient.get('/analytics/organization');
  return data.data;
}

export async function getOfficerAnalytics() {
  const { data } = await apiClient.get('/analytics/officer');
  return data.data;
}

export async function getCitizenAnalytics() {
  const { data } = await apiClient.get('/analytics/citizen');
  return data.data;
}