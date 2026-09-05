import React, { useState, useMemo } from 'react';
import './product-description.css';

export default function ProductDescription({ longDescription }) {
  const [expanded, setExpanded] = useState(false);

  const paragraphs = useMemo(() => {
    if (!longDescription) return [];
    return longDescription
      .split(/\n\n+/)
      .map((p) => p.replace(/\n/g, '<br/>'))
      .map((p) => `<p>${p}</p>`)
      .join('');
  }, [longDescription]);

  const short = useMemo(() => {
    if (!longDescription) return '';
    const first = longDescription.split(/\n\n+/)[0];
    return `<p>${first.replace(/\n/g, '<br/>')}</p>`;
  }, [longDescription]);

  return (
    <div className="product-description">
      {!expanded && <div className="short-desc" dangerouslySetInnerHTML={{ __html: short }} />}
      {/* <div className="premium">⭐ Premium Ingredients</div> */}
      {expanded && <div className="long-desc" dangerouslySetInnerHTML={{ __html: paragraphs }} />}
      <button className="read-more" onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Read less' : 'Read more'}
      </button>
      
    </div>
  );
}
