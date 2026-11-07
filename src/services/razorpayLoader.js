const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

// Loads Razorpay's official Standard Checkout script once. Resolves the Razorpay constructor.
export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay unavailable')));
      s.onerror = () => { loading = null; s.remove(); reject(new Error('Razorpay failed to load')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}
