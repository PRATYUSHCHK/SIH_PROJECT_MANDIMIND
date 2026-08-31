import { useState } from 'react';
import { api } from '../services/api.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { RiskBadge } from '../components/RiskBadge.jsx';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator.jsx';
import { useTranslation } from '../i18n/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function FarmerPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    location: 'Nalgonda',
    landSizeAcres: 3.5,
    soilType: 'red loam',
    irrigation: 'drip',
    budgetInr: 90000,
    season: 'kharif',
    preferredCrops: ['tomato', 'chilli'],
  });
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  async function rank(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/farmer/rank', form);
      setResult(data);
      setErr('');
    } catch (e) {
      setErr(e.response?.data?.error || 'Farmer ranking needs the ML service.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('farmer.title', 'Farmer Mode & Crop Planner')}
        subtitle={t('farmer.subtitle', 'Personalized crop advisory, sowing schedule, and direct buyer demand matching.')}
      />
      <form onSubmit={rank} className="grid gap-3 rounded-mm border border-line bg-white p-5 dark:bg-night-card md:grid-cols-2">
        {['location', 'soilType', 'season'].map((k) => (
          <label key={k} className="text-sm">
            {k}
            <input className="mt-1 w-full rounded-xl border border-line px-3 py-2 dark:bg-night-lift" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </label>
        ))}
        <label className="text-sm">
          Land size (acres)
          <input type="number" className="mt-1 w-full rounded-xl border border-line px-3 py-2" value={form.landSizeAcres} onChange={(e) => setForm({ ...form, landSizeAcres: Number(e.target.value) })} />
        </label>
        <label className="text-sm">
          Irrigation
          <select className="mt-1 w-full rounded-xl border border-line px-3 py-2" value={form.irrigation} onChange={(e) => setForm({ ...form, irrigation: e.target.value })}>
            <option value="drip">Drip</option>
            <option value="canal">Canal</option>
            <option value="borewell">Borewell</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="text-sm">
          Budget
          <input type="number" className="mt-1 w-full rounded-xl border border-line px-3 py-2" value={form.budgetInr} onChange={(e) => setForm({ ...form, budgetInr: Number(e.target.value) })} />
        </label>
        <button className="md:col-span-2 rounded-full bg-forest py-2.5 font-semibold text-white">Generate crop ranking</button>
      </form>
      {err && <p className="text-sm text-alert">{err}</p>}
      {result && (
        <div className="space-y-3">
          <p className="text-sm text-mute">{result.disclaimer}</p>
          {result.rankings?.map((r, i) => (
            <article key={r.crop} className="rounded-mm border border-line bg-white p-5 dark:bg-night-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-mute">#{i + 1}</div>
                  <h3 className="text-xl font-bold">{r.crop}</h3>
                  <p className="text-sm text-mute">{r.why}</p>
                </div>
                <RiskBadge risk={r.risk} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-[11px] uppercase text-mute">{t('dashboard.expectedNetProfit', 'Estimated Return')}</div>
                  <div className="tabular text-2xl font-bold">₹{r.estimatedReturnInr.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-mute">{t('transactions.transportCost', 'Expected cost')}</div>
                  <div className="tabular text-xl font-bold">₹{r.expectedCostInr.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase text-mute">{t('common.revenue', 'Expected revenue')}</div>
                  <div className="tabular text-xl font-bold">₹{r.expectedRevenueInr.toLocaleString('en-IN')}</div>
                </div>
                <ConfidenceIndicator value={r.confidence} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
