import React from 'react';
import './social-share.css';

export default function SocialShare() {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const share = {
    fb: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    pin: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}`,
    wa: `https://wa.me/?text=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  };

  return (
    <div className="social-share">
      <a href={share.fb} target="_blank" rel="noreferrer" aria-label="Share on Facebook">🔵</a>
      <a href={share.pin} target="_blank" rel="noreferrer" aria-label="Share on Pinterest">📌</a>
      <a href={share.wa} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp">💬</a>
      <a href={share.x} target="_blank" rel="noreferrer" aria-label="Share on X">✖</a>
    </div>
  );
}
