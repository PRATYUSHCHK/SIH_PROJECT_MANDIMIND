import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { DemandForecastChart, PriceForecastChart } from '../components/charts/ForecastCharts.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useTranslation } from '../i18n/index.jsx';

export default function ForecastsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/dashboard/seller').then((r) => setData(r.data));
  }, []);
  if (!data) return null;
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('forecasts.title', 'Price Forecasts')}
        subtitle={t('forecasts.subtitle', 'Short and medium-term price projections with 95% confidence intervals.')}
      />
      <DemandForecastChart historical={data.demandForecast.historical} forecastSeries={data.demandForecast.forecastSeries} />
      <PriceForecastChart historical={data.priceForecast.historical} current={data.priceForecast.current} expected={data.priceForecast.expected} lower={data.priceForecast.lower} upper={data.priceForecast.upper} />
    </div>
  );
}
