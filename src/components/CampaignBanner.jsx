import { Link } from 'react-router-dom';
import { useActiveCampaign } from '../campaigns/useActiveCampaign';

// Homepage campaign banner + promotional content. Renders nothing when no campaign is active,
// so the normal homepage returns by itself when a campaign expires. Presentation only: it never
// touches products, prices, cart, checkout or orders.
export default function CampaignBanner({ campaign: campaignProp }) {
  const active = useActiveCampaign();
  const campaign = campaignProp === undefined ? active : campaignProp;
  if (!campaign) return null;

  const { banner, promo, cta } = campaign;
  const hasCta = Boolean(cta.label && cta.to);

  return (
    <section className="campaign-banner" aria-label={campaign.name} data-campaign={campaign.id}>
      <div className="container campaign-grid">
        <div className="campaign-copy">
          <p className="eyebrow">{promo.title || campaign.name}</p>
          <h2>{banner.headline}</h2>
          {banner.subheadline && <p className="campaign-sub">{banner.subheadline}</p>}
          {promo.message && <p>{promo.message}</p>}
          {promo.highlights.length > 0 && (
            <ul className="campaign-highlights">
              {promo.highlights.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {hasCta && (cta.external
            ? <a className="button" href={cta.to} target="_blank" rel="noreferrer">{cta.label} <span>↗</span></a>
            : <Link className="button" to={cta.to}>{cta.label} <span>→</span></Link>)}
          {promo.terms && <small className="campaign-terms">{promo.terms}</small>}
        </div>
        {banner.image && (
          <div className="campaign-image">
            <img src={banner.image} alt={banner.imageAlt} loading="lazy" />
          </div>
        )}
      </div>
    </section>
  );
}
