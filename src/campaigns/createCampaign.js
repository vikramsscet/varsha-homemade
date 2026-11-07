// Normalises and validates one campaign definition so every campaign has the same shape.
// Campaigns are content/scheduling only: no brand identity, no colours, no theme definitions.
// `themeId` is an optional *reference* to an existing theme id (validated in tests, not here,
// so this module stays independent of the theme engine).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function createCampaign(input) {
  const {
    id,
    name,
    description = '',
    startDate,
    endDate,
    enabled = true,
    themeId = null,
    priority = 0,
    banner = {},
    promo = {},
    cta = {},
    assets = {},
  } = input ?? {};

  if (!id || typeof id !== 'string') throw new Error('Campaign requires a string id');
  if (!name) throw new Error(`Campaign "${id}" requires a name`);
  if (!DATE_RE.test(startDate ?? '') || !DATE_RE.test(endDate ?? '')) {
    throw new Error(`Campaign "${id}" requires startDate/endDate as YYYY-MM-DD`);
  }
  if (endDate < startDate) throw new Error(`Campaign "${id}" ends before it starts`);

  return Object.freeze({
    id,
    name,
    description,
    startDate, // inclusive, local calendar date
    endDate, // inclusive, local calendar date
    enabled: enabled === true,
    themeId, // optional reference to an existing theme id; never applied automatically
    priority, // higher wins when several campaigns overlap
    banner: Object.freeze({ headline: '', subheadline: '', image: null, imageAlt: '', ...banner }),
    promo: Object.freeze({ title: '', message: '', highlights: [], terms: '', ...promo }),
    cta: Object.freeze({ label: '', to: '', external: false, ...cta }),
    assets: Object.freeze({ ...assets }), // optional campaign-only images, keyed by purpose
  });
}
