import { useState } from 'react';
import Hero from '../../components/Hero';
import TrustBar from '../../components/TrustBar';
import About from '../../components/About';
import Products from '../../components/Products';
import Festivals from '../../components/Festivals';
import Gallery from '../../components/Gallery';
import Reviews from '../../components/Reviews';
import Faq from '../../components/Faq';
import Contact from '../../components/Contact';
import { heroImage, products, galleryItems, faqItems, reviews, trustItems } from '../../data/siteData';

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <>
      <Hero heroImage={heroImage} />
      <TrustBar items={trustItems} />
      <About />
      <Products products={products} />
      <Festivals festivalImage={heroImage} />
      <Gallery galleryItems={galleryItems} onOpenLightbox={(src, alt) => setSelectedImage({ src, alt })} />
      <Reviews reviews={reviews} />
      <Faq faqItems={faqItems} />
      <Contact />

      {selectedImage && (
        <div className="lightbox open" role="dialog" aria-modal="true" aria-label="Gallery image" onClick={(event) => {
          if (event.target === event.currentTarget) setSelectedImage(null);
        }}>
          <button aria-label="Close preview" onClick={() => setSelectedImage(null)}>×</button>
          <img src={selectedImage.src} alt={selectedImage.alt} />
        </div>
      )}
    </>
  );
}
