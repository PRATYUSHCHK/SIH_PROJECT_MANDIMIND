import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { InventoryHealth } from '../components/InventoryHealth.jsx';

export default function InventoryPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/inventory').then((r) => setData(r.data));
  }, []);
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="When stock is excess or perishable, MandiMind suggests an action with estimated financial impact." />
      <InventoryHealth
        items={(data?.items || []).map((i) => ({
          commodity: i.commodity.name,
          slug: i.commodity.slug,
          quantityKg: i.quantityKg,
          ageDays: i.ageDays,
          status: i.quantityKg > 700 ? 'overstocked' : i.quantityKg < 80 ? 'low' : 'healthy',
          spoilageRisk: i.commodity.perishability,
        }))}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {(data?.actions || []).map((a) => (
          <article key={a.slug} className="rounded-mm border border-line bg-white p-5 dark:bg-night-card">
            <div className="text-xs uppercase text-mute">{a.slug}</div>
            <h3 className="text-lg font-bold">{a.action}</h3>
            <p className="text-sm text-mute">{a.detail}</p>
            {a.expectedRecoveryInr > 0 && (
              <div className="mt-3 tabular text-sm">
                Expected recovery ₹{a.expectedRecoveryInr.toLocaleString('en-IN')} · Loss avoided ₹{a.lossAvoidedInr.toLocaleString('en-IN')}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
