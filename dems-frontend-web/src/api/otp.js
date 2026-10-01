import { apiClient } from './client.js';

export async function requestEmailOTP(email) {
  const { data } = await apiClient.post('/otp/email/request', { email });
  return data;
}

export async function verifyEmailOTP(email, otp) {
  const { data } = await apiClient.post('/otp/email/verify', { email, otp });
  return data;
}

export async function requestPhoneOTP(phone) {
  const { data } = await apiClient.post('/otp/phone/request', { phone });
  return data;
}

export async function verifyPhoneOTP(phone, otp) {
  const { data } = await apiClient.post('/otp/phone/verify', { phone, otp });
  return data;
}

export async function resendOTP(type, contact) {
  const { data } = await apiClient.post('/otp/resend', { type, contact });
  return data;
}

export async function getOTPStatus() {
  const { data } = await apiClient.get('/otp/status');
  return data.data;
}