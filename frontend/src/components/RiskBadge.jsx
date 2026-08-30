const COPY = {
  LOW: 'Low: expected outcomes are stable relative to recent conditions.',
  MODERATE: 'Moderate: some uncertainty from weather, arrivals or spoilage.',
  HIGH: 'High: conditions could move against the recommendation.',
  CRITICAL: 'Critical: severe shortage, spoilage or oversupply risk.',
};

const TONE = {
  LOW: 'bg-agri/15 text-forest-deep',
  MODERATE: 'bg-harvest/20 text-[#854D0E]',
  HIGH: 'bg-warn/20 text-[#9A3412]',
  CRITICAL: 'bg-alert/15 text-alert',
};

export function RiskBadge({ risk = 'LOW' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE[risk] || TONE.LOW}`} title={COPY[risk]}>
      <span aria-hidden>{risk === 'CRITICAL' ? '●' : risk === 'HIGH' ? '▲' : '●'}</span>
      {risk} RISK
    </span>
  );
}
