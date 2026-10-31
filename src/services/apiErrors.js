// Reusable helpers over ApiError (defined in apiClient: status, code, message, details).

// Maps backend validation details [{ field, message }] to { field: message } for form display.
// The first message per field wins. Returns {} when there are no field-level details.
export function getFieldErrors(error) {
  const out = {};
  if (!Array.isArray(error?.details)) return out;
  for (const d of error.details) {
    if (d && typeof d.field === 'string' && d.field && !(d.field in out)) out[d.field] = d.message;
  }
  return out;
}

// Plain, serialisable copy for reducers/UI. Never includes request data or credentials.
export function toErrorInfo(error) {
  return {
    status: error?.status ?? 0,
    code: error?.code ?? 'UNKNOWN_ERROR',
    message: error?.message ?? 'Something went wrong',
    details: error?.details,
  };
}

export const isNetworkError = (e) => e?.code === 'NETWORK_ERROR';
export const isServerError = (e) => (e?.status ?? 0) >= 500 || e?.code === 'INTERNAL_ERROR';
export const isRateLimited = (e) => e?.status === 429 || e?.code === 'RATE_LIMITED';
