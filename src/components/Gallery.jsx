export default function Gallery({ galleryItems, onOpenLightbox }) {
  return (
    <section id="gallery" className="section gallery">
      <div className="container">
        <div className="section-heading reveal">
          <p className="eyebrow">A glimpse from our kitchen</p>
          <h2>
            Made to savour. <i>Meant</i> to share.
          </h2>
        </div>

        <div className="gallery-grid reveal">
          {galleryItems.slice(0, 4).map((item) => (
            <button
              key={`${item.alt}-${item.caption}`}
              type="button"
              className={`gallery-item ${item.tall ? 'tall' : ''} ${item.wide ? 'wide' : ''}`}
              onClick={() => onOpenLightbox(item.full, item.alt)}
            >
              <img src={item.src} loading="lazy" alt={item.alt} />
              <span>{item.caption}</span>
            </button>
          ))}
        </div>

        <div className="gallery-grid reveal">
          {galleryItems.slice(4).map((item) => (
            <button
              key={`${item.alt}-${item.caption}`}
              type="button"
              className={`gallery-item ${item.tall ? 'tall' : ''} ${item.wide ? 'wide' : ''}`}
              onClick={() => onOpenLightbox(item.full, item.alt)}
            >
              <img src={item.src} loading="lazy" alt={item.alt} />
              <span>{item.caption}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
