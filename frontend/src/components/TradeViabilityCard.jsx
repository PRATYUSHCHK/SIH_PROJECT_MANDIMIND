import { useState } from 'react';
import { useTranslation } from '../i18n/index.jsx';
import { DataStatusBadge } from './DataStatusBadge.jsx';
import { PriceWaterfallCard } from './PriceWaterfallCard.jsx';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Truck,
  Thermometer,
  Clock,
  MapPin,
  Check,
  X as XIcon,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

export function TradeViabilityCard({
  viability,
  listing,
  requirement,
  buyerGrossPrice,
  onVehicleChange,
  selectedVehicle = 'standard',
}) {
  const { t } = useTranslation();
  const [showWaterfall, setShowWaterfall] = useState(false);

  if (!viability) return null;

  const isRecommended = viability.isRecommended !== false;
  const spoilageRisk = viability.spoilageRiskScore || viability.spoilage?.spoilageRiskScore || 'LOW';
  const spoilagePct = viability.spoilage?.spoilagePercent || 5.0;
  const netRealization = viability.netFarmerRealizationInr || 0;
  const grossPrice = buyerGrossPrice || viability.grossPriceInr || 28;
  const distanceKm = viability.distanceKm || 0;
  const etaMinutes = viability.etaMinutes || viability.estimatedTravelTimeMin || 0;
  const viabilityScore = viability.viabilityScore || viability.tradeViabilityScore || 80;

  const spoilageColor =
    spoilageRisk === 'LOW' ? 'bg-forest/15 text-forest border-forest/30' :
    spoilageRisk === 'MEDIUM' ? 'bg-harvest/15 text-harvest border-harvest/30' :
    'bg-alert/15 text-alert border-alert/30';

  const scoreColor =
    viabilityScore >= 75 ? 'text-forest dark:text-harvest' :
    viabilityScore >= 55 ? 'text-harvest' :
    'text-alert';

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-4">
      {/* Header with Unified Viability Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3 dark:border-night-mute/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-earth px-3 py-1 text-xs font-bold dark:bg-night-lift">
            <Sparkles size={13} className="text-forest dark:text-harvest" />
            <span>{t('viability.title', 'Trade Viability')}:</span>
            <span className={`font-extrabold ${scoreColor}`}>{viabilityScore}%</span>
          </div>

          <div className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${spoilageColor}`}>
            <Thermometer size={12} />
            <span>{t(`badges.${spoilageRisk.toLowerCase()}Risk`, `${spoilageRisk} Spoilage Risk`)} ({spoilagePct}%)</span>
          </div>
        </div>

        <DataStatusBadge status="AI_FORECAST" />
      </div>

      {/* Warning Banner when trade is NOT recommended */}
      {!isRecommended && (
        <div className="flex items-start gap-3 rounded-lg border border-alert/40 bg-alert/10 p-3.5 text-alert dark:bg-alert/15">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold uppercase tracking-wider">{t('viability.notRecommended', '⚠️ TRADE NOT RECOMMENDED')}</div>
            <div className="mt-0.5 font-medium text-ink dark:text-night-text">
              {viability.warningReason || 'Transportation distance and expected transit spoilage reduce the estimated net farmer realization below viable nearby alternatives.'}
            </div>
          </div>
        </div>
      )}

      {/* Net Realization vs Gross Price Comparison Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Gross Buyer Price */}
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[11px] font-bold uppercase text-mute">{t('viability.buyerQuotedPrice', 'Buyer Quoted Price')}</div>
          <div className="mt-1 text-lg font-bold tabular text-ink dark:text-night-text">₹{grossPrice}/kg</div>
          <div className="text-[10px] text-mute">{requirement?.buyer?.name || 'Buyer'}</div>
        </div>

        {/* Transport & Distance */}
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[11px] font-bold uppercase text-mute">{t('viability.logisticsTransit', 'Logistics & Distance')}</div>
          <div className="mt-1 text-lg font-bold tabular text-ink dark:text-night-text">
            ₹{viability.transportCostPerKg || viability.logistics?.transportCostPerKg || 1.8}/kg
          </div>
          <div className="text-[10px] text-mute">{distanceKm} km • ~{Math.round(etaMinutes / 60)} hrs travel</div>
        </div>

        {/* Net Farmer Realization */}
        <div className="rounded-lg bg-forest/10 p-3 dark:bg-harvest/10 border border-forest/20 dark:border-harvest/20">
          <div className="text-[11px] font-bold uppercase text-forest dark:text-harvest">{t('viability.netRealization', 'Net Farmer Realization')}</div>
          <div className="mt-1 text-xl font-extrabold tabular text-forest dark:text-harvest">
            ₹{netRealization}/kg
          </div>
          <div className="text-[10px] text-mute">
            {Math.round((netRealization / Math.max(grossPrice, 1)) * 100)}% of buyer price retained
          </div>
        </div>
      </div>

      {/* Vehicle selection & Spoilage Recalculation Toggle */}
      {onVehicleChange && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-earth/30 p-2.5 text-xs dark:bg-night-lift/30 border border-line/60 dark:border-night-mute/30">
          <div className="flex items-center gap-1.5 text-mute">
            <Truck size={14} />
            <span className="font-bold text-ink dark:text-night-text">{t('viability.transportMode', 'Transport Mode')}:</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onVehicleChange('standard')}
              className={`rounded px-2.5 py-1 text-xs font-bold transition-colors ${
                selectedVehicle === 'standard' ? 'bg-forest text-white dark:bg-harvest dark:text-ink' : 'bg-earth text-mute hover:text-ink dark:bg-night-lift'
              }`}
            >
              Standard Truck
            </button>
            <button
              type="button"
              onClick={() => onVehicleChange('refrigerated')}
              className={`rounded px-2.5 py-1 text-xs font-bold transition-colors ${
                selectedVehicle === 'refrigerated' ? 'bg-forest text-white dark:bg-harvest dark:text-ink' : 'bg-earth text-mute hover:text-ink dark:bg-night-lift'
              }`}
            >
              ❄️ Refrigerated (Cold-Chain)
            </button>
          </div>
        </div>
      )}

      {/* Why This Buyer? Explainability Section */}
      <div className="space-y-1.5 text-xs">
        <div className="font-bold uppercase tracking-wider text-mute">{t('viability.whyAnalysis', 'Why this trade assessment?')}</div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {(viability.advisoryPills || []).map((pill, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded bg-earth/40 px-2.5 py-1 text-ink dark:bg-night-lift/40 dark:text-night-text">
              {pill.startsWith('✓') ? (
                <Check size={13} className="text-forest shrink-0" />
              ) : (
                <AlertTriangle size={13} className="text-alert shrink-0" />
              )}
              <span>{pill.replace(/^[✓⚠️~]\s*/, '')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Price Waterfall Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowWaterfall(!showWaterfall)}
          className="flex items-center gap-1 text-xs font-bold text-forest hover:text-forest-deep dark:text-harvest"
        >
          <Layers size={13} />
          <span>{showWaterfall ? t('waterfall.hide', 'Hide Price Breakdown') : t('waterfall.show', 'View Itemized Price Waterfall')}</span>
          {showWaterfall ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showWaterfall && viability.priceWaterfall && (
          <div className="mt-3">
            <PriceWaterfallCard
              waterfall={viability.priceWaterfall}
              intermediaryReduction={viability.intermediaryReduction}
              commodityName={listing?.commodityName || requirement?.commodityName}
              quantityKg={listing?.quantityKg || requirement?.quantityKg}
            />
          </div>
        )}
      </div>
    </div>
  );
}
