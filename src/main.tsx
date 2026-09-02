import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OpportunityExplorer } from '../app/opportunity-explorer';
import { verifiedOpportunities, type Opportunity } from '../app/opportunities';
import '../app/globals.css';

type StaticFeed = {
  opportunities?: Opportunity[];
  lastUpdated?: string;
};

const initialUpdate = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Santiago',
}).format(new Date());

function App() {
  const [feed, setFeed] = useState<{
    opportunities: Opportunity[];
    lastUpdated: string;
    dataMode: 'live' | 'verified';
  }>({
    opportunities: verifiedOpportunities,
    lastUpdated: initialUpdate,
    dataMode: 'verified',
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadGeneratedFeed() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}live-opportunities.json`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = (await response.json()) as StaticFeed;
        const live = Array.isArray(payload.opportunities) ? payload.opportunities : [];
        const merged = [...live, ...verifiedOpportunities].filter(
          (item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index,
        );

        setFeed({
          opportunities: merged,
          lastUpdated: payload.lastUpdated || initialUpdate,
          dataMode: live.length > 0 ? 'live' : 'verified',
        });
      } catch {
        // The verified data already rendered remains available.
      }
    }

    void loadGeneratedFeed();
    return () => controller.abort();
  }, []);

  return <OpportunityExplorer {...feed} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
