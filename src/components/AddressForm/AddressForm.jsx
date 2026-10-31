import { useState } from 'react';
import Field from '../Field/Field';
import CountrySelect from '../Field/CountrySelect';
import { validateAddress } from '../../services/addressApi';
import { getFieldErrors } from '../../services/apiErrors';
import { fieldErrorsForForm } from '../../services/checkoutValidation';
import { getAddressErrorMessage } from '../../services/checkoutErrors';

export const EMPTY_ADDRESS = {
  firstName: '', lastName: '', phone: '', country: '', addressLine1: '', addressLine2: '',
  city: '', state: '', postalCode: '', isDefault: false,
};

// API address -> form values (country shown by name; ISO code is the fallback).
export function addressToForm(address) {
  if (!address) return EMPTY_ADDRESS;
  return {
    ...EMPTY_ADDRESS,
    ...Object.fromEntries(Object.keys(EMPTY_ADDRESS).map((k) => [k, address[k] ?? EMPTY_ADDRESS[k]])),
    country: address.countryName ?? address.country ?? '',
  };
}

// Reusable add/edit form. onSubmit(values) must throw on failure; field errors from the backend
// are mapped onto inputs. `lockDefault` keeps "default" checked: the current default (or the very
// first address) can't be unset directly.
export default function AddressForm({ initial, title, submitLabel = 'Save address', lockDefault = false, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => ({ ...addressToForm(initial), ...(lockDefault ? { isDefault: true } : {}) }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const input = (name, extra = {}) => ({ id: `addr-${name}`, name, value: values[name], onChange: set(name), error: errors[name], disabled: saving, ...extra });

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    const found = validateAddress(trimmed);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await onSubmit(trimmed);
    } catch (error) {
      setErrors(fieldErrorsForForm(getFieldErrors(error)));
      setFormError(getAddressErrorMessage(error));
      setSaving(false);
    }
  }

  return (
    <form className="address-form" onSubmit={handleSubmit} noValidate aria-busy={saving}>
      {title && <h3>{title}</h3>}
      <div className="field-row">
        <Field {...input('firstName', { label: 'First name', required: true, autoComplete: 'given-name' })} />
        <Field {...input('lastName', { label: 'Last name', required: true, autoComplete: 'family-name' })} />
      </div>
      <Field {...input('phone', { label: 'Phone', required: true, type: 'tel', autoComplete: 'tel' })} />
      <CountrySelect {...input('country')} />
      <Field {...input('addressLine1', { label: 'Address', required: true, autoComplete: 'address-line1' })} />
      <Field {...input('addressLine2', { label: 'Apartment, suite, etc.', autoComplete: 'address-line2' })} />
      <div className="field-row field-row-3">
        <Field {...input('city', { label: 'City', required: true, autoComplete: 'address-level2' })} />
        <Field {...input('state', { label: 'State/Region', required: true, autoComplete: 'address-level1' })} />
        <Field {...input('postalCode', { label: 'ZIP/Postal code', required: true, autoComplete: 'postal-code' })} />
      </div>
      <label className="check-row">
        <input type="checkbox" name="isDefault" checked={values.isDefault} onChange={set('isDefault')} disabled={saving || lockDefault} />
        Make this my default address
      </label>
      {lockDefault && <p className="field-hint">This is your default address. Choose another address as default to change it.</p>}
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="form-actions">
        <button type="submit" className="btn checkout-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="btn checkout-secondary" onClick={onCancel} disabled={saving}>Cancel</button>}
      </div>
    </form>
  );
}
