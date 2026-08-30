export function SupplyDemandBalance({ data }) {
  if (!data) return null;
  const total = (data.expectedSupply || 0) + (data.expectedDemand || 1);
  const supplyPct = ((data.expectedSupply || 0) / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>Expected supply {data.expectedSupply}</span>
        <span>Expected demand {data.expectedDemand}</span>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full">
        <div className="bg-warn" style={{ width: `${supplyPct}%` }} />
        <div className="bg-forest" style={{ width: `${100 - supplyPct}%` }} />
      </div>
      <div className="mt-3 text-sm font-bold">
        {data.class === 'SURPLUS' ? 'HIGH OVERSUPPLY RISK' : data.class === 'SHORTAGE' ? 'SHORTAGE RISK' : 'BALANCED'}
      </div>
      <div className="text-xs text-mute">
        Oversupply {Math.round((data.oversupplyProb || 0) * 100)}% · Shortage {Math.round((data.shortageProb || 0) * 100)}%
      </div>
    </div>
  );
}
