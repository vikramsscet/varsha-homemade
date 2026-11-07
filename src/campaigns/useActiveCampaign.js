import { useEffect, useState } from 'react';
import { getActiveCampaign } from './campaignConfig';

const CHECK_INTERVAL_MS = 60 * 1000;

// Re-evaluates the schedule while the page is open, so a campaign appears/disappears at its
// boundary without a reload. State only changes when the active campaign's id changes.
export function useActiveCampaign() {
  const [campaign, setCampaign] = useState(() => getActiveCampaign());

  useEffect(() => {
    const check = () => {
      const next = getActiveCampaign();
      setCampaign((prev) => (prev?.id === next?.id ? prev : next));
    };
    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return campaign;
}
