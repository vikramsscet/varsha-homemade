import React, { useState } from 'react';
import './product-image-gallery.css';

export default function ProductImageGallery({ images = [] }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="product-image-gallery">
      <div className="thumbnails">
        {images.map((src, idx) => (
          <button
            key={idx}
            className={`thumb ${idx === selected ? 'active' : ''}`}
            onClick={() => setSelected(idx)}
            style={{ backgroundImage: `url(${src})` }}
            aria-label={`Show image ${idx + 1}`}
            type="button"
          />
        ))}
      </div>
      <div className="gallery-main">
        <img src={images[selected]} alt={`Product image ${selected + 1}`} />
      </div>
    </div>
  );
}
