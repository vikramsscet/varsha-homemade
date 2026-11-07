import { brandConfig } from '../branding/brandConfig';

export default function Footer() {
  return (
    <footer>
      <div className="container footer-top">
        <a className="brand header-brand" href="#home" aria-label={`${brandConfig.name} home`}>
          <img src={brandConfig.assets.primaryLogo} alt={brandConfig.assets.logoAlt} />
        </a>
        <p>{brandConfig.tagline}</p>
        <div className="socials">
          <a href="#contact" aria-label="Instagram">ig</a>
          <a href="#contact" aria-label="Facebook">f</a>
          <a href={`mailto:${brandConfig.contact.emailInfo}`} aria-label="Email">@</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 {brandConfig.name}. All Rights Reserved.</span>
        <span>{brandConfig.footerNote}</span>
      </div>
    </footer>
  );
}
