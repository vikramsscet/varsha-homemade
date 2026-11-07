import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AddressProvider } from './context/AddressContext';
import { GuestCheckoutProvider } from './context/GuestCheckoutContext';
import './themes/themeFallback.css';
import './styles.css';
import './themes/themes/modernMinimal.css';
import './themes/themes/festiveVibrant.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AddressProvider>
              <GuestCheckoutProvider>
                <App />
              </GuestCheckoutProvider>
            </AddressProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
