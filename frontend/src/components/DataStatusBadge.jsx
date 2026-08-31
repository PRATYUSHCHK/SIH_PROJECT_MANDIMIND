import { useTranslation } from '../i18n/index.jsx';

const MAP = {
  LIVE: { key: 'liveData', label: 'LIVE', color: '#22C55E' },
  HISTORICAL: { key: 'staleData', label: 'HISTORICAL', color: '#2563EB' },
  SIMULATED: { key: 'simulated', label: 'SIMULATED', color: '#EAB308' },
  AI_FORECAST: { key: 'aiForecast', label: 'AI FORECAST', color: '#166534' },
};

export function DataStatusBadge({ status = 'SIMULATED' }) {
  const { t } = useTranslation();
  const item = MAP[status] || MAP.SIMULATED;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-semibold tracking-wide text-ink dark:border-night-mute/20 dark:bg-night-lift dark:text-night-text">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
      {t(`badges.${item.key}`, item.label)}
    </span>
  );
}
