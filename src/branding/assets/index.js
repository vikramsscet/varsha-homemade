// Brand asset registry. Re-exports files that already live in /assets (no copies),
// so there is exactly one source file per asset. To add or swap an asset, import it here.
import headerLogo from '../../../assets/header-logo.png';
import heroImage from '../../../assets/varsha-sweets-premium.png';

// Remote assets still hosted on the legacy Wix CDN. Localise them in a later phase.
const WIX_FAVICON =
  'https://static.wixstatic.com/media/0abf88_ff43a27f3b684d9e8c7a336d7edb6a04~mv2.png';
const WIX_ABOUT_IMAGE =
  'https://static.wixstatic.com/media/0abf88_c9852b0463fa4143b66d89e2566231d3~mv2.png';

export const brandAssets = {
  primaryLogo: headerLogo,
  // Only one logo exists today. Light/dark point at it until dedicated variants are supplied.
  lightLogo: headerLogo,
  darkLogo: headerLogo,
  favicon: WIX_FAVICON,
  heroImage,
  aboutImage: WIX_ABOUT_IMAGE,
};
