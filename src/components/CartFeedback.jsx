// Live regions stay mounted so screen readers announce the text when it changes.
export default function CartFeedback({ feedback }) {
  const success = feedback?.type === 'success' ? feedback : null;
  const error = feedback?.type === 'error' ? feedback : null;
  return (
    <div className="cart-feedback-wrap">
      <div role="status" className={success ? 'cart-feedback is-success' : undefined}>
        {success && <span key={success.id}><span aria-hidden="true">✓ </span>{success.message}</span>}
      </div>
      <div role="alert" className={error ? 'cart-feedback is-error' : undefined}>
        {error && <span key={error.id}><span aria-hidden="true">! </span>{error.message}</span>}
      </div>
    </div>
  );
}
