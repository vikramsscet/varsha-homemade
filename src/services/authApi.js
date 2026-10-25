export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

const MESSAGES = {
  INVALID_GOOGLE_CREDENTIAL: 'Google sign-in could not be verified. Please try again.',
  EMAIL_NOT_VERIFIED: 'Your Google email address is not verified.',
  ACCOUNT_CONFLICT: 'This email is linked to a different Google account.',
  ACCOUNT_DISABLED: 'This account is not active.',
  RATE_LIMITED: 'Too many sign-in attempts. Please try again later.',
};

export async function loginWithGoogle(credential) {
  const baseUrl = import.meta.env.VITE_USER_SERVICE_URL;
  if (!baseUrl) throw new AuthError('Sign-in service is not configured.');

  let response;
  try {
    response = await fetch(`${baseUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ credential }),
    });
  } catch {
    throw new AuthError('Unable to reach the sign-in service. Check your connection and try again.');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // handled below
  }

  if (!response.ok) {
    throw new AuthError(MESSAGES[body?.error?.code] ?? 'Sign-in failed. Please try again.');
  }

  const data = body?.data;
  if (!body?.success || typeof data?.token !== 'string' || !data.user) {
    throw new AuthError('Received an unexpected response from the sign-in service.');
  }
  return { token: data.token, user: data.user };
}
