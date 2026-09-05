export default function ProductCard({ title, price, weight, image, stock }) {
  return (
    <article className="product-list-card">
      <div className="product-list-image-wrap">
        <img src={image} alt={title} loading="lazy" />
      </div>
      <div className="product-list-info">
        <h3>{title}</h3>
        <div className="product-price-row">
          {stock ? <span className="stock-tag">{stock}</span> : <span className="price-label">Price</span>}
          {!stock && <strong>{price}</strong>}
        </div>
        <div className="product-meta">{stock ? `${stock} · ${price} / ${weight}` : `${price} / ${weight}`}</div>
      </div>
    </article>
  );
}
