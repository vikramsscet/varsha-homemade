// Decides which theme (if any) an active campaign contributes. A campaign only SUGGESTS a theme.
import { isValidThemeId } from '../themes/themeConfig';
import { campaignSettings } from './campaignConfig';

/**
 * Returns { themeId, force } for the campaign, or null when it contributes no theme.
 * - suggestion (force=false): used only when the customer has no saved theme choice.
 * - override (force=true): only when campaignSettings.themeOverride is on.
 */
export function getCampaignThemeSuggestion(campaign, settings = campaignSettings) {
  const themeId = campaign?.themeId;
  if (!themeId || !isValidThemeId(themeId)) return null;
  return { themeId, force: settings.themeOverride === true };
}
