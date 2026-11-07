import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { getActiveCampaign } from './campaigns/campaignConfig';
import { getCampaignThemeSuggestion } from './campaigns/campaignTheme';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AddressProvider } from './context/AddressContext';
import { GuestCheckoutProvider } from './context/GuestCheckoutContext';
import './themes/themeFallback.css';
import './styles.css';
import './themes/themes/modernMinimal.css';
import './themes/themes/festiveVibrant.css';

// Resolved once at startup: a campaign may suggest a theme, but never overrides a saved choice.
const themeSuggestion = getCampaignThemeSuggestion(getActiveCampaign());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider suggestion={themeSuggestion}>
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
