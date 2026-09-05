import React, { useState, useEffect } from 'react';
import './quantity-selector.css';

export default function QuantitySelector({ initial = 1, onChange }) {
  const [qty, setQty] = useState(initial);

  useEffect(() => {
    if (onChange) onChange(qty);
  }, [qty]);

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => q + 1);

  return (
    <div className="quantity-selector">
      <button aria-label="Decrease quantity" onClick={dec} className="qty-btn">−</button>
      <div className="qty-value">{qty}</div>
      <button aria-label="Increase quantity" onClick={inc} className="qty-btn">+</button>
    </div>
  );
}
