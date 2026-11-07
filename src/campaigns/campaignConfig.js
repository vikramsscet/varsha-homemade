// Central campaign registry. To add a campaign (e.g. Christmas, New Year): create
// campaigns/<name>.js with createCampaign(...) and append it to CAMPAIGN_LIST. Nothing else changes.
// Static configuration only: no backend, no product or pricing data.
import diwali from './campaigns/diwali';
import holi from './campaigns/holi';
import rakshaBandhan from './campaigns/rakshaBandhan';

const CAMPAIGN_LIST = [diwali, holi, rakshaBandhan];

export const campaigns = Object.freeze(Object.fromEntries(CAMPAIGN_LIST.map((c) => [c.id, c])));
export const campaignIds = Object.freeze(CAMPAIGN_LIST.map((c) => c.id));

export function getCampaign(id) {
  return Object.prototype.hasOwnProperty.call(campaigns, id) ? campaigns[id] : null;
}

// Campaign dates are business calendar days in ONE fixed timezone, not the visitor's, so every
// customer sees a campaign start and end at the same moment.
export const CAMPAIGN_TIMEZONE = 'Asia/Kolkata';

// Business-level switches. `themeOverride: true` makes an active campaign's theme win over a
// customer's saved choice (e.g. a mandated sale look). Off by default: customers keep their choice.
export const campaignSettings = Object.freeze({ themeOverride: false });

const dateKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAMPAIGN_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD for the instant, in the campaign timezone. */
export function toDateKey(date) {
  return dateKeyFormat.format(date instanceof Date ? date : new Date(date));
}

export function isCampaignActive(campaign, now = new Date()) {
  if (!campaign?.enabled) return false;
  const key = toDateKey(now);
  return key >= campaign.startDate && key <= campaign.endDate;
}

/** Active campaigns, highest priority first (ties keep registry order). */
export function getActiveCampaigns(now = new Date()) {
  return CAMPAIGN_LIST.filter((c) => isCampaignActive(c, now)).sort((a, b) => b.priority - a.priority);
}

export function getActiveCampaign(now = new Date()) {
  return getActiveCampaigns(now)[0] ?? null;
}
