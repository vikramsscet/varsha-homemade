import { createCampaign } from '../createCampaign';

// Dates are the planned 2026 window; confirm the festival date and adjust each year.
export default createCampaign({
  id: 'diwali',
  name: 'Diwali',
  description: 'Festive sweets and gift boxes for Diwali.',
  startDate: '2026-11-01',
  endDate: '2026-11-15',
  enabled: true,
  themeId: 'festive-vibrant',
  priority: 10,
  banner: {
    headline: 'Celebrate Diwali with handcrafted sweets',
    subheadline: 'Freshly made gift boxes for the festival of lights.',
  },
  promo: {
    title: 'Diwali gifting',
    message: 'Order early for festive hampers made fresh to order.',
    highlights: ['Gift-ready packaging', 'Made fresh to order'],
  },
  cta: { label: 'Shop Diwali sweets', to: '/category/indian-sweets' },
});
