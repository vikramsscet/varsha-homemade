import { describe, it, expect } from 'vitest';
import { brandConfig } from './brandConfig';

describe('brandConfig', () => {
  it('exposes core identity', () => {
    expect(brandConfig.id).toBe('varsha-homemade');
    expect(brandConfig.name).toBe('Varsha Homemade');
    expect(brandConfig.tagline).toBeTruthy();
    expect(brandConfig.description).toBeTruthy();
  });

  it('provides primary, light, dark logos and favicon', () => {
    const { primaryLogo, lightLogo, darkLogo, favicon } = brandConfig.assets;
    [primaryLogo, lightLogo, darkLogo, favicon].forEach((a) => expect(a).toBeTruthy());
  });

  it('keeps colours and typography out of the brand config', () => {
    const json = JSON.stringify(brandConfig).toLowerCase();
    ['color', 'colour', 'palette', 'font', 'typography'].forEach((k) => expect(json).not.toContain(k));
  });

  it('is frozen', () => {
    expect(Object.isFrozen(brandConfig)).toBe(true);
    expect(Object.isFrozen(brandConfig.assets)).toBe(true);
  });
});
