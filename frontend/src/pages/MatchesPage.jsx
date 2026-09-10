import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import { TradeViabilityCard } from '../components/TradeViabilityCard.jsx';
import { SupplyPoolCard } from '../components/SupplyPoolCard.jsx';
import { PriceWaterfallCard } from '../components/PriceWaterfallCard.jsx';
import {
  Zap,
  Check,
  X as XIcon,
  MapPin,
  IndianRupee,
  Weight,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Layers,
  Truck,
  ShieldAlert,
} from 'lucide-react';

function MatchScoreBadge({ score }) {
  const color =
    score >= 80 ? 'bg-forest text-white' :
    score >= 60 ? 'bg-harvest text-ink' :
    score >= 40 ? 'bg-earth text-ink dark:bg-night-lift' :
    'bg-alert/15 text-alert';
  return (
    <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${color}`}>
      <Target size={12} />
      {score}%
    </div>
  );
}

function MatchCard({ match, currentUser, onMakeOffer }) {
  const { t } = useTranslation();
  const [vehicle, setVehicle] = useState('standard');
  const [liveViability, setLiveViability] = useState(match);
  const [loadingViability, setLoadingViability] = useState(false);

  const listing = match.listing;
  const requirement = match.requirement;

  if (!listing || !requirement) return null;

  async function handleVehicleChange(newVehicle) {
    setVehicle(newVehicle);
    setLoadingViability(true);
    try {
      const { data } = await api.post('/marketplace/trade-analysis', {
        listingId: listing._id,
        requirementId: requirement._id,
        vehicleType: newVehicle,
      });
      if (data.viability) {
        setLiveViability({
          ...match,
          ...data.viability,
          tradeViabilityScore: data.viability.viabilityScore,
          spoilageRiskScore: data.viability.spoilage?.spoilageRiskScore,
          netFarmerRealizationInr: data.viability.netFarmerRealizationInr,
          priceWaterfall: data.viability.priceWaterfall,
          advisoryPills: data.viability.advisoryPills,
          isRecommended: data.viability.isRecommended,
          warningReason: data.viability.warningReason,
        });
      }
    } catch {
      // ignore fallback
    }
    setLoadingViability(false);
  }

  const isSupplySide = currentUser?.role === 'farmer' || currentUser?.role === 'seller';
  const isRecommended = liveViability.isRecommended !== false;

  return (
    <div className={`rounded-mm border bg-white p-6 shadow-card dark:bg-night-card transition-all ${
      isRecommended ? 'border-line dark:border-night-mute/20' : 'border-alert/50 bg-alert/[0.02]'
    }`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <MatchScoreBadge score={match.matchScore} />
          <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-bold text-forest uppercase">
            {match.dealVerdict?.replace('_', ' ')}
          </span>
          <span className="rounded-full bg-earth px-2.5 py-0.5 text-xs font-medium text-mute dark:bg-night-lift">
            {requirement.buyerType ? `Direct ${requirement.buyerType.toUpperCase()}` : 'DIRECT BUYER'}
          </span>
        </div>
        <DataStatusBadge status="AI_FORECAST" />
      </div>

      {/* Trade Viability Card Component */}
      <TradeViabilityCard
        viability={liveViability}
        listing={listing}
        requirement={requirement}
        buyerGrossPrice={requirement.maximumPriceInr}
        onVehicleChange={handleVehicleChange}
        selectedVehicle={vehicle}
      />

      {/* Action footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 dark:border-night-mute/30">
        <div className="text-xs text-mute">
          <span>{listing.commodityName}</span> • <span className="font-bold tabular">{listing.quantityKg} kg</span> @ <span>{listing.location}</span>
        </div>

        <button
          onClick={() => onMakeOffer({ match: liveViability, vehicle })}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white transition-colors ${
            isRecommended
              ? 'bg-forest hover:bg-forest-deep dark:bg-harvest dark:text-ink'
              : 'bg-alert hover:bg-alert/90'
          }`}
        >
          {!isRecommended && <AlertTriangle size={15} />}
          <span>{isRecommended ? t('matches.makeOffer', 'Make Direct Offer') : 'Review & Proceed with Caution'}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function MultiFarmerCard({ result }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-mm border-2 border-harvest/30 bg-harvest/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-harvest">
          <Users size={18} />
          <span className="text-sm font-extrabold uppercase">Multi-Farmer Supply Match</span>
        </div>
        <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-bold text-forest">
          Aggregation Feasible
        </span>
      </div>

      <div className="text-sm text-ink dark:text-night-text">
        Buyer <strong>{result.requirement?.buyer?.name || 'Direct Buyer'}</strong> needs{' '}
        <strong>{result.requirement?.quantityKg} kg</strong> of <strong>{result.requirement?.commodityName}</strong> in{' '}
        <strong>{result.requirement?.deliveryLocation}</strong>. Multiple nearby producers can fulfill this order collectively:
      </div>

      <div className="space-y-2">
        {result.suppliers?.map((s, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2.5 dark:bg-night-card/80 text-xs">
            <div>
              <span className="font-bold text-ink dark:text-night-text">{s.listing?.farmer?.name || 'Producer'}</span>
              <span className="text-mute ml-2">• {s.listing?.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold tabular">{s.listing?.availableQuantityKg || s.listing?.quantityKg} kg @ ₹{s.listing?.expectedPriceInr}/kg</span>
              <span className="rounded-full bg-forest/10 px-2 py-0.5 font-bold text-forest">₹{s.match?.netFarmerRealizationInr || 26}/kg net</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-forest/10 px-4 py-2.5 text-xs">
        <span className="font-bold text-forest dark:text-harvest">{t('common.total', 'Total Aggregated Supply')}</span>
        <span className="font-extrabold tabular text-base text-forest dark:text-harvest">{result.totalSupplyKg} kg</span>
      </div>

      {result.consolidationOptions?.length > 0 && (
        <div className="rounded-lg bg-white/90 p-3 text-xs dark:bg-night-card/90 space-y-1">
          <div className="font-bold text-forest dark:text-harvest flex items-center gap-1.5">
            <Truck size={14} /> Consolidated Transport Opportunity:
          </div>
          <div className="text-mute">
            {result.consolidationOptions[0]?.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}

function OfferModal({ matchData, currentUser, onClose }) {
  const { t } = useTranslation();
  const match = matchData.match;
  const vehicle = matchData.vehicle || 'standard';

  const [price, setPrice] = useState(match.requirement?.maximumPriceInr || match.aiFairPriceInr || '');
  const availableQty = match.listing?.availableQuantityKg != null ? match.listing?.availableQuantityKg : match.listing?.quantityKg;
  const [qty, setQty] = useState(availableQty || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isBuyer = currentUser?.role === 'buyer';
  const isSupplySide = currentUser?.role === 'farmer' || currentUser?.role === 'seller';
  const isRecommended = match.isRecommended !== false;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/marketplace/offers', {
        listingId: match.listing?._id,
        requirementId: match.requirement?._id,
        priceInr: Number(price),
        quantityKg: Number(qty),
        vehicleType: vehicle,
        message,
      });
      setSubmitted(true);
    } catch (e) {
      console.error('Offer submission failed:', e);
      const msg = e.response?.data?.error || e.response?.data?.message || e.message || 'Failed to submit offer';
      alert(msg);
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-card dark:bg-night-card space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-forest text-white shadow-lg">
            <Check size={32} />
          </div>
          <h3 className="text-xl font-bold">{t('matches.offerSuccess', 'Offer Submitted!')}</h3>
          <p className="text-xs text-mute">
            Counterparty will be notified of your direct offer. You can track status and logistics under Transactions.
          </p>
          <button onClick={onClose} className="rounded-lg bg-forest px-6 py-2.5 text-sm font-bold text-white hover:bg-forest-deep">
            {t('common.close', 'Done')}
          </button>
        </div>
      </div>
    );
  }

  const total = Number(price) * Number(qty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl dark:border-night-mute/20 dark:bg-night-card max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-3 dark:border-night-mute/30">
          <div>
            <h2 className="text-lg font-bold">
              {isSupplySide ? 'Make Direct Offer to Buyer' : 'Make Offer to Supplier'}
            </h2>
            <p className="text-xs text-mute">Direct Agricultural Trade • Zero Middleman Resale Layers</p>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink"><XIcon size={20} /></button>
        </div>

        {/* Warning if deal is economically poor */}
        {!isRecommended && (
          <div className="rounded-lg border border-alert/40 bg-alert/10 p-3 text-xs text-alert">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} /> ⚠️ Pre-Trade Advisory Warning
            </div>
            <div className="mt-1 text-ink dark:text-night-text">
              {match.warningReason || 'High transport and spoilage risk reduce net profit.'}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-earth/50 p-4 dark:bg-night-lift/40 space-y-2 text-xs">
          <div className="flex justify-between font-bold text-sm text-ink dark:text-night-text">
            <span>{match.listing?.commodityName} ({match.listing?.qualityGrade || 'Grade A'})</span>
            <span className="text-forest dark:text-harvest">Net Est: ₹{match.netFarmerRealizationInr}/kg</span>
          </div>
          <div className="text-mute flex justify-between">
            <span>{match.listing?.location} → {match.requirement?.deliveryLocation}</span>
            <span>{match.distanceKm} km • {vehicle === 'refrigerated' ? '❄️ Cold-Chain' : 'Standard Vehicle'}</span>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">{t('matches.offeredPrice', 'Offer Price (₹/kg)')}</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">{t('matches.offerQuantity', 'Quantity (kg)')}</label>
              <input
                type="number"
                min="1"
                max={availableQty}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">{t('matches.notes', 'Message (optional)')}</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
              placeholder="e.g., Harvested yesterday morning, packed in ventilated crates..."
            />
          </div>

          {total > 0 && (
            <div className="rounded-xl bg-forest/10 px-4 py-3 dark:bg-harvest/10">
              <div className="text-xs text-mute">{t('transactions.totalValue', 'Total Transaction Value')}</div>
              <div className="font-extrabold tabular text-xl text-forest dark:text-harvest">₹{total.toLocaleString('en-IN')}</div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium dark:border-night-mute/20">
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="rounded-lg bg-forest px-5 py-2 text-sm font-bold text-white hover:bg-forest-deep disabled:opacity-50 dark:bg-harvest dark:text-ink">
              {loading ? t('matches.submitting', 'Submitting...') : t('common.submit', 'Submit Offer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState('direct'); // 'direct' | 'pools'
  const [matches, setMatches] = useState([]);
  const [multiFarmerResults, setMultiFarmerResults] = useState([]);
  const [supplyPools, setSupplyPools] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [offerMatchData, setOfferMatchData] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const listingId = params.get('listingId');
  const requirementId = params.get('requirementId');

  async function loadMatches() {
    setLoading(true);
    setErr('');
    try {
      const queryParts = [];
      if (listingId) queryParts.push(`listingId=${listingId}`);
      if (requirementId) queryParts.push(`requirementId=${requirementId}`);
      const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';

      const { data } = await api.get(`/marketplace/matches${queryString}`);
      setMatches(data.matches || []);
      setMultiFarmerResults(data.multiFarmerResults || []);
      setSupplyPools(data.supplyPools || []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMatches();
  }, []);

  if (err) return <ErrorState message={err} onRetry={loadMatches} />;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('matches.eyebrow', 'AI Trade Viability & Matching Engine')}
        title={t('matches.title', 'Produce–Demand Intelligence')}
        subtitle={t('matches.subtitle', 'Ranks direct buyers by True Net Farmer Realization, logistics cost, and transit spoilage risk rather than gross price alone.')}
        actions={
          <div className="flex items-center gap-2">
            <DataStatusBadge status="AI_FORECAST" />
            <button onClick={loadMatches} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold hover:bg-earth dark:border-night-mute/20 dark:hover:bg-night-lift">
              {t('matches.reRunMatching', 'Re-Run Viability & Matching')}
            </button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-line dark:border-night-mute/30 pb-2">
        <button
          type="button"
          onClick={() => setTab('direct')}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
            tab === 'direct'
              ? 'border-forest text-forest dark:border-harvest dark:text-harvest'
              : 'border-transparent text-mute hover:text-ink'
          }`}
        >
          <Zap size={16} />
          <span>Direct Buyer Matches ({matches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('pools')}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
            tab === 'pools'
              ? 'border-harvest text-harvest'
              : 'border-transparent text-mute hover:text-ink'
          }`}
        >
          <Users size={16} />
          <span>FPO Supply Pools ({supplyPools.length})</span>
        </button>
      </div>

      {tab === 'direct' ? (
        <>
          {/* Multi-farmer supply matches */}
          {multiFarmerResults.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-bold flex items-center gap-2 text-harvest">
                <Users size={18} />
                Multi-Farmer Supply Pooling Matches
              </h3>
              <div className="space-y-4">
                {multiFarmerResults.map((result, idx) => (
                  <MultiFarmerCard key={idx} result={result} />
                ))}
              </div>
            </section>
          )}

          {/* Individual matches */}
          <section className="space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-ink dark:text-night-text">
              <Zap size={18} className="text-forest" />
              Direct Trade Viability Rankings
            </h3>

            {matches.length === 0 ? (
              <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
                <Target size={32} className="mx-auto text-mute" />
                <div className="mt-3 text-sm font-medium text-mute">{t('common.noMatches', 'No matches found')}</div>
                <div className="mt-1 text-xs text-mute">{t('matches.subtitle', 'Create listings and requirements, then run matching.')}</div>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((m) => (
                  <MatchCard
                    key={m._id}
                    match={m}
                    currentUser={user}
                    onMakeOffer={setOfferMatchData}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        /* Supply Pools Tab */
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-harvest">
              <Users size={18} />
              Digital Supply Aggregation Pools
            </h3>
            <span className="text-xs text-mute">Coordinated FPO Collection • Reduced Freight</span>
          </div>

          {supplyPools.length === 0 ? (
            <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
              <Users size={32} className="mx-auto text-mute" />
              <div className="mt-3 text-sm font-medium text-mute">No active supply pools at the moment</div>
              <div className="mt-1 text-xs text-mute">Supply pools are created when buyer requirements exceed individual farmer capacity.</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {supplyPools.map((pool) => (
                <SupplyPoolCard
                  key={pool._id}
                  pool={pool}
                  currentUser={user}
                  onContributed={loadMatches}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {offerMatchData && (
        <OfferModal
          matchData={offerMatchData}
          currentUser={user}
          onClose={() => setOfferMatchData(null)}
        />
      )}
    </div>
  );
}
