import { apiClient } from './client.js';

export async function getNotifications() {
  const { data } = await apiClient.get('/notifications');
  return data;
}

export async function markNotificationAsRead(notificationId) {
  const { data } = await apiClient.put(`/notifications/${notificationId}/read`);
  return data;
}

export async function markAllNotificationsAsRead() {
  const { data } = await apiClient.put('/notifications/read-all');
  return data;
}
