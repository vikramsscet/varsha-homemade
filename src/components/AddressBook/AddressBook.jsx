import { useState } from 'react';
import AddressForm from '../AddressForm/AddressForm';
import { useAddresses } from '../../context/AddressContext';
import { MAX_ADDRESSES } from '../../services/addressApi';
import { getAddressErrorMessage } from '../../services/checkoutErrors';

function AddressCard({ address, selectable, selected, busy, onSelect, onEdit, onDelete, onMakeDefault }) {
  const name = `${address.firstName} ${address.lastName}`;
  return (
    <li className={`address-card ${selected ? 'is-selected' : ''}`} aria-busy={busy}>
      <div className="address-card-main">
        {selectable && (
          <input
            type="radio"
            name="delivery-address"
            id={`select-${address.id}`}
            checked={selected}
            onChange={() => onSelect(address.id)}
            aria-label={`Deliver to ${name}`}
            disabled={busy}
          />
        )}
        <address>
          <strong>{name}</strong>
          {address.isDefault === true && <span className="badge-default">Default</span>}
          <span>{address.phone}</span>
          <span>{address.addressLine1}</span>
          {address.addressLine2 && <span>{address.addressLine2}</span>}
          <span>{address.city}, {address.state} {address.postalCode}</span>
          <span>{address.countryName ?? address.country}</span>
        </address>
      </div>
      <div className="address-card-actions">
        <button type="button" onClick={() => onEdit(address)} disabled={busy} aria-label={`Edit address for ${name}`}>Edit</button>
        {!address.isDefault && (
          <button type="button" onClick={() => onMakeDefault(address)} disabled={busy} aria-label={`Set address for ${name} as default`}>Set as default</button>
        )}
        <button type="button" onClick={() => onDelete(address)} disabled={busy} aria-label={`Delete address for ${name}`}>Delete</button>
      </div>
    </li>
  );
}

// Address book for signed-in users. In checkout it is `selectable` and `emptyAsForm` (no saved
// address -> straight to the new-address form). The server owns default/ordering: lists are
// refetched by the context after every mutation.
export default function AddressBook({ selectable = false, selectedId = null, onSelect, emptyAsForm = false }) {
  const { addresses, loading, error, createAddress, updateAddress, deleteAddress, setDefaultAddress } = useAddresses();
  const [view, setView] = useState({ type: 'list' }); // list | new | edit
  const [confirming, setConfirming] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const atLimit = addresses.length >= MAX_ADDRESSES;

  async function run(id, fn) {
    if (busyId) return;
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(getAddressErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const makeDefault = (a) => run(a.id, async () => {
    await setDefaultAddress(a.id);
    onSelect?.(a.id);
  });
  const confirmDelete = () => {
    const target = confirming;
    setConfirming(null);
    return run(target.id, () => deleteAddress(target.id));
  };

  const showNew = view.type === 'new' || (emptyAsForm && addresses.length === 0 && !loading && !error);
  if (showNew && view.type !== 'edit') {
    return (
      <AddressForm
        title={addresses.length === 0 ? 'Add your delivery address' : 'Add a new address'}
        lockDefault={addresses.length === 0}
        submitLabel="Save address"
        onCancel={addresses.length ? () => setView({ type: 'list' }) : undefined}
        onSubmit={async (values) => {
          const created = await createAddress(values);
          if (created?.id) onSelect?.(created.id);
          setView({ type: 'list' });
        }}
      />
    );
  }
  if (view.type === 'edit') {
    const a = view.address;
    return (
      <AddressForm
        title="Edit address"
        initial={a}
        lockDefault={a.isDefault === true}
        submitLabel="Save changes"
        onCancel={() => setView({ type: 'list' })}
        onSubmit={async (values) => {
          await updateAddress(a.id, values);
          setView({ type: 'list' });
        }}
      />
    );
  }

  return (
    <div className="address-book">
      {loading && addresses.length === 0 && <p role="status" className="checkout-loading">Loading your addresses…</p>}
      {!loading && error && addresses.length === 0 && <p role="alert" className="form-error">{getAddressErrorMessage(error)}</p>}
      {actionError && <p role="alert" className="form-error">{actionError}</p>}

      {!loading && !error && addresses.length === 0 && (
        <div className="address-empty">
          <p>You haven't saved any addresses yet.</p>
          <button type="button" className="btn checkout-primary" onClick={() => setView({ type: 'new' })}>Add address</button>
        </div>
      )}

      {addresses.length > 0 && (
        <ul className="address-list" role={selectable ? 'radiogroup' : undefined} aria-label="Saved addresses">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              selectable={selectable}
              selected={a.id === selectedId}
              busy={busyId === a.id}
              onSelect={onSelect}
              onEdit={(addr) => setView({ type: 'edit', address: addr })}
              onDelete={setConfirming}
              onMakeDefault={makeDefault}
            />
          ))}
        </ul>
      )}

      {addresses.length > 0 && (
        <div className="address-add">
          <button type="button" className="btn checkout-secondary" onClick={() => setView({ type: 'new' })} disabled={atLimit || !!busyId}>
            Add new address
          </button>
          {atLimit && <p className="field-hint">You've reached the limit of {MAX_ADDRESSES} saved addresses.</p>}
        </div>
      )}

      {confirming && (
        <div className="dialog-backdrop">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc">
            <h3 id="del-title">Delete this address?</h3>
            <p id="del-desc">
              {confirming.addressLine1}, {confirming.city} will be removed from your address book.
              {confirming.isDefault && ' Another saved address will become your default.'}
            </p>
            <div className="form-actions">
              <button type="button" className="btn checkout-secondary" autoFocus onClick={() => setConfirming(null)}>Cancel</button>
              <button type="button" className="btn checkout-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
