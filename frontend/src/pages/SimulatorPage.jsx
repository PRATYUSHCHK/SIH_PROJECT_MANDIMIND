import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { WhatIfControl, SimulationResult } from '../components/simulator/WhatIf.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function SimulatorPage() {
  const toast = useToast();
  const [inputs, setInputs] = useState({
    price: 30,
    rainfallMm: 8,
    temperatureC: 30,
    arrivalsGrowth: 0,
    currentStockKg: 180,
    budgetInr: 50000,
    transportCostPerKg: 1.2,
    demandGrowth: 0,
    commodity: 'tomato',
    currentPrice: 30,
    currentInventoryKg: 180,
  });
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const body = useMemo(() => inputs, [inputs]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data } = await api.post('/simulate', body);
        setResult(data);
        setErr('');
      } catch (e) {
        setErr(e.response?.data?.error || 'Simulator requires the ML service.');
      }
    }, 280);
    return () => clearTimeout(t);
  }, [body]);

  useEffect(() => {
    if (result?.warnings?.length) toast.push(result.warnings[0]);
  }, [result?.warnings?.[0]]);

  return (
    <div>
      <PageHeader
        title="What-if simulator"
        subtitle="A decision laboratory. BASELINE vs SIMULATED. Rainfall +30% and arrivals +40% are the demo story."
        actions={<DataStatusBadge status="SIMULATED" />}
      />
      {err && <div className="mb-4 rounded-mm border border-alert/30 p-3 text-sm">{err}</div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-5 rounded-mm border border-line bg-white p-5 dark:bg-night-card">
          <h3 className="font-bold">Scenario controls</h3>
          <WhatIfControl label="Price" suffix="/kg" value={inputs.price} min={18} max={45} step={1} onChange={(v) => setInputs((s) => ({ ...s, price: v, currentPrice: v }))} />
          <WhatIfControl label="Rainfall" suffix=" mm" value={inputs.rainfallMm} min={0} max={40} step={1} onChange={(v) => setInputs((s) => ({ ...s, rainfallMm: v }))} />
          <WhatIfControl label="Temperature" suffix="°C" value={inputs.temperatureC} min={18} max={42} step={1} onChange={(v) => setInputs((s) => ({ ...s, temperatureC: v }))} />
          <WhatIfControl label="Market arrivals" suffix="%" value={inputs.arrivalsGrowth} min={-20} max={60} step={1} onChange={(v) => setInputs((s) => ({ ...s, arrivalsGrowth: v }))} />
          <WhatIfControl label="Current stock" suffix=" kg" value={inputs.currentStockKg} min={0} max={2000} step={10} onChange={(v) => setInputs((s) => ({ ...s, currentStockKg: v, currentInventoryKg: v }))} />
          <WhatIfControl label="Budget" suffix="" value={inputs.budgetInr} min={10000} max={200000} step={1000} onChange={(v) => setInputs((s) => ({ ...s, budgetInr: v }))} />
          <WhatIfControl label="Transport" suffix="/kg" value={inputs.transportCostPerKg} min={0.2} max={5} step={0.1} onChange={(v) => setInputs((s) => ({ ...s, transportCostPerKg: v }))} />
          <WhatIfControl label="Demand growth" suffix="%" value={inputs.demandGrowth} min={-20} max={40} step={1} onChange={(v) => setInputs((s) => ({ ...s, demandGrowth: v }))} />
        </section>
        <section className="rounded-mm border border-line bg-white p-5 dark:bg-night-card">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-widest text-harvest">Baseline vs simulated</div>
          <SimulationResult baseline={result?.baseline} simulated={result?.simulated} deltas={result?.deltas} warnings={result?.warnings} />
        </section>
      </div>
    </div>
  );
}
