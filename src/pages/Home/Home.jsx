import { useEffect, useState } from 'react';
import Hero from '../../components/Hero';
import TrustBar from '../../components/TrustBar';
import About from '../../components/About';
import Products from '../../components/Products';
import Festivals from '../../components/Festivals';
import Gallery from '../../components/Gallery';
import Reviews from '../../components/Reviews';
import Faq from '../../components/Faq';
import Contact from '../../components/Contact';
import { heroImage, faqItems, reviews, trustItems } from '../../data/siteData';

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGallery() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/products?page=1&limit=20&isAvailable=true&isPublished=true&onlyImages=true`,
          { headers: { accept: '*/*' }, signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Gallery request failed (${response.status})`);
        }

        const result = await response.json();
        const items = (result.data ?? []).flatMap((product) =>
          (product.images ?? []).map((image) => ({
            src: image.url,
            alt: image.altText || product.title,
            caption: product.title,
            full: image.url,
            tall: image.tall,
            wide: image.wide,
          }))
        );

        if (!controller.signal.aborted) {
          setGalleryItems(items);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load gallery images', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setGalleryLoading(false);
        }
      }
    }

    loadGallery();
    return () => controller.abort();
  }, []);

  return (
    <>
      <Hero heroImage={heroImage} />
      <TrustBar items={trustItems} />
      <About />
      <Products />
      <Festivals festivalImage={heroImage} />
      {galleryLoading && <p role="status">Loading gallery...</p>}
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
