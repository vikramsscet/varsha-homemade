import { describe, expect, it } from 'vitest';
import { getCampaignThemeSuggestion } from './campaignTheme';
import { campaigns } from './campaignConfig';

describe('getCampaignThemeSuggestion', () => {
  it('suggests (not forces) the campaign theme by default', () => {
    expect(getCampaignThemeSuggestion(campaigns.diwali)).toEqual({ themeId: 'festive-vibrant', force: false });
  });
  it('forces only when the business override is switched on', () => {
    expect(getCampaignThemeSuggestion(campaigns.diwali, { themeOverride: true }).force).toBe(true);
  });
  it('returns null with no campaign, no theme, or an unknown theme', () => {
    expect(getCampaignThemeSuggestion(null)).toBeNull();
    expect(getCampaignThemeSuggestion(campaigns['raksha-bandhan'])).toBeNull();
    expect(getCampaignThemeSuggestion({ themeId: 'nope' })).toBeNull();
  });
});
