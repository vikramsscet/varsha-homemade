import { Fragment } from 'react';

export default function TrustBar({ items }) {
  return (
    <section className="trust-bar">
      <div className="container">
        {items.map((item, index) => (
          <Fragment key={item}>
            <span>{item}</span>
            {index < items.length - 1 && <i>✦</i>}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
