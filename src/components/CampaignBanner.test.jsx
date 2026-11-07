import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CampaignBanner from './CampaignBanner';
import { campaigns } from '../campaigns/campaignConfig';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const render = (campaign) => {
  let r;
  act(() => { r = TestRenderer.create(<MemoryRouter><CampaignBanner campaign={campaign} /></MemoryRouter>); });
  return r;
};

describe('CampaignBanner', () => {
  it('renders nothing when no campaign is active (normal homepage)', () => {
    expect(render(null).toJSON()).toBeNull();
  });

  it('renders headline, promo content and an internal CTA link', () => {
    const r = render(campaigns.diwali);
    const json = JSON.stringify(r.toJSON());
    expect(json).toContain(campaigns.diwali.banner.headline);
    expect(json).toContain(campaigns.diwali.promo.message);
    const link = r.root.findByType('a');
    expect(link.props.href).toBe('/category/indian-sweets');
    expect(link.children.filter((c) => typeof c === 'string').join('')).toContain('Shop Diwali sweets');
  });
});
