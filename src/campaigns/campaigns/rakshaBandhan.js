import { createCampaign } from '../createCampaign';

// Dates are the planned 2027 window; confirm the festival date and adjust each year.
export default createCampaign({
  id: 'raksha-bandhan',
  name: 'Raksha Bandhan',
  description: 'Sweet gifts for brothers and sisters.',
  startDate: '2027-08-03',
  endDate: '2027-08-18',
  enabled: true,
  themeId: null, // keeps whichever theme the customer has chosen
  priority: 10,
  banner: {
    headline: 'Sweet gifts for Raksha Bandhan',
    subheadline: 'Handcrafted sweets to share with the ones you love.',
  },
  promo: {
    title: 'Rakhi gifting',
    message: 'Send something homemade this Raksha Bandhan.',
    highlights: ['Gift-ready packaging', 'Traditional taste'],
  },
  cta: { label: 'Shop Rakhi gifts', to: '/category/indian-sweets' },
});
