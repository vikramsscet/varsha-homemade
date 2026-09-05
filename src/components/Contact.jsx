export default function Contact() {
  return (
    <section id="contact" className="contact">
      <div className="container contact-grid">
        <div className="contact-copy reveal">
          <p className="eyebrow light">Let’s celebrate</p>
          <h2>
            Something sweet<br />
            is <i>waiting.</i>
          </h2>
          <p>Tell us what you’re celebrating and we’ll make it deliciously memorable.</p>
          <div className="contact-details">
            <a href="tel:+918103862997">✦ &nbsp; +91 8103862997</a>
            <a href="mailto:sales@varsha-homemade.com">✦ &nbsp; sales@varshahomemade.com</a>
            <p>✦ &nbsp; Open daily, 9:00 AM – 8:00 PM</p>
          </div>
        </div>

        <div className="contact-form contact-whatsapp reveal">
          <p className="eyebrow">Fastest way to order</p>
          <h3>Chat with us on WhatsApp.</h3>
          <p>
            Share your occasion, preferred sweets, quantity, and delivery area—we’ll help you create
            the perfect order.
          </p>
          <a className="button whatsapp-link" href="https://wa.me/c/918319510666" target="_blank" rel="noreferrer">
            Contact us on WhatsApp <span>↗</span>
          </a>
          <small>We usually respond during working hours.</small>
        </div>
      </div>

      <div className="container reveal" style={{ marginTop: '65px', position: 'relative' }}>
        <iframe
          title="Varsha Homemade location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3781.514119299124!2d73.73916657497752!3d18.59593158251227!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bbdbe0512d0b%3A0x173f107138f86989!2sHPWR%2BFC9%20Beverly%20Hills%20Society%2C%20Dange%20Chowk%20Rd%2C%20near%20Orritel%20Hotel%2C%20Bhatewara%20Nagar%20Hinjawadi%2C%20Maharashtra%20411057!5e0!3m2!1sen!2sin!4v1785824826029!5m2!1sen!2sin"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ width: '100%', height: '250px', border: 0, display: 'block', filter: 'saturate(.6) sepia(.1)' }}
        ></iframe>
        <span style={{ position: 'absolute', right: 0, bottom: 0, background: '#3d2b1f', padding: '6px 10px', fontSize: '9px', color: '#dccabc' }}>
          Update this map with your exact business location before publishing.
        </span>
      </div>
    </section>
  );
}
