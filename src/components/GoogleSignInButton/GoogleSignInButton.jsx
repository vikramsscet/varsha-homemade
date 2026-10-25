import { useEffect, useRef, useState } from 'react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisPromise = null;

function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => {
        gisPromise = null;
        script.remove();
        reject(new Error('GIS load failed'));
      };
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

export default function GoogleSignInButton({ onCredential, onError, disabled = false }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const errorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  callbackRef.current = onCredential;
  errorRef.current = onError;

  useEffect(() => {
    if (!clientId) {
      errorRef.current?.('Google sign-in is not configured (missing client ID).');
      return undefined;
    }
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) {
              errorRef.current?.('Google did not return a credential. Please try again.');
              return;
            }
            callbackRef.current(response.credential);
          },
        });
        containerRef.current.replaceChildren();
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) errorRef.current?.('Could not load Google sign-in. Check your connection and try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div
      className={`google-signin ${disabled ? 'is-disabled' : ''}`}
      aria-busy={!ready}
      aria-disabled={disabled}
    >
      <div ref={containerRef} />
    </div>
  );
}
