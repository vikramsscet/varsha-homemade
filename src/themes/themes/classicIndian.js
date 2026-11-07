import { createTheme } from './createTheme';

// Mirrors the site's current look, so it is a no-op visually.
export default createTheme({
  id: 'classic-indian',
  label: 'Classic Indian',
  description: 'Warm maroon and gold on cream.',
  colors: {
    primary: '#7A1F2B',
    primaryHover: '#3D2B1F',
    secondary: '#C9A227',
    accent: '#C9A227',
    background: '#FFF8F0',
    backgroundAlt: '#F7ECDF',
    surface: '#FFFFFF',
    onPrimary: '#FFFFFF',
    text: '#3D2B1F',
    mutedText: '#806E60',
    border: '#EADFD3',
    success: '#1E6B34',
    warning: '#B26A00',
    error: '#B3261E',
    secondaryLight: '#F0C75A',
    onDark: '#F4E8DC',
    onDarkMuted: '#BBA99B',
    successBackground: '#E6F4EA',
    warningBackground: '#FFF4E0',
    errorBackground: '#FDECEA',
  },
  design: {
    // Match the storefront's existing global radii and shadows exactly.
    cardRadius: '5px',
    panelRadius: '16px',
    actionButtonRadius: '999px',
    buttonRadius: '4px',
    inputRadius: '2px',
    shadows: {
      sm: '0 5px 18px rgba(61, 43, 31, 0.094)',
      md: '0 8px 28px rgba(61, 43, 31, 0.043)',
      lg: '0 14px 30px rgba(61, 43, 31, 0.125)',
    },
  },
});
