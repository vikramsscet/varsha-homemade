import { useEffect, useState } from 'react';
import AddressBook from '../../components/AddressBook/AddressBook';
import { useAuth } from '../../context/AuthContext';
import { useAddresses } from '../../context/AddressContext';
import { getAddressErrorMessage } from '../../services/checkoutErrors';

// Offered only after login, only with explicit consent: never saved automatically.
function SaveGuestAddress({ candidate, onDone }) {
  const { createAddress } = useAddresses();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await createAddress({ ...candidate, isDefault: false });
      onDone(true);
    } catch (e) {
      setError(getAddressErrorMessage(e));
      setSaving(false);
    }
  }
  return (
    <div className="save-guest-address" role="region" aria-label="Save delivery address">
      <p>Would you like to save this delivery address to your account?</p>
      <address>
        {candidate.addressLine1}{candidate.addressLine2 ? `, ${candidate.addressLine2}` : ''}, {candidate.city}, {candidate.state} {candidate.postalCode}
      </address>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn checkout-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save address'}</button>
        <button type="button" className="btn checkout-secondary" onClick={() => onDone(false)} disabled={saving}>No thanks</button>
      </div>
    </div>
  );
}

// Signed-in checkout: contact from the account, delivery from the saved address book. The
// default is found by isDefault === true (never by list position) and a user's later choice wins.
export default function AuthCheckout({ guestAddress, onGuestAddressDone }) {
  const { user } = useAuth();
  const { addresses, refresh } = useAddresses();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let alive = true;
    refresh()
      .catch((e) => alive && setLoadError(getAddressErrorMessage(e)))
      .finally(() => alive && setLoaded(true));
    return () => { alive = false; };
  }, [refresh]);

  // A stale or deleted selection falls back to the (new) default from the latest list.
  const effective = addresses.find((a) => a.id === selectedId) ?? addresses.find((a) => a.isDefault === true) ?? null;

  return (
    <div className="checkout-form">
      <section aria-labelledby="contact-title">
        <h2 id="contact-title">Customer details</h2>
        <p className="contact-line"><strong>{user?.displayName || user?.email}</strong></p>
        {user?.displayName && <p className="contact-line">{user.email}</p>}
      </section>

      <section aria-labelledby="delivery-title">
        <h2 id="delivery-title">Delivery address</h2>
        {guestAddress && <SaveGuestAddress candidate={guestAddress} onDone={onGuestAddressDone} />}
        {!loaded && <p role="status" className="checkout-loading">Loading your addresses…</p>}
        {loaded && loadError && addresses.length === 0 && (
          <p role="alert" className="form-error">
            {loadError}{' '}
            <button type="button" className="link-btn" onClick={() => { setLoaded(false); setLoadError(null); refresh().catch((e) => setLoadError(getAddressErrorMessage(e))).finally(() => setLoaded(true)); }}>
              Try again
            </button>
          </p>
        )}
        {loaded && !(loadError && addresses.length === 0) && (
          <AddressBook selectable emptyAsForm selectedId={effective?.id ?? null} onSelect={setSelectedId} />
        )}
      </section>
    </div>
  );
}
