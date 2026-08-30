import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { AIRecommendationCard } from '../components/AIRecommendationCard.jsx';
import { WhyRecommendationDrawer } from '../components/WhyRecommendationDrawer.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export default function RecommendationsPage() {
  const [data, setData] = useState(null);
  const [why, setWhy] = useState(false);
  useEffect(() => {
    api.get('/dashboard/seller').then((r) => setData(r.data));
  }, []);
  return (
    <div>
      <PageHeader title="Recommendations" subtitle="Optimisation layer on top of ML forecasts." />
      <AIRecommendationCard rec={data?.recommendation} onWhy={() => setWhy(true)} />
      <WhyRecommendationDrawer open={why} onClose={() => setWhy(false)} rec={data?.recommendation} />
    </div>
  );
}
