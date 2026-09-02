import { OpportunityExplorer } from './opportunity-explorer';
import { getOpportunities } from './lib/mercado-publico';

export default async function Home() {
  const feed = await getOpportunities();

  return (
    <OpportunityExplorer
      opportunities={feed.opportunities}
      lastUpdated={feed.lastUpdated}
      dataMode={feed.dataMode}
    />
  );
}
