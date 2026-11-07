import { createTheme } from './createTheme';

export default createTheme({
  id: 'modern-minimal',
  label: 'Modern Minimal',
  description: 'Clean terracotta and sage on soft white.',
  colors: {
    // Deepened from the brand terracotta #C46A45 (3.8:1 on white) so white button text and primary
    // text pass WCAG AA (5.1:1). The brand terracotta lives on as the decorative accent.
    primary: '#AE5535',
    primaryHover: '#8F4226',
    secondary: '#87977B',
    accent: '#C46A45',
    background: '#FAF9F6',
    backgroundAlt: '#F2EFE9',
    surface: '#FFFFFF',
    onPrimary: '#FFFFFF',
    text: '#292929',
    mutedText: '#6B6B6B',
    border: '#E8E6E1',
    success: '#2F6B3F',
    warning: '#B7791F',
    error: '#B3382C',
    secondaryLight: '#C5CFBC',
    onDark: '#F2EFE9',
    onDarkMuted: '#B5B2AB',
    successBackground: '#E7F1E9',
    warningBackground: '#FBF1DE',
    errorBackground: '#FBEAE7',
  },
  typography: {
    headingFont: "'DM Sans', sans-serif",
    fontWeights: { semibold: 600, bold: 600 },
  },
  design: {
    cardRadius: '8px',
    panelRadius: '12px',
    actionButtonRadius: '6px',
    buttonRadius: '6px',
    inputRadius: '6px',
    spacing: '20px',
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
      md: '0 4px 14px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 28px rgba(0, 0, 0, 0.08)',
    },
  },
});
