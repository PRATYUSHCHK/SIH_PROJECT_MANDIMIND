import { ConfidenceIndicator } from './ConfidenceIndicator.jsx';
import { DataStatusBadge } from './DataStatusBadge.jsx';
import { RiskBadge } from './RiskBadge.jsx';
import { useTranslation } from '../i18n/index.jsx';

export function AIRecommendationCard({ rec, onWhy }) {
  const { t } = useTranslation();
  if (!rec) return null;
  const humanReasons = rec.humanReasons || rec.why?.humanReasons || [];
  const range = rec.expectedPriceRange || [29.2, 35.1];

  const headlineText = (() => {
    if (!rec.headline) return '';
    const parts = rec.headline.split(' ');
    const action = parts[0]?.toUpperCase();
    if (['HOLD', 'SELL', 'SPLIT'].includes(action)) {
      const rest = parts.slice(1).join(' ');
      if (action === 'HOLD') return t('dashboard.holdTemplate', { quantity: '', commodity: rest }).replace(/\s+/g, ' ').trim();
      if (action === 'SELL') return t('dashboard.sellTemplate', { quantity: '', commodity: rest }).replace(/\s+/g, ' ').trim();
      if (action === 'SPLIT') return t('dashboard.splitTemplate', { quantity: '', commodity: rest }).replace(/\s+/g, ' ').trim();
    }
    return rec.headline;
  })();

  return (
    <section className="relative overflow-hidden rounded-[18px] border border-forest/20 bg-white p-6 shadow-card dark:border-harvest/20 dark:bg-night-card">
      <div className="absolute left-0 top-0 h-full w-1.5 bg-forest" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-forest animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-forest dark:text-harvest">
            {t('dashboard.todayDecision', "Today's AI Decision")}
          </span>
        </div>
        <DataStatusBadge status="AI_FORECAST" />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-forest-ink dark:text-night-text md:text-4xl">
          {headlineText || rec.headline}
        </h2>
      </div>

      <div className="mt-6 grid gap-4 rounded-xl bg-earth/60 p-4 dark:bg-night-lift/50 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-mute">{t('dashboard.bestMarket', 'Best Market')}</div>
          <div className="mt-0.5 font-bold text-ink dark:text-night-text">{rec.bestMarket || 'Kothapet Fruit Market'}</div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-mute">{t('dashboard.sellingWindow', 'Selling Window')}</div>
          <div className="mt-0.5 font-bold text-forest dark:text-harvest">{rec.sellingWindow || 'Next 48 hours'}</div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-mute">{t('dashboard.expectedPriceRange', 'Expected Price Range')}</div>
          <div className="mt-0.5 font-bold tabular text-ink dark:text-night-text">
            ₹{range[0]} – ₹{range[1]} <span className="text-xs font-normal text-mute">/kg</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-mute">{t('dashboard.expectedNetProfit', 'Expected Net Profit')}</div>
          <div className="mt-0.5 font-extrabold tabular text-xl text-forest dark:text-harvest">
            ₹{Number(rec.expectedProfitInr || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <ConfidenceIndicator value={rec.confidence} />
        <div>
          <div className="text-[11px] uppercase tracking-wider text-mute">{t('dashboard.marketRiskScore', 'Market Risk Score')}</div>
          <div className="mt-2">
            <RiskBadge risk={rec.risk} />
          </div>
        </div>
      </div>

      {humanReasons.length > 0 && (
        <div className="mt-6 border-t border-line/60 pt-4 dark:border-night-mute/30">
          <div className="text-xs font-bold uppercase tracking-wider text-mute">{t('dashboard.whyAiRecommends', 'Why the AI recommends this action')}</div>
          <ul className="mt-2 space-y-1.5 text-sm text-ink dark:text-night-text">
            {humanReasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-forest dark:text-harvest font-bold">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 dark:border-night-mute/30">
        <div className="flex flex-wrap gap-2">
          {(rec.factors || []).map((f) => (
            <span key={f.label} className="rounded-full bg-earth px-3 py-1 text-xs font-medium text-ink dark:bg-night-lift dark:text-night-text">
              {f.label} {f.impactPct > 0 ? '+' : ''}{f.impactPct}%
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onWhy}
          className="rounded-full border border-forest/30 bg-forest/10 px-5 py-2 text-xs font-bold text-forest hover:bg-forest hover:text-white dark:border-harvest/30 dark:bg-harvest/10 dark:text-harvest dark:hover:bg-harvest dark:hover:text-ink transition-colors"
        >
          {t('dashboard.driverBreakdown', 'Technical Explanation (SHAP)')}
        </button>
      </div>
    </section>
  );
}
