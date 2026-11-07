import { describe, expect, it } from 'vitest';
import { campaignIds, campaigns, getActiveCampaign, getActiveCampaigns, getCampaign, isCampaignActive, toDateKey } from './campaignConfig';
import { createCampaign } from './createCampaign';
import { isValidThemeId } from '../themes/themeConfig';

describe('campaign registry', () => {
  it('registers diwali, holi and raksha-bandhan with unique ids', () => {
    expect(campaignIds).toEqual(['diwali', 'holi', 'raksha-bandhan']);
    expect(new Set(campaignIds).size).toBe(campaignIds.length);
  });

  it('every campaign has the required fields and a usable CTA', () => {
    for (const c of Object.values(campaigns)) {
      expect(c.name && c.description && c.startDate && c.endDate, c.id).toBeTruthy();
      expect(typeof c.enabled).toBe('boolean');
      expect(c.banner.headline, c.id).toBeTruthy();
      expect(c.cta.label && c.cta.to, c.id).toBeTruthy();
    }
  });

  it('theme references are null or point at an existing theme', () => {
    for (const c of Object.values(campaigns)) {
      if (c.themeId !== null) expect(isValidThemeId(c.themeId), c.id).toBe(true);
    }
  });

  it('contains no brand identity or colour/theme definitions', () => {
    const json = JSON.stringify(campaigns).toLowerCase();
    ['logo', 'varsha', 'palette', 'colors', 'typography', 'fontweights', '#'].forEach((k) => expect(json).not.toContain(k));
  });

  it('is frozen', () => {
    expect(Object.isFrozen(campaigns)).toBe(true);
    expect(Object.isFrozen(campaigns.diwali)).toBe(true);
  });
});

describe('scheduling', () => {
  it('start and end dates are inclusive', () => {
    expect(isCampaignActive(campaigns.diwali, new Date('2026-11-01T00:30:00+05:30'))).toBe(true);
    expect(isCampaignActive(campaigns.diwali, new Date('2026-11-15T23:59:00+05:30'))).toBe(true);
    expect(isCampaignActive(campaigns.diwali, new Date('2026-10-31T23:59:00+05:30'))).toBe(false);
    expect(isCampaignActive(campaigns.diwali, new Date('2026-11-16T00:00:00+05:30'))).toBe(false);
  });

  it('returns the active campaign, or null outside every window', () => {
    expect(getActiveCampaign(new Date('2026-11-08T12:00:00+05:30')).id).toBe('diwali');
    expect(getActiveCampaign(new Date('2026-06-01T12:00:00+05:30'))).toBeNull();
  });

  it('a disabled campaign is never active', () => {
    const off = createCampaign({ ...campaigns.diwali, id: 'off', enabled: false });
    expect(isCampaignActive(off, new Date('2026-11-08T12:00:00+05:30'))).toBe(false);
  });

  it('orders overlapping campaigns by priority', () => {
    expect(getActiveCampaigns(new Date('2026-11-08T12:00:00+05:30')).map((c) => c.id)).toEqual(['diwali']);
  });

  it('looks up by id and rejects unknown ids', () => {
    expect(getCampaign('holi').name).toBe('Holi');
    expect(getCampaign('nope')).toBeNull();
    expect(getCampaign('__proto__')).toBeNull();
  });
});

describe('timezone', () => {
  it('uses the business timezone, not the viewer\'s: 18:30Z on Oct 31 is already Nov 1 in IST', () => {
    expect(toDateKey(new Date('2026-10-31T18:30:00Z'))).toBe('2026-11-01');
    expect(isCampaignActive(campaigns.diwali, new Date('2026-10-31T18:30:00Z'))).toBe(true);
    expect(isCampaignActive(campaigns.diwali, new Date('2026-10-31T18:29:00Z'))).toBe(false);
    expect(isCampaignActive(campaigns.diwali, new Date('2026-11-15T18:29:00Z'))).toBe(true);
    expect(isCampaignActive(campaigns.diwali, new Date('2026-11-15T18:30:00Z'))).toBe(false);
  });
});

describe('createCampaign validation', () => {
  const base = { id: 'x', name: 'X', startDate: '2026-01-01', endDate: '2026-01-02' };
  it('rejects bad dates, reversed ranges and missing ids', () => {
    expect(() => createCampaign({ ...base, startDate: '1/1/26' })).toThrow();
    expect(() => createCampaign({ ...base, endDate: '2025-12-31' })).toThrow();
    expect(() => createCampaign({ ...base, id: '' })).toThrow();
  });
});
