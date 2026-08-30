import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { DemandForecastChart, PriceForecastChart } from '../components/charts/ForecastCharts.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export default function ForecastsPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/dashboard/seller').then((r) => setData(r.data));
  }, []);
  if (!data) return null;
  return (
    <div className="space-y-6">
      <PageHeader title="Forecasts" subtitle="Demand, price and supply with intervals. Never a single deterministic number." />
      <DemandForecastChart historical={data.demandForecast.historical} forecastSeries={data.demandForecast.forecastSeries} />
      <PriceForecastChart historical={data.priceForecast.historical} current={data.priceForecast.current} expected={data.priceForecast.expected} lower={data.priceForecast.lower} upper={data.priceForecast.upper} />
    </div>
  );
}
