import besanLadoo from '../../assets/BesanLadoo.jpg';
import ragiLadoo from '../../assets/RagiLadoo.png';
import dryFruitLadoo from '../../assets/Dryfruit.png';
import coconutLadoo from '../../assets/Coconut.jpg';
import premiumSweets from '../../assets/varsha-sweets-premium.png';
import logo from '../../assets/header-logo.png';
import galleryOne from '../../assets/varsha-sweets-premium.png';
import galleryTwo from '../../assets/RagiLadoo.png';
import galleryThree from '../../assets/Coconut.jpg';
import galleryFour from '../../assets/Dryfruit.png';
import galleryFive from '../../assets/BesanLadoo.jpg';
import gallerySix from '../../assets/Coconut.jpg';
import gallerySeven from '../../assets/varsha-sweets-premium.png';
import galleryEight from '../../assets/RagiLadoo.png';

export const heroImage = premiumSweets;
export const logoImage = logo;

export const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Our Sweets', href: '#sweets' },
  { label: 'Festive Gifting', href: '#festivals' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Contact', href: '#contact' },
];

export const trustItems = [
  'Pure ingredients',
  'Traditional family recipes',
  'Made fresh for you',
  'Beautifully gift-ready',
];

export const products = [
  {
    title: 'Besan Ladoo',
    image: besanLadoo,
    badge: 'Classic',
    description: 'Slow-roasted gram flour, ghee, and a whisper of cardamom.',
    href: 'https://www.varsha-homemade.com/product-page/besan-ladoo',
    longDescription: `Traditional Besan Ladoo (500g)

✨ Rich, melt-in-the-mouth Besan Ladoos made with pure desi ghee and premium gram flour.

✅ Homemade

✅ No Preservatives

✅ Premium Dry Fruits

✅ Freshly Prepared

📦 Pack Size: 500g`
  },
  {
    title: 'Ragi Ladoo',
    image: ragiLadoo,
    badge: 'Celebration',
    description: 'Delicate pearls of joy, made for the most special moments.',
    href: 'https://www.varsha-homemade.com/product-page/ragi-ladoo',
    longDescription:`Healthy Ragi Ladoo (250g)

Nutritious finger millet ladoos packed with natural goodness and pure ghee.

💚 Rich in Calcium

💚 High Fiber

💚 No Artificial Ingredients

📦 Pack Size: 250g`
  },
  {
    title: 'Dry Fruit Ladoo',
    image: dryFruitLadoo,
    badge: 'Wholesome',
    description: 'Nutty, naturally sweet, and packed with premium dry fruits.',
    href: 'https://www.varsha-homemade.com/product-page/premium-dry-fruit-ladoo',
    longDescription:`Dry Fruit Ladoo (500g)

A luxurious blend of almonds, cashews, pistachios, dates, raisins & seeds.

⭐ Premium Ingredients

⭐ No Added Sugar

⭐ Energy Booster

📦 Pack Size: 500g`
  },
  {
    title: 'Coconut Ladoo',
    image: coconutLadoo,
    badge: 'House favourite',
    description: 'Rich, melt-in-your-mouth squares with a touch of gold.',
    href: 'https://www.varsha-homemade.com/product-page/coconut-ladoo',
    longDescription:`Fresh Coconut Ladoo (500g)

Soft, delicious coconut ladoos made from freshly grated coconut and premium ingredients.

❤️ Freshly Homemade

❤️ Rich Coconut Flavor

❤️ Festival Favourite

📦 Pack Size: 500g`
  },
];

export const galleryItems = [
  { src: galleryOne, alt: 'Festive Indian sweets', caption: 'Freshly made', full: galleryOne, tall: true },
  { src: galleryTwo, alt: 'Ladoo arrangement', caption: 'Little golden joys', full: galleryTwo },
  { src: galleryThree, alt: 'Traditional barfi', caption: 'Tradition on a plate', full: galleryThree },
  { src: galleryFour, alt: 'Dry fruit sweets', caption: 'Premium ingredients', full: galleryFour, wide: true },
  { src: galleryFive, alt: 'Festive Indian sweets', caption: 'Freshly made', full: galleryFive, wide: true },
  { src: gallerySix, alt: 'Coconut ladoo', caption: 'House favourite', full: gallerySix, tall: true },
  { src: gallerySeven, alt: 'Dry fruit ladoo', caption: 'Wholesome', full: gallerySeven },
  { src: galleryEight, alt: 'Ragi ladoo', caption: 'Celebration', full: galleryEight },
];

export const faqItems = [
  { question: 'What ingredients do you use?', answer: 'We use carefully selected premium ingredients including pure ghee, fresh nuts, quality dry fruits, and traditional spices.' },
  { question: 'Are all sweets homemade?', answer: 'Yes. Every sweet is handcrafted in small batches in our hygienic home kitchen.' },
  { question: 'How long do the sweets stay fresh?', answer: 'Freshness varies by sweet. We’ll share the best-before guidance with every order.' },
  { question: 'Do you take bulk or corporate orders?', answer: 'Absolutely. Contact us early so we can help design a memorable gifting experience.' },
  { question: 'Can I customize gift hampers?', answer: 'Yes—choose your sweets, quantities and packaging for a box that feels truly yours.' },
  { question: 'Do you provide home delivery?', answer: 'Delivery availability depends on your location. Please message us with your area and order details.' },
];

export const reviews = [
  {
    name: 'Aditi S.',
    initials: 'AS',
    text: 'The laddoos tasted exactly like homemade sweets from our childhood.',
  },
  {
    name: 'Rahul P.',
    initials: 'RP',
    text: 'Beautiful packaging and even better flavour. It felt personal and premium.',
  },
  {
    name: 'Neha M.',
    initials: 'NM',
    text: 'Perfect for gifting. Our guests loved the freshness and rich taste.',
  },
];
