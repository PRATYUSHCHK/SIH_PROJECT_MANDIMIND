import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { MarketMap } from '../components/MarketMap.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';

export default function MapPage() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    api.get('/map').then((r) => setData(r.data));
  }, []);
  return (
    <div className="space-y-4">
      <PageHeader title="Regional demand map" subtitle="Click a mandi for intelligence. Colours encode shortage vs oversupply — also labelled in the panel." actions={<DataStatusBadge status="SIMULATED" />} />
      <MarketMap points={data?.points || []} onSelect={setSelected} />
      {selected && (
        <aside className="rounded-mm border border-line bg-white p-5 dark:bg-night-card">
          <h3 className="text-xl font-bold">{selected.name}</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
            <div>Current ₹{selected.currentPriceInr}/kg</div>
            <div>Predicted ₹{selected.predictedPriceInr}/kg</div>
            <div>Arrivals {selected.arrivalsKg} kg</div>
            <div>Demand {selected.demandKg} kg</div>
            <div>Trend {selected.trend}</div>
            <div>{selected.recommendation}</div>
          </div>
        </aside>
      )}
    </div>
  );
}
