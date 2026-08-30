import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { AIRecommendationCard } from '../components/AIRecommendationCard.jsx';
import { WhyRecommendationDrawer } from '../components/WhyRecommendationDrawer.jsx';
import { MetricCard } from '../components/MetricCard.jsx';
import { DemandForecastChart, PriceForecastChart } from '../components/charts/ForecastCharts.jsx';
import { InventoryHealth } from '../components/InventoryHealth.jsx';
import { SupplyDemandBalance } from '../components/SupplyDemandBalance.jsx';
import { AlertCard } from '../components/AlertCard.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function SellerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [why, setWhy] = useState(false);
  const [commodity, setCommodity] = useState('tomato');

  async function load() {
    setErr('');
    try {
      const { data: d } = await api.get('/dashboard/seller', { params: { commodity } });
      setData(d);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  }

  useEffect(() => {
    load();
  }, [commodity]);

  if (user?.role === 'farmer') {
    window.location.replace('/farmer');
    return null;
  }
  if (user?.role === 'admin') {
    /* admin can view seller demo */
  }

  if (err && !data) return <ErrorState message={err} onRetry={load} />;
  if (!data) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Seller desk"
        title="What should I do today?"
        subtitle="MandiMind forecasts demand, price and supply, then optimises procurement against spoilage, budget and risk."
        actions={
          <div className="flex items-center gap-2">
            <DataStatusBadge status={data.dataStatus} />
            <select value={commodity} onChange={(e) => setCommodity(e.target.value)} className="rounded-full border border-line px-3 py-2 text-sm dark:bg-night-lift">
              {(data.commodities || []).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        }
      />
      {data.usingSimulatedFallback && (
        <div className="rounded-mm border border-harvest/40 bg-earth px-4 py-2 text-sm">Using simulated data — ML service was unreachable.</div>
      )}
      
      {data.sourceInfo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-earth/40 px-4 py-2 text-xs text-mute dark:border-night-mute/20 dark:bg-night-lift/40">
          <div>
            <span className="font-bold text-ink dark:text-night-text">Data Source:</span> {data.sourceInfo.source}
          </div>
          <div>
            <span className="font-bold text-ink dark:text-night-text">Last Updated:</span> {new Date(data.sourceInfo.lastUpdated).toLocaleTimeString()}
          </div>
          <div className="font-bold text-forest dark:text-harvest">{data.sourceInfo.status}</div>
        </div>
      )}

      <AIRecommendationCard rec={data.recommendation} onWhy={() => setWhy(true)} />

      {data.weatherIntelligence && (
        <section className="rounded-mm border border-line bg-white p-5 dark:border-night-mute/20 dark:bg-night-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-forest-ink dark:text-night-text flex items-center gap-2">
              <span>Weather Intelligence & Market Implications</span>
            </h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase ${
              data.weatherIntelligence.risk === 'HIGH' ? 'bg-warn/20 text-warn' : data.weatherIntelligence.risk === 'MODERATE' ? 'bg-harvest/20 text-harvest' : 'bg-forest/20 text-forest'
            }`}>
              {data.weatherIntelligence.risk} WEATHER RISK
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
              <div className="text-[11px] uppercase text-mute">Temperature</div>
              <div className="mt-0.5 text-2xl font-bold tabular">{data.weatherIntelligence.temperatureC}°C</div>
            </div>
            <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
              <div className="text-[11px] uppercase text-mute">Rainfall</div>
              <div className="mt-0.5 text-2xl font-bold tabular">{data.weatherIntelligence.rainfallMm} mm</div>
            </div>
            <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
              <div className="text-[11px] uppercase text-mute">Humidity</div>
              <div className="mt-0.5 text-2xl font-bold tabular">{data.weatherIntelligence.humidityPct}%</div>
            </div>
          </div>

          <div className="mt-4 border-t border-line/60 pt-3 dark:border-night-mute/30">
            <div className="text-xs font-bold uppercase tracking-wider text-mute">Agricultural & Market Impact</div>
            <ul className="mt-2 space-y-1 text-sm text-ink dark:text-night-text">
              {(data.weatherIntelligence.implications || []).map((imp, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-forest font-bold">→</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Today’s demand" value={`${data.metrics.todayDemandKg}`} suffix="kg" />
        <MetricCard label="Predicted demand" value={`${data.metrics.predictedDemandKg}`} suffix="kg" hint={`${data.metrics.demandRange[0]}–${data.metrics.demandRange[1]} kg`} />
        <MetricCard label="Current price" value={`₹${data.metrics.currentPriceInr}`} suffix="/kg" />
        <MetricCard label="Predicted price" value={`₹${data.metrics.predictedPriceInr}`} suffix="/kg" hint={`${data.metrics.priceRange[0]}–${data.metrics.priceRange[1]}`} />
        <MetricCard label="Inventory value" value={`₹${data.metrics.inventoryValueInr.toLocaleString('en-IN')}`} />
        <MetricCard label="Expected profit" value={`₹${Number(data.metrics.expectedProfitInr).toLocaleString('en-IN')}`} hint="Estimate, not guaranteed" />
      </section>
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-mm border border-line bg-white p-5 dark:border-night-mute/20 dark:bg-night-card lg:col-span-3">
          <h3 className="font-bold">Demand forecast</h3>
          <DemandForecastChart historical={data.demandForecast.historical} forecastSeries={data.demandForecast.forecastSeries} anomalies={data.demandForecast.anomalies} />
        </section>
        <section className="rounded-mm border border-line bg-white p-5 dark:border-night-mute/20 dark:bg-night-card lg:col-span-2">
          <h3 className="font-bold">Price forecast</h3>
          <PriceForecastChart
            historical={data.priceForecast.historical}
            current={data.priceForecast.current}
            expected={data.priceForecast.expected}
            lower={data.priceForecast.lower}
            upper={data.priceForecast.upper}
          />
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-mm border border-line bg-white p-5 dark:bg-night-card">
          <h3 className="mb-3 font-bold">Inventory health</h3>
          <InventoryHealth items={data.inventoryHealth} />
        </section>
        <section className="rounded-mm border border-line bg-white p-5 dark:bg-night-card">
          <h3 className="mb-3 font-bold">Supply–demand balance</h3>
          <SupplyDemandBalance data={data.supplyDemand} />
        </section>
      </div>
      <section>
        <h3 className="mb-3 font-bold">Alerts</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {data.alerts.map((a) => (
            <AlertCard key={a._id} alert={a} />
          ))}
        </div>
      </section>
      <WhyRecommendationDrawer open={why} onClose={() => setWhy(false)} rec={data.recommendation} />
    </div>
  );
}
