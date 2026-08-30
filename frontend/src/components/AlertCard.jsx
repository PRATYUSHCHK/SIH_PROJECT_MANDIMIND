export function AlertCard({ alert }) {
  const tone = alert.severity === 'high' || alert.severity === 'critical' ? 'border-alert/40' : alert.severity === 'moderate' ? 'border-warn/40' : 'border-line';
  return (
    <article className={`rounded-mm border bg-white p-4 dark:bg-night-card ${tone}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-mute">{alert.severity}</div>
      <h3 className="mt-1 font-semibold">{alert.title}</h3>
      <p className="mt-1 text-sm text-mute">{alert.body}</p>
    </article>
  );
}
