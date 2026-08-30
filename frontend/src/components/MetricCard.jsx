export function MetricCard({ label, value, suffix, hint, status }) {
  return (
    <div className="rounded-mm border border-line bg-white px-4 py-4 dark:border-night-mute/20 dark:bg-night-card">
      <div className="text-[11px] font-medium uppercase tracking-wide text-mute dark:text-night-mute">{label}</div>
      <div className="mt-1 flex items-end gap-1">
        <div className="tabular text-2xl font-bold tracking-tight text-ink dark:text-night-text">{value}</div>
        {suffix && <span className="mb-0.5 text-xs text-mute">{suffix}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
      {status}
    </div>
  );
}
