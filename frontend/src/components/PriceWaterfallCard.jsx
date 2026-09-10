import { useState } from 'react';
import { useTranslation } from '../i18n/index.jsx';
import { DataStatusBadge } from './DataStatusBadge.jsx';
import {
  IndianRupee,
  Layers,
  TrendingDown,
  ShieldCheck,
  Truck,
  Box,
  HandMetal,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export function PriceWaterfallCard({
  waterfall,
  intermediaryReduction,
  commodityName = 'Produce',
  quantityKg = 100,
  compact = false,
}) {
  const { t } = useTranslation();
  const [showTotal, setShowTotal] = useState(false);

  if (!waterfall) return null;

  const multiplier = showTotal ? (quantityKg || 100) : 1;
  const unitLabel = showTotal ? `Total (${quantityKg} kg)` : '₹/kg';

  const buyerPrice = (waterfall.buyerPricePerKg || 0) * multiplier;
  const farmerNet = (waterfall.farmerRealizationPerKg || 0) * multiplier;
  const logistics = (waterfall.logisticsCostPerKg || 0) * multiplier;
  const packaging = (waterfall.packagingCostPerKg || 0) * multiplier;
  const handling = (waterfall.handlingCostPerKg || 0) * multiplier;
  const spoilage = (waterfall.spoilageRiskLossPerKg || 0) * multiplier;
  const platform = (waterfall.platformServiceFeePerKg || 0.5) * multiplier;

  const netPct = buyerPrice > 0 ? Math.round((farmerNet / buyerPrice) * 100) : 0;

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3 dark:border-night-mute/30">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest">
            <Layers size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink dark:text-night-text">{t('waterfall.title', 'Price Transparency & Waterfall')}</h4>
            <p className="text-[11px] text-mute">{t('waterfall.subtitle', 'Dynamic cost allocation from buyer payment to farmer net realization.')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTotal(!showTotal)}
            className="rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-mute hover:text-ink dark:border-night-mute/30"
          >
            {showTotal ? 'Show per kg' : 'Show Total Order'}
          </button>
          <DataStatusBadge status="SIMULATED" />
        </div>
      </div>

      {/* Intermediary Reduction Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-forest/5 p-3 dark:bg-harvest/5 border border-forest/20 dark:border-harvest/20">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-forest dark:text-harvest shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-forest dark:text-harvest">{t('waterfall.directTrade', 'MandiMind Direct Trade')}: </span>
            <span className="text-ink dark:text-night-text">{t('waterfall.zeroResellers', '0 additional commercial resale layers')}</span>
          </div>
        </div>
        <div className="text-xs font-bold text-mute">
          {t('waterfall.traditionalMarkup', 'Est. Middleman Markup Saved')}: <span className="text-forest dark:text-harvest">~{intermediaryReduction?.traditionalEstimatedMarkupPct || 22}%</span>
        </div>
      </div>

      {/* Waterfall Breakdown Items */}
      <div className="space-y-2 text-xs">
        {/* Buyer Gross Price */}
        <div className="flex items-center justify-between rounded-lg bg-earth/60 px-3 py-2 dark:bg-night-lift/50">
          <span className="font-bold text-ink dark:text-night-text">{t('waterfall.buyerPrice', 'Buyer Gross Purchase Price')}</span>
          <span className="font-extrabold tabular text-ink dark:text-night-text">₹{buyerPrice.toFixed(2)}</span>
        </div>

        {/* Deductions breakdown */}
        <div className="pl-2 space-y-1.5 border-l-2 border-line/60 dark:border-night-mute/30">
          <div className="flex items-center justify-between text-mute hover:text-ink">
            <span className="flex items-center gap-1.5">
              <Truck size={12} /> {t('waterfall.logistics', 'Direct Transport & Freight')}
            </span>
            <span className="tabular font-medium text-alert">− ₹{logistics.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-mute hover:text-ink">
            <span className="flex items-center gap-1.5">
              <Box size={12} /> {t('waterfall.packaging', 'Grading & Packaging (Crates/Bags)')}
            </span>
            <span className="tabular font-medium text-alert">− ₹{packaging.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-mute hover:text-ink">
            <span className="flex items-center gap-1.5">
              <HandMetal size={12} /> {t('waterfall.handling', 'Loading & Mandi Gate Handling')}
            </span>
            <span className="tabular font-medium text-alert">− ₹{handling.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-mute hover:text-ink">
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={12} /> {t('waterfall.spoilageLoss', 'Expected Spoilage Risk Loss')}
            </span>
            <span className="tabular font-medium text-alert">− ₹{spoilage.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-mute hover:text-ink">
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} /> {t('waterfall.platformFee', 'MandiMind Digital Coordination Fee')}
            </span>
            <span className="tabular font-medium text-alert">− ₹{platform.toFixed(2)}</span>
          </div>
        </div>

        {/* Farmer Net Realization */}
        <div className="flex items-center justify-between rounded-lg bg-forest/10 p-3 dark:bg-harvest/10 border border-forest/30 dark:border-harvest/30">
          <div>
            <div className="text-[11px] font-bold uppercase text-forest dark:text-harvest tracking-wider">
              {t('waterfall.netFarmerRealization', 'True Net Farmer Realization')}
            </div>
            <div className="text-[10px] text-mute">{netPct}% of buyer gross payment delivered to farm gate</div>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold tabular text-forest dark:text-harvest">₹{farmerNet.toFixed(2)}</div>
            <div className="text-[10px] text-mute">{unitLabel}</div>
          </div>
        </div>
      </div>

      {/* Illustrative channel disclaimer */}
      <div className="text-[10px] text-mute italic">
        * Note: Cost allocation and middleman markups are simulated demo estimates. Necessary service providers (transport, packaging, FPO aggregation) are legitimate services and not counted as commercial resellers.
      </div>
    </div>
  );
}
