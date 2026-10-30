import { Link } from 'react-router-dom';
import './breadcrumbs.css';

// Reusable breadcrumb trail. Ancestors with a `to` render as links; the last item is the current
// page (plain text, aria-current). Pages pass their own items since labels like a product's name
// are only known to the page.
export default function Breadcrumbs({ items }) {
  const visible = (items ?? []).filter((item) => item && item.label);
  if (visible.length === 0) return null;
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {visible.map((item, index) => {
          const isLast = index === visible.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {!isLast && item.to ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              )}
              {!isLast && <span className="breadcrumbs-sep" aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
