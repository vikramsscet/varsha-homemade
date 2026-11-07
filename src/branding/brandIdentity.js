// Asset-free brand data. Safe to import from Node (vite.config.js) as well as the app.
// Contains NO colours or typography: those belong to src/themes.
export const brandIdentity = Object.freeze({
  id: 'varsha-homemade',
  name: 'Varsha Homemade',
  shortName: 'Varsha',
  tagline: 'Homemade with love · Premium quality · Traditional taste',
  description:
    'Varsha Homemade creates premium, freshly handcrafted Indian sweets for celebrations, gifting and festivals.',
  documentTitle: 'Varsha Homemade | Authentic Sweets Crafted with Love',
  foundedYear: 2022,
  // Remote (legacy Wix CDN) until a local copy is approved.
  faviconUrl:
    'https://static.wixstatic.com/media/0abf88_ff43a27f3b684d9e8c7a336d7edb6a04~mv2.png',
  logoAlt: "Varsha's Homemade logo",
  footerNote: 'Made with love in India',

  social: Object.freeze({
    instagram: null,
    facebook: null,
    whatsapp: 'https://wa.me/c/918319510666',
  }),

  contact: Object.freeze({
    phone: '+918103862997',
    phoneDisplay: '+91 8103862997',
    emailSales: 'sales@varshahomemade.com',
    emailInfo: 'info@varshahomemade.com',
    hours: 'Open daily, 9:00 AM – 8:00 PM',
  }),

  urls: Object.freeze({
    storefront: 'https://www.varsha-homemade.com',
  }),
});
