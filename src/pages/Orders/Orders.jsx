import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';
import { ORDER_STATUSES, getOrdersErrorMessage, listOrders, orderStatusLabel, paymentStatusLabel } from '../../services/orderApi';
import { formatCurrency } from '../../services/currency';
import { formatDateTime } from '../../services/profileFormat';
import './orders.css';

const initial = { status: '', items: [], nextCursor: null, hasMore: false, phase: 'loading', error: null };

function reducer(state, a) {
  switch (a.type) {
    case 'FILTER': return { ...initial, status: a.status }; // cursor and list reset together
    case 'LOADING_MORE': return { ...state, phase: 'more', error: null };
    case 'LOADED': {
      const seen = new Set(a.append ? state.items.map((o) => o.id) : []);
      const fresh = a.page.items.filter((o) => !seen.has(o.id));
      return {
        ...state, phase: 'ready', error: null,
        items: a.append ? [...state.items, ...fresh] : fresh,
        nextCursor: a.page.pagination.nextCursor, hasMore: a.page.pagination.hasMore,
      };
    }
    case 'FAILED': return { ...state, phase: a.append ? 'ready' : 'error', error: a.error };
    default: return state;
  }
}

export default function OrdersPage() {
  const [s, dispatch] = useReducer(reducer, initial);
  const inFlight = useRef(false);
  const generation = useRef(0); // a response for a previous filter is ignored

  const fetchPage = useCallback(async (status, cursor) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const gen = generation.current;
    const append = !!cursor;
    try {
      const page = await listOrders({ status: status || undefined, cursor });
      if (gen === generation.current) dispatch({ type: 'LOADED', page, append });
    } catch (e) {
      // A 401 is handled globally (sign-out and redirect to login).
      if (gen === generation.current) dispatch({ type: 'FAILED', error: getOrdersErrorMessage(e), append });
    } finally {
      if (gen === generation.current) inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    fetchPage('', undefined);
    return () => { generation.current += 1; inFlight.current = false; };
  }, [fetchPage]);

  function changeFilter(status) {
    if (status === s.status) return;
    generation.current += 1; // drop any pending request and its cursor
    inFlight.current = false;
    dispatch({ type: 'FILTER', status });
    fetchPage(status, undefined);
  }

  function loadMore() {
    if (!s.hasMore || !s.nextCursor || inFlight.current) return;
    dispatch({ type: 'LOADING_MORE' });
    fetchPage(s.status, s.nextCursor);
  }

  const crumbs = [{ label: 'Home', to: '/' }, { label: 'My Orders' }];
  const loading = s.phase === 'loading';

  return (
    <main className="orders-page container">
      <Breadcrumbs items={crumbs} />
      <div className="orders-head">
        <h1>My Orders</h1>
        <label className="orders-filter">
          <span>Status</span>
          <select value={s.status} onChange={(e) => changeFilter(e.target.value)} disabled={loading}>
            <option value="">All Orders</option>
            {ORDER_STATUSES.map((st) => <option key={st} value={st}>{orderStatusLabel(st)}</option>)}
          </select>
        </label>
      </div>

      {loading && <p role="status" className="orders-loading">Loading your orders…</p>}

      {s.phase === 'error' && (
        <div role="alert" className="orders-error">
          <p>{s.error}</p>
          <button type="button" className="btn checkout-secondary" onClick={() => { dispatch({ type: 'FILTER', status: s.status }); fetchPage(s.status, undefined); }}>Try again</button>
        </div>
      )}

      {!loading && s.phase !== 'error' && s.items.length === 0 && (
        <div className="orders-empty">
          {s.status ? (
            <p>No orders match this filter.</p>
          ) : (
            <>
              <h2>No orders yet</h2>
              <p>When you place an order it will show up here.</p>
              <Link className="btn checkout-primary" to="/category/indian-sweets">Continue shopping</Link>
            </>
          )}
        </div>
      )}

      {s.items.length > 0 && (
        <ul className="orders-list">
          {s.items.map((o) => {
            const pay = paymentStatusLabel(o.paymentStatus);
            return (
              <li key={o.id} className="order-card">
                <div className="order-card-top">
                  <strong className="order-number">{o.orderNumber}</strong>
                  <span className={`order-badge status-${String(o.status).toLowerCase()}`}>{orderStatusLabel(o.status)}</span>
                </div>
                <dl className="order-meta">
                  <div><dt>Date</dt><dd>{formatDateTime(o.createdAt)}</dd></div>
                  <div><dt>Total</dt><dd>{formatCurrency(o.totalAmount, o.currency)}</dd></div>
                  {pay && <div><dt>Payment</dt><dd>{pay}</dd></div>}
                  {o.paymentMethodSummary && <div><dt>Method</dt><dd>{o.paymentMethodSummary}</dd></div>}
                </dl>
                <Link className="btn checkout-secondary" to={`/orders/${encodeURIComponent(o.id)}`}>View Details</Link>
              </li>
            );
          })}
        </ul>
      )}

      {s.error && s.phase === 'ready' && <p role="alert" className="form-error">{s.error}</p>}
      {s.hasMore && s.items.length > 0 && (
        <div className="orders-more">
          <button type="button" className="btn checkout-primary" onClick={loadMore} disabled={s.phase === 'more'}>
            {s.phase === 'more' ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </main>
  );
}
