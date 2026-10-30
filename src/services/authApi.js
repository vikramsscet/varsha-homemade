import { ApiError, request, resolveApiBase } from './apiClient';

const GENERIC = 'Something went wrong. Please try again.';

const MESSAGES = {
  INVALID_GOOGLE_CREDENTIAL: 'Sign-in failed, please try again.',
  EMAIL_NOT_VERIFIED: 'Please verify your Google email address and try again.',
  ACCOUNT_DISABLED: 'Your account is disabled. Please contact support.',
  ACCOUNT_CONFLICT: 'This email is linked to a different Google account.',
  RATE_LIMITED: 'Too many attempts. Please try again later.',
};

// Maps any thrown error to user-facing text. Unknown/config/dev-bug codes get the generic
// message, with the code (never the credential or token) logged for developers.
export function getAuthErrorMessage(error) {
  if (!(error instanceof ApiError)) return GENERIC;
  const message = MESSAGES[error.code];
  if (message) return message;
  console.error('Auth request failed', { status: error.status, code: error.code, details: error.details });
  return GENERIC;
}

const baseUrl = () => resolveApiBase(import.meta.env.VITE_USER_SERVICE_URL);

export function loginWithGoogle(credential) {
  return request(baseUrl(), '/auth/google', { method: 'POST', body: { credential } });
}

export function getMe(options) {
  return request(baseUrl(), '/auth/me', options);
}
