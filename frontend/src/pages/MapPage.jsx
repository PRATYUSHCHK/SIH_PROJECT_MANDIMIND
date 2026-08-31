import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { MarketMap } from '../components/MarketMap.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { useTranslation } from '../i18n/index.jsx';

export default function MapPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    api.get('/map').then((r) => setData(r.data));
  }, []);
  return (
    <div className="space-y-4">
      <PageHeader
        title={t('map.title', 'Market Geographic Map')}
        subtitle={t('map.subtitle', 'Geographic distribution of major mandis, arrival volumes, and logistics routes.')}
        actions={<DataStatusBadge status="SIMULATED" />}
      />
      <MarketMap points={data?.points || []} onSelect={setSelected} />
      {selected && (
        <aside className="rounded-mm border border-line bg-white p-5 dark:bg-night-card">
          <h3 className="text-xl font-bold">{selected.name}</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
            <div>{t('common.price', 'Current')} ₹{selected.currentPriceInr}/kg</div>
            <div>{t('dashboard.priceForecast', 'Predicted')} ₹{selected.predictedPriceInr}/kg</div>
            <div>{t('dashboard.arrivals', 'Arrivals')} {selected.arrivalsKg} kg</div>
            <div>{t('common.quantity', 'Demand')} {selected.demandKg} kg</div>
            <div>{t('dashboard.demandTrend', 'Trend')} {selected.trend}</div>
            <div>{selected.recommendation}</div>
          </div>
        </aside>
      )}
    </div>
  );
}
