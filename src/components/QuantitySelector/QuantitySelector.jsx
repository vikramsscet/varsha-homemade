import React, { useState } from 'react';
import './quantity-selector.css';

// Controlled when `value` is provided (the product page drives it from cart state); otherwise it
// keeps its own state as before. Quantity is always clamped to 1..max.
export default function QuantitySelector({ initial = 1, value, onChange, max = 99, disabled = false }) {
  const [internal, setInternal] = useState(initial);
  const controlled = value !== undefined;
  const qty = controlled ? value : internal;

  const change = (next) => {
    const clamped = Math.min(max, Math.max(1, next));
    if (!controlled) setInternal(clamped);
    if (onChange) onChange(clamped);
  };

  return (
    <div className="quantity-selector" role="group" aria-label="Quantity">
      <button
        aria-label="Decrease quantity"
        onClick={() => change(qty - 1)}
        className="qty-btn"
        disabled={disabled || qty <= 1}
      >
        −
      </button>
      <div className="qty-value" aria-live="polite">{qty}</div>
      <button
        aria-label="Increase quantity"
        onClick={() => change(qty + 1)}
        className="qty-btn"
        disabled={disabled || qty >= max}
      >
        +
      </button>
    </div>
  );
}
