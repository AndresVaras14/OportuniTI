import { OpportunityExplorer } from './opportunity-explorer';
import { getOpportunities } from './lib/mercado-publico';
import { monitoredSources } from './opportunities';

export default async function Home() {
  const feed = await getOpportunities();

  return (
    <OpportunityExplorer
      opportunities={feed.opportunities}
      sources={monitoredSources}
      lastUpdated={feed.lastUpdated}
      dataMode={feed.dataMode}
    />
  );
}
