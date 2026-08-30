export function WhatIfControl({ label, value, min, max, step, onChange, suffix }) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular font-semibold">
          {value}
          {suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-forest" />
    </label>
  );
}

export function SimulationResult({ baseline, simulated, deltas, warnings }) {
  if (!simulated) return null;
  const rows = [
    ['Predicted demand', 'predictedDemandKg', ' kg'],
    ['Predicted price', 'predictedPriceInr', '/kg'],
    ['Recommended purchase', 'recommendedPurchaseKg', ' kg'],
    ['Expected revenue', 'expectedRevenueInr', ''],
    ['Expected profit', 'expectedProfitInr', ''],
    ['Spoilage', 'spoilageProb', ''],
    ['Risk score', 'riskScore', ''],
  ];
  return (
    <div>
      {warnings?.length > 0 && <div className="mb-4 rounded-mm border border-warn/40 bg-warn/10 px-4 py-3 font-bold">{warnings[0]}</div>}
      <div className="grid gap-3">
        {rows.map(([label, key, suffix]) => {
          const a = baseline?.[key];
          const b = simulated[key];
          const money = key.includes('Inr');
          const fmt = (v) => (key === 'spoilageProb' ? `${Math.round(v * 100)}%` : money ? `₹${Number(v).toLocaleString('en-IN')}` : `${v}${suffix}`);
          return (
            <div key={key} className="flex items-center justify-between border-b border-line py-2 dark:border-night-mute/20">
              <span className="text-sm text-mute">{label}</span>
              <div className="text-right">
                <div className="tabular text-sm">
                  {fmt(a)} → <strong>{fmt(b)}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-sm">
        Profit change <span className="tabular font-bold">{deltas?.profitPct}%</span>
      </div>
    </div>
  );
}
