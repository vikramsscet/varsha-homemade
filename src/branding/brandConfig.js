// Single source of truth for brand identity (who we are, how to reach us).
// Deliberately contains NO colours or typography: those belong to src/themes.
import { brandIdentity } from './brandIdentity';
import { brandAssets } from './assets';

export const brandConfig = Object.freeze({
  ...brandIdentity,
  assets: Object.freeze({
    primaryLogo: brandAssets.primaryLogo,
    lightLogo: brandAssets.lightLogo,
    darkLogo: brandAssets.darkLogo,
    favicon: brandIdentity.faviconUrl,
    heroImage: brandAssets.heroImage,
    aboutImage: brandAssets.aboutImage,
    logoAlt: brandIdentity.logoAlt,
  }),
});

export default brandConfig;
