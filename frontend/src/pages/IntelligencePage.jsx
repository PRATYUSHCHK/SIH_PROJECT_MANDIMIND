import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { MarketComparisonTable } from '../components/MarketComparisonTable.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function IntelligencePage() {
  const [compare, setCompare] = useState(null);
  const [curve, setCurve] = useState(null);
  const [price, setPrice] = useState(30);

  useEffect(() => {
    api.get('/markets/compare').then((r) => setCompare(r.data));
    api.get('/elasticity').then((r) => setCurve(r.data));
  }, []);

  const demand = curve?.curve?.find((c) => c.price === price)?.demandKg || curve?.curve?.[2]?.demandKg;

  return (
    <div className="space-y-8">
      <PageHeader title="Market intelligence" subtitle="Compare mandis on risk-adjusted outcome, not highest price alone." />
      <section className="rounded-mm border border-line bg-white p-5 dark:bg-night-card">
        <h3 className="mb-2 font-bold">Risk-Adjusted Mandi Net Profit Optimization</h3>
        <MarketComparisonTable rows={compare?.rows || []} why={compare?.why} recommendedMarket={compare?.recommendedMarket} />
      </section>
      <section className="rounded-mm border border-line bg-white p-5 dark:bg-night-card">
        <h3 className="font-bold">Price–demand curve</h3>
        <p className="text-sm text-mute">Drag price to see estimated demand. Elasticity is estimated, not certain.</p>
        <input type="range" min={20} max={40} step={5} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-4 w-full accent-forest" />
        <div className="mt-2 tabular text-2xl font-bold">
          ₹{price} → {demand} kg
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer>
            <LineChart data={curve?.curve || []}>
              <XAxis dataKey="price" />
              <YAxis />
              <Tooltip />
              <Line dataKey="demandKg" stroke="#166534" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
