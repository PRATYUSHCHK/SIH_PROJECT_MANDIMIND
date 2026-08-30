export function ConfidenceIndicator({ value = 0.86, compact = false }) {
  const pct = Math.round((value > 1 ? value : value * 100));
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="flex items-center gap-3" title="Model confidence: how stable this forecast is given recent features. Not guaranteed accuracy.">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r={r} fill="none" stroke="#E5E9E3" strokeWidth="5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke="#166534" strokeWidth="5" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 24 24)" />
        <text x="24" y="28" textAnchor="middle" className="tabular" fontSize="10" fill="#166534">
          {pct}
        </text>
      </svg>
      {!compact && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-mute">Model confidence</div>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-forest" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
