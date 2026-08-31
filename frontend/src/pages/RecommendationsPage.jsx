import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { AIRecommendationCard } from '../components/AIRecommendationCard.jsx';
import { WhyRecommendationDrawer } from '../components/WhyRecommendationDrawer.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useTranslation } from '../i18n/index.jsx';

export default function RecommendationsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [why, setWhy] = useState(false);
  useEffect(() => {
    api.get('/dashboard/seller').then((r) => setData(r.data));
  }, []);
  return (
    <div>
      <PageHeader
        title={t('recommendations.title', 'AI Decision Advisory')}
        subtitle={t('recommendations.subtitle', 'Predictive market recommendations optimized for net farmer revenue and risk hedging.')}
      />
      <AIRecommendationCard rec={data?.recommendation} onWhy={() => setWhy(true)} />
      <WhyRecommendationDrawer open={why} onClose={() => setWhy(false)} rec={data?.recommendation} />
    </div>
  );
}
