import { createCampaign } from '../createCampaign';

// Dates are the planned 2027 window; confirm the festival date and adjust each year.
export default createCampaign({
  id: 'holi',
  name: 'Holi',
  description: 'Sweets for sharing at Holi.',
  startDate: '2027-03-08',
  endDate: '2027-03-23',
  enabled: true,
  themeId: 'festive-vibrant',
  priority: 10,
  banner: {
    headline: 'Sweeten your Holi',
    subheadline: 'Traditional treats, made fresh for the celebration.',
  },
  promo: {
    title: 'Holi specials',
    message: 'Share the joy of Holi with homemade sweets.',
    highlights: ['Traditional recipes', 'Made fresh to order'],
  },
  cta: { label: 'Shop Holi sweets', to: '/category/indian-sweets' },
});
