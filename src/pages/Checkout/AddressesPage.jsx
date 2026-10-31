import { useEffect, useState } from 'react';
import Breadcrumbs from '../../components/Breadcrumbs';
import AddressBook from '../../components/AddressBook/AddressBook';
import { useAddresses } from '../../context/AddressContext';
import './checkout.css';

export default function AddressesPage() {
  const { refresh } = useAddresses();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    refresh().catch(() => {}).finally(() => setLoaded(true));
  }, [refresh]);
  return (
    <main className="checkout-page container">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Address book' }]} />
      <h1>Address book</h1>
      {loaded ? <AddressBook /> : <p role="status" className="checkout-loading">Loading your addresses…</p>}
    </main>
  );
}
