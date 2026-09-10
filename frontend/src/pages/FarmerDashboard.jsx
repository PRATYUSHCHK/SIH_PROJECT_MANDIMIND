import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator.jsx';
import { SupplyPoolCard } from '../components/SupplyPoolCard.jsx';
import {
  TrendingUp,
  MapPin,
  IndianRupee,
  Truck,
  Zap,
  ArrowRight,
  ShoppingBasket,
  Target,
  Sparkles,
  Package,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Users,
  Check,
  Scale,
} from 'lucide-react';

function TradeComparisonWidget() {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-forest/30 bg-gradient-to-br from-white via-forest/[0.02] to-forest/[0.06] p-6 shadow-card dark:border-harvest/30 dark:bg-night-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3 dark:border-night-mute/30">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/15 text-forest dark:bg-harvest/20 dark:text-harvest">
            <Scale size={18} />
          </div>
          <div>
            <h3 className="font-bold text-base text-ink dark:text-night-text">
              {t('dashboard.netRealizationDemo', 'AI Trade Intelligence: Why Gross Price Can Be Misleading')}
            </h3>
            <p className="text-xs text-mute">Comparing high-price distant buyer vs optimal nearby direct buyer</p>
          </div>
        </div>
        <DataStatusBadge status="SIMULATED" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Option A: Distant Buyer (Seemingly High Price) */}
        <div className="rounded-xl border border-alert/30 bg-alert/[0.03] p-4 space-y-3 dark:border-alert/20">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-alert/15 px-2.5 py-0.5 text-[10px] font-bold text-alert uppercase">
              OPTION A — DISTANT BUYER
            </span>
            <span className="text-xs font-bold text-alert">⚠️ Low Net Yield</span>
          </div>

          <div>
            <div className="text-sm font-bold text-ink dark:text-night-text">Delhi Wholesale Market (1,500 km)</div>
            <div className="text-xs text-mute">Gross Offer: <strong className="text-ink dark:text-night-text">₹36.00/kg</strong> (Seemingly High)</div>
          </div>

          <div className="space-y-1 text-xs text-mute border-t border-line/60 pt-2">
            <div className="flex justify-between">
              <span>Freight / Logistics (1500 km):</span>
              <span className="text-alert tabular">− ₹8.50/kg</span>
            </div>
            <div className="flex justify-between">
              <span>Expected Transit Spoilage (15%):</span>
              <span className="text-alert tabular">− ₹5.40/kg</span>
            </div>
            <div className="flex justify-between">
              <span>Packaging & Handling:</span>
              <span className="text-alert tabular">− ₹1.10/kg</span>
            </div>
          </div>

          <div className="rounded-lg bg-alert/10 p-3 text-xs flex justify-between items-center font-bold">
            <span className="text-alert">Farmer Net Realization:</span>
            <span className="text-base font-extrabold tabular text-alert">₹21.00/kg</span>
          </div>
        </div>

        {/* Option B: Local Direct Buyer (Recommended) */}
        <div className="rounded-xl border-2 border-forest/40 bg-forest/[0.05] p-4 space-y-3 dark:border-harvest/40 dark:bg-harvest/[0.05]">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-forest text-white px-2.5 py-0.5 text-[10px] font-bold uppercase dark:bg-harvest dark:text-ink">
              OPTION B — LOCAL DIRECT BUYER
            </span>
            <span className="text-xs font-bold text-forest dark:text-harvest flex items-center gap-1">
              <Check size={14} /> BEST NET RETURN
            </span>
          </div>

          <div>
            <div className="text-sm font-bold text-ink dark:text-night-text">Hyderabad Fresh Supermarkets (95 km)</div>
            <div className="text-xs text-mute">Gross Offer: <strong className="text-ink dark:text-night-text">₹30.00/kg</strong> (Market Rate)</div>
          </div>

          <div className="space-y-1 text-xs text-mute border-t border-line/60 pt-2">
            <div className="flex justify-between">
              <span>Freight / Direct Transport (95 km):</span>
              <span className="text-forest dark:text-harvest tabular">− ₹1.80/kg</span>
            </div>
            <div className="flex justify-between">
              <span>Expected Transit Spoilage (2%):</span>
              <span className="text-forest dark:text-harvest tabular">− ₹0.60/kg</span>
            </div>
            <div className="flex justify-between">
              <span>Packaging & Handling:</span>
              <span className="text-forest dark:text-harvest tabular">− ₹0.80/kg</span>
            </div>
          </div>

          <div className="rounded-lg bg-forest/15 p-3 text-xs flex justify-between items-center font-bold dark:bg-harvest/15">
            <span className="text-forest dark:text-harvest">Farmer Net Realization:</span>
            <span className="text-lg font-extrabold tabular text-forest dark:text-harvest">₹26.80/kg (+27.6%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityCard({ opp, type }) {
  const { t } = useTranslation();

  if (type === 'SELL') {
    const isRecommended = opp.isRecommended !== false;
    const spoilageRisk = opp.spoilageRiskScore || 'LOW';

    return (
      <div className={`relative overflow-hidden rounded-[18px] border bg-white p-6 shadow-card dark:bg-night-card ${
        isRecommended ? 'border-forest/20 dark:border-harvest/20' : 'border-alert/40'
      }`}>
        <div className={`absolute left-0 top-0 h-full w-1.5 ${isRecommended ? 'bg-forest' : 'bg-alert'}`} />
        
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`flex h-2.5 w-2.5 rounded-full ${isRecommended ? 'bg-forest animate-pulse' : 'bg-alert'}`} />
            <span className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${isRecommended ? 'text-forest dark:text-harvest' : 'text-alert'}`}>
              {t('dashboard.todayDecision', "Today's AI Direct Trade")} — {isRecommended ? 'RECOMMENDED BUYER' : 'LOW NET REALIZATION'}
            </span>
          </div>
          <DataStatusBadge status="AI_FORECAST" />
        </div>

        <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-forest-ink dark:text-night-text">
          {opp.listing?.quantityKg || 500} KG {opp.listing?.commodityName?.toUpperCase() || 'PRODUCE'} → {opp.requirement?.buyer?.name || 'Buyer'}
        </h3>

        <div className="mt-4 grid gap-4 rounded-xl bg-earth/60 p-4 dark:bg-night-lift/50 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mute">Buyer Location & Type</div>
            <div className="mt-0.5 font-bold text-ink dark:text-night-text">
              {opp.requirement?.deliveryLocation} ({opp.distanceKm || 95} km)
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mute">Gross Buyer Offer</div>
            <div className="mt-0.5 font-bold tabular text-ink dark:text-night-text">₹{opp.buyerOffer || opp.fairPrice}/kg</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mute">Logistics Cost</div>
            <div className="mt-0.5 font-bold tabular text-ink dark:text-night-text">₹{opp.transportCostPerKg}/kg</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mute">Transit Spoilage Risk</div>
            <div className={`mt-0.5 font-bold ${spoilageRisk === 'LOW' ? 'text-forest dark:text-harvest' : 'text-alert'}`}>
              {spoilageRisk} ({opp.spoilagePercent || 3}%)
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 items-center">
          <div className="rounded-xl bg-forest/10 p-3.5 dark:bg-harvest/10 border border-forest/20">
            <div className="text-[11px] uppercase tracking-wider text-forest dark:text-harvest font-bold">
              {t('dashboard.expectedNetRealization', 'True Net Farmer Realization')}
            </div>
            <div className="mt-1 font-extrabold tabular text-2xl text-forest dark:text-harvest">
              ₹{opp.estimatedFarmerNet}/kg
            </div>
          </div>
          <ConfidenceIndicator value={opp.aiConfidence || 0.88} />
        </div>

        {/* Reasons */}
        {opp.matchReasons?.length > 0 && (
          <div className="mt-4 border-t border-line/60 pt-3 dark:border-night-mute/30">
            <div className="text-xs font-bold uppercase tracking-wider text-mute">{t('dashboard.whyAiRecommends', 'Why This Trade?')}</div>
            <ul className="mt-2 space-y-1 text-xs text-ink dark:text-night-text">
              {opp.matchReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-forest font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <a
            href={`/matches?listingId=${opp.listing?._id}`}
            className="flex items-center gap-2 rounded-full border border-forest/30 bg-forest px-5 py-2 text-xs font-bold text-white hover:bg-forest-deep dark:bg-harvest dark:text-ink transition-colors"
          >
            {t('common.details', 'View Trade & Make Offer')} <ArrowRight size={14} />
          </a>
        </div>
      </div>
    );
  }

  return null;
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [opportunities, setOpportunities] = useState([]);
  const [listings, setListings] = useState([]);
  const [supplyPools, setSupplyPools] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    setErr('');
    try {
      const [oppRes, listRes, poolRes] = await Promise.all([
        api.get('/marketplace/opportunities'),
        api.get('/marketplace/listings'),
        api.get('/marketplace/pools').catch(() => ({ data: { pools: [] } })),
      ]);
      setOpportunities(oppRes.data.opportunities || []);
      setListings(listRes.data.listings || []);
      setSupplyPools(poolRes.data.pools || []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (err) return <ErrorState message={err} onRetry={loadData} />;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('dashboard.farmerDesk', 'Farmer Advisory Desk')}
        title={t('dashboard.whatShouldIDoToday', 'Direct Trading & Crop Advisory')}
        subtitle={t('dashboard.cropAdvisory', 'AI-powered marketplace optimization prioritizing Net Farm-Gate Realization, distance reduction, and spoilage prevention.')}
        actions={<DataStatusBadge status="AI_FORECAST" />}
      />

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-mm border border-line bg-white px-4 py-4 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] font-medium uppercase tracking-wide text-mute">{t('marketplace.produceListings', 'Active Farm Produce Listings')}</div>
          <div className="mt-1 text-2xl font-bold tabular">{listings.length}</div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-4 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] font-medium uppercase tracking-wide text-mute">{t('matches.title', 'Direct Buyer Matches')}</div>
          <div className="mt-1 text-2xl font-bold tabular text-forest">{opportunities.filter(o => o.type === 'SELL').length}</div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-4 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] font-medium uppercase tracking-wide text-mute">{t('common.actions', 'Quick Actions')}</div>
          <div className="mt-1 flex gap-2">
            <a href="/marketplace" className="rounded-lg bg-forest/10 px-3 py-1 text-xs font-bold text-forest hover:bg-forest hover:text-white transition-colors">
              {t('marketplace.listProduce', 'List Produce')}
            </a>
            <a href="/matches" className="rounded-lg bg-harvest/10 px-3 py-1 text-xs font-bold text-harvest hover:bg-harvest hover:text-ink transition-colors">
              {t('marketplace.findBuyers', 'Find Direct Buyers')}
            </a>
          </div>
        </div>
      </div>

      {/* Interactive Net Realization vs Distance Trade Comparison */}
      <TradeComparisonWidget />

      {/* Opportunities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-ink dark:text-night-text">
            <Sparkles size={18} className="text-forest" />
            Direct Buyer Opportunities (Ranked by True Net Realization)
          </h3>
          <span className="text-xs text-mute">0 Middlemen Resale Layers</span>
        </div>

        {opportunities.filter(o => o.type === 'SELL').length === 0 ? (
          <div className="rounded-mm border border-dashed border-line bg-earth/30 p-8 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
            <Zap size={28} className="mx-auto text-mute" />
            <div className="mt-2 text-sm font-medium text-mute">{t('matches.subtitle', 'No selling opportunities right now')}</div>
            <div className="mt-1 text-xs text-mute">{t('marketplace.subtitle', 'List your produce on the marketplace to find AI-matched buyers.')}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {opportunities.filter(o => o.type === 'SELL').map((opp, idx) => (
              <OpportunityCard key={idx} opp={opp} type="SELL" />
            ))}
          </div>
        )}
      </section>

      {/* Supply Pooling Opportunities */}
      {supplyPools.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-harvest">
              <Users size={18} />
              FPO Multi-Farmer Supply Pooling Demands
            </h3>
            <span className="text-xs text-mute">Digitally combine small harvests for large buyer orders</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {supplyPools.map((pool) => (
              <SupplyPoolCard
                key={pool._id}
                pool={pool}
                currentUser={user}
                onContributed={loadData}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
