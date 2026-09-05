export default function Footer({ logo }) {
  return (
    <footer>
      <div className="container footer-top">
        <a className="brand header-brand" href="#home" aria-label="Varsha Homemade home">
          <img src={logo} alt="Varsha's Homemade logo" />
        </a>
        <p>Homemade with love · Premium quality · Traditional taste</p>
        <div className="socials">
          <a href="#contact" aria-label="Instagram">ig</a>
          <a href="#contact" aria-label="Facebook">f</a>
          <a href="mailto:info@varshahomemade.com" aria-label="Email">@</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Varsha Homemade. All Rights Reserved.</span>
        <span>Made with love in India</span>
      </div>
    </footer>
  );
}
