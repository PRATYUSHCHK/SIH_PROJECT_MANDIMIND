import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { MarketMap } from '../components/MarketMap.jsx';
import { AlertCard } from '../components/AlertCard.jsx';

export default function AdminPage() {
  const [overview, setOverview] = useState(null);
  const [map, setMap] = useState(null);
  useEffect(() => {
    api.get('/admin/overview').then((r) => setOverview(r.data));
    api.get('/map').then((r) => setMap(r.data));
  }, []);
  return (
    <div className="space-y-6">
      <PageHeader title="Agricultural intelligence" subtitle="Regional picture, anomalies and model health." />
      <div className="rounded-mm border border-line bg-white p-4 dark:bg-night-card">
        Model health: <strong>{overview?.modelHealth?.label}</strong>
      </div>
      <MarketMap points={map?.points || []} />
      <div className="grid gap-3 md:grid-cols-2">
        {(overview?.alerts || []).map((a) => (
          <AlertCard key={a._id} alert={a} />
        ))}
      </div>
    </div>
  );
}
