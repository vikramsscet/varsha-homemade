import { validateAddress } from './addressApi';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pick = (source, keys) => Object.fromEntries(keys.filter((k) => k in source).map((k) => [k, source[k]]));

export const CUSTOMER_FIELDS = ['email', 'firstName', 'lastName', 'phone'];
export const DELIVERY_FIELDS = ['country', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode'];

// Client-side convenience only; the backend remains the authority. Reuses the address rules.
export function validateCustomer(values) {
  const errors = pick(validateAddress(values), ['firstName', 'lastName', 'phone']);
  const email = (values.email ?? '').trim();
  if (!email) errors.email = 'Email is required';
  else if (email.length > 320 || !EMAIL.test(email)) errors.email = 'Enter a valid email address';
  return errors;
}

export function validateDelivery(values) {
  return pick(validateAddress(values), DELIVERY_FIELDS);
}

// Backend detail fields may be nested ("customer.email"); the form keys are the last segment.
export function fieldErrorsForForm(fieldErrors) {
  return Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k.split('.').pop(), v]));
}
