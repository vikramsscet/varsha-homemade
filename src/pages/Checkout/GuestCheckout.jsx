import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../../components/Field/Field';
import CountrySelect from '../../components/Field/CountrySelect';
import { useGuestCheckout } from '../../context/GuestCheckoutContext';
import { DEAD_SESSION_CODES } from '../../services/guestCheckoutApi';
import { getGuestSession } from '../../services/guestCheckoutStorage';
import { getFieldErrors } from '../../services/apiErrors';
import { getGuestCheckoutErrorMessage, SESSION_EXPIRED_MESSAGE } from '../../services/checkoutErrors';
import {
  CUSTOMER_FIELDS, DELIVERY_FIELDS, fieldErrorsForForm, validateCustomer, validateDelivery,
} from '../../services/checkoutValidation';

const EMPTY_CUSTOMER = { email: '', firstName: '', lastName: '', phone: '' };
const EMPTY_DELIVERY = { country: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '' };

// Fills only fields the customer hasn't typed into, so form data in the UI survives a restore.
function fill(prev, saved, empty) {
  const next = { ...prev };
  for (const k of Object.keys(empty)) {
    const value = k === 'country' ? saved?.countryName ?? saved?.country : saved?.[k];
    if (!prev[k] && value) next[k] = value;
  }
  return next;
}

// Partial update: only fields whose trimmed value differs from the saved session. A blank is only
// ever sent for addressLine2 (the backend rejects other blank strings; they fail validation first).
function changed(values, saved, fields) {
  const out = {};
  for (const k of fields) {
    const v = (values[k] ?? '').trim();
    const old = k === 'country' ? [saved?.countryName, saved?.country] : [saved?.[k]];
    const same = old.some((o) => (o ?? '') === v || (k === 'email' && (o ?? '') === v.toLowerCase()));
    if (same || (v === '' && k !== 'addressLine2')) continue;
    out[k] = v;
  }
  return out;
}

export default function GuestCheckout() {
  const guest = useGuestCheckout();
  const guestRef = useRef(guest);
  guestRef.current = guest;
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [delivery, setDelivery] = useState(EMPTY_DELIVERY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [expiredNotice, setExpiredNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const started = useRef(false);

  // Entering the details step: restore a stored session, otherwise create one. Never retries a
  // dead token (the service clears it), and never runs per keystroke or per render.
  const init = useCallback(async () => {
    setInitializing(true);
    setApiError(null);
    try {
      const g = guestRef.current;
      if (g.session) return;
      const hadToken = !!getGuestSession();
      const restored = hadToken ? await g.restore() : null;
      if (!restored) {
        if (hadToken) setExpiredNotice(true);
        await g.create();
      }
    } catch (e) {
      setApiError(getGuestCheckoutErrorMessage(e));
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    init();
  }, [init]);

  const sessionId = guest.session?.id;
  useEffect(() => {
    if (!guest.session) return;
    setCustomer((c) => fill(c, guest.session.customer, EMPTY_CUSTOMER));
    setDelivery((d) => fill(d, guest.session.deliveryAddress, EMPTY_DELIVERY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const bind = (group, setGroup, name, extra = {}) => ({
    id: `guest-${name}`,
    name,
    value: group[name],
    onChange: (e) => { setSaved(false); setGroup((g) => ({ ...g, [name]: e.target.value })); },
    error: errors[name],
    disabled: saving || initializing,
    ...extra,
  });
  const c = (name, extra) => bind(customer, setCustomer, name, extra);
  const d = (name, extra) => bind(delivery, setDelivery, name, extra);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving || initializing) return;
    const found = { ...validateCustomer(customer), ...validateDelivery(delivery) };
    setErrors(found);
    setApiError(null);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const g = guestRef.current;
      // After an expiry there is no session: create a fresh one, then save the preserved form.
      const session = g.session ?? (await g.create());
      const customerChanges = changed(customer, session.customer, CUSTOMER_FIELDS);
      const deliveryChanges = changed(delivery, session.deliveryAddress, DELIVERY_FIELDS);
      if (Object.keys(customerChanges).length) await guestRef.current.updateCustomer(customerChanges);
      if (Object.keys(deliveryChanges).length) await guestRef.current.updateDeliveryAddress(deliveryChanges);
      setExpiredNotice(false);
      setSaved(true);
    } catch (err) {
      setErrors(fieldErrorsForForm(getFieldErrors(err)));
      // An expiry is announced by the banner; the next submit starts a new session.
      if (!DEAD_SESSION_CODES.includes(err?.code)) setApiError(getGuestCheckoutErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const expired = guest.expired || expiredNotice;
  return (
    <form className="checkout-form" onSubmit={handleSubmit} noValidate aria-busy={saving || initializing}>
      <p className="checkout-signin">Have an account? <Link to="/login" state={{ from: '/checkout' }}>Sign in</Link></p>
      {initializing && <p role="status" className="checkout-loading">Preparing your checkout…</p>}
      {expired && <p role="alert" className="form-error">{SESSION_EXPIRED_MESSAGE}</p>}
      {apiError && (
        <p role="alert" className="form-error">
          {apiError}{' '}
          {!guest.session && !saving && <button type="button" className="link-btn" onClick={init}>Try again</button>}
        </p>
      )}

      <section aria-labelledby="customer-title">
        <h2 id="customer-title">Customer details</h2>
        <Field {...c('email', { label: 'Email', required: true, type: 'email', autoComplete: 'email' })} />
        <div className="field-row">
          <Field {...c('firstName', { label: 'First name', required: true, autoComplete: 'given-name' })} />
          <Field {...c('lastName', { label: 'Last name', required: true, autoComplete: 'family-name' })} />
        </div>
        <Field {...c('phone', { label: 'Phone', required: true, type: 'tel', autoComplete: 'tel' })} />
      </section>

      <section aria-labelledby="delivery-title">
        <h2 id="delivery-title">Delivery details</h2>
        <CountrySelect {...d('country')} />
        <Field {...d('addressLine1', { label: 'Address', required: true, autoComplete: 'address-line1' })} />
        <Field {...d('addressLine2', { label: 'Apartment, suite, etc.', autoComplete: 'address-line2' })} />
        <div className="field-row field-row-3">
          <Field {...d('city', { label: 'City', required: true, autoComplete: 'address-level2' })} />
          <Field {...d('state', { label: 'State/Region', required: true, autoComplete: 'address-level1' })} />
          <Field {...d('postalCode', { label: 'ZIP/Postal code', required: true, autoComplete: 'postal-code' })} />
        </div>
      </section>

      {saved && <p role="status" className="form-success">Your details have been saved.</p>}
      <div className="form-actions">
        <button type="submit" className="btn checkout-primary" disabled={saving || initializing}>
          {saving ? 'Saving…' : 'Save details'}
        </button>
      </div>
    </form>
  );
}
