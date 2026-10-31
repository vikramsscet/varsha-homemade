import { ApiError, request, resolveApiBase } from './apiClient';
import { tokenStorage } from './tokenStorage';

export const MAX_ADDRESSES = 20;

// Address endpoints live on the user service. They always use the Google-derived JWT; the user id
// is never sent (the backend derives it from the token).
function addressRequest(path, options = {}) {
  const token = tokenStorage.get();
  if (!token) {
    return Promise.reject(new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'Sign in to manage addresses' }));
  }
  return request(resolveApiBase(import.meta.env.VITE_USER_SERVICE_URL), `/addresses${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}` },
  });
}

function requireId(id) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new ApiError({ status: 0, code: 'INVALID_REQUEST', message: 'address id is required' });
  }
  return `/${encodeURIComponent(id)}`;
}

const PHONE = /^\+?[0-9 ().-]{5,19}$/;
const POSTAL = /^[A-Za-z0-9 -]{2,20}$/;
const blank = (v) => typeof v !== 'string' || !v.trim();

// Client-side convenience only; the backend is the final authority. Returns { field: message }.
export function validateAddress(a = {}) {
  const e = {};
  const required = (f, label, max) => {
    if (blank(a[f])) e[f] = `${label} is required`;
    else if (max && a[f].length > max) e[f] = `${label} must be at most ${max} characters`;
  };
  required('firstName', 'First name', 100);
  required('lastName', 'Last name', 100);
  required('addressLine1', 'Address line 1', 255);
  required('city', 'City');
  required('state', 'State', 100);
  required('country', 'Country');
  if (typeof a.addressLine2 === 'string' && a.addressLine2.length > 255) e.addressLine2 = 'Address line 2 must be at most 255 characters';
  if (typeof a.phone !== 'string' || !PHONE.test(a.phone.trim())) e.phone = 'Enter a valid phone number (6-20 characters)';
  if (typeof a.postalCode !== 'string' || !POSTAL.test(a.postalCode.trim())) e.postalCode = 'Enter a valid postal code (2-20 characters)';
  if (a.isDefault !== undefined && typeof a.isDefault !== 'boolean') e.isDefault = 'isDefault must be true or false';
  return e;
}

const FIELDS = ['firstName', 'lastName', 'phone', 'country', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'isDefault'];

// Whitelists the documented fields so nothing else (e.g. a user id or server-owned id) is sent.
function toPayload(address) {
  const body = {};
  for (const f of FIELDS) if (address?.[f] !== undefined) body[f] = address[f];
  return body;
}

export const getAddresses = () => addressRequest('');
export const getAddress = (id) => addressRequest(requireId(id));
export const createAddress = (address) => addressRequest('', { method: 'POST', body: toPayload(address) });
// PUT replaces the whole address: send the complete payload.
export const updateAddress = (id, address) =>
  addressRequest(requireId(id), { method: 'PUT', body: toPayload(address) });
export const deleteAddress = (id) => addressRequest(requireId(id), { method: 'DELETE' });
export const setDefaultAddress = (id) => addressRequest(`${requireId(id)}/default`, { method: 'PATCH' });
