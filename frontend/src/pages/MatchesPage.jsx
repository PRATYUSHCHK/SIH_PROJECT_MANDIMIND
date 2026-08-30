import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator.jsx';
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

function MatchCard({ match, onMakeOffer }) {
  const [expanded, setExpanded] = useState(false);
  const listing = match.listing;
  const requirement = match.requirement;

  if (!listing || !requirement) return null;

  const verdictColor = {
    'FAIR_DEAL': 'bg-forest/15 text-forest border-forest/30',
    'GOOD_FOR_FARMER': 'bg-harvest/15 text-harvest border-harvest/30',
    'GOOD_FOR_BUYER': 'bg-info/15 text-info border-info/30',
    'OVERPRICED': 'bg-alert/15 text-alert border-alert/30',
    'UNDERPRICED': 'bg-mute/15 text-mute border-mute/30',
  }[match.dealVerdict] || 'bg-earth text-ink';

  return (
    <div className="rounded-mm border border-line bg-white p-6 shadow-card dark:border-night-mute/20 dark:bg-night-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MatchScoreBadge score={match.matchScore} />
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${verdictColor}`}>
            {match.dealVerdict?.replace('_', ' ')}
          </span>
          <DataStatusBadge status="AI_FORECAST" />
        </div>
      </div>

      {/* Match overview */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[11px] uppercase text-mute">Commodity</div>
          <div className="mt-0.5 font-bold text-ink dark:text-night-text">{listing.commodityName}</div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[11px] uppercase text-mute">Quantity</div>
          <div className="mt-0.5 font-bold tabular text-ink dark:text-night-text">{listing.quantityKg} kg</div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[11px] uppercase text-mute">Farmer → Buyer</div>
          <div className="mt-0.5 text-xs text-ink dark:text-night-text">
            {listing.farmer?.name} → {requirement.buyer?.name}
          </div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[11px] uppercase text-mute">AI Fair Price</div>
          <div className="mt-0.5 font-bold tabular text-forest dark:text-harvest">₹{match.aiFairPriceInr}/kg</div>
        </div>
      </div>

      {/* Match Reasons */}
      <div className="mt-4 border-t border-line/60 pt-4 dark:border-night-mute/30">
        <div className="text-xs font-bold uppercase tracking-wider text-mute">Match Analysis</div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {(match.matchReasons || []).map((reason, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {reason.startsWith('✓') ? (
                <Check size={14} className="text-forest shrink-0" />
              ) : reason.startsWith('~') ? (
                <span className="text-harvest shrink-0">~</span>
              ) : (
                <XIcon size={14} className="text-alert shrink-0" />
              )}
              <span className="text-ink dark:text-night-text">{reason.replace(/^[✓~✗]\s*/, '')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Demand Trend */}
      {match.demandTrend && (
        <div className="mt-3 flex items-center gap-2 text-xs text-mute">
          {match.demandTrend === 'up' ? (
            <><TrendingUp size={14} className="text-forest" /> Demand trend: increasing</>
          ) : (
            <><TrendingDown size={14} className="text-alert" /> Demand trend: softening</>
          )}
        </div>
      )}

      {/* Expand details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs font-bold text-forest hover:text-forest-deep dark:text-harvest"
      >
        {expanded ? 'Hide details' : 'Show price details'}
      </button>

      {expanded && (
        <div className="mt-3 grid gap-3 rounded-lg bg-earth/40 p-4 dark:bg-night-lift/30 sm:grid-cols-3">
          <div>
            <div className="text-[10px] uppercase text-mute">Farmer Asking</div>
            <div className="font-bold tabular">₹{listing.expectedPriceInr}/kg</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-mute">Buyer Max</div>
            <div className="font-bold tabular">₹{requirement.maximumPriceInr}/kg</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-mute">AI Fair Price</div>
            <div className="font-bold tabular text-forest dark:text-harvest">₹{match.aiFairPriceInr}/kg</div>
          </div>
          {match.aiPriceRange && (
            <div className="sm:col-span-3">
              <div className="text-[10px] uppercase text-mute">AI Predicted Range</div>
              <div className="font-bold tabular">₹{match.aiPriceRange.lower} – ₹{match.aiPriceRange.upper}/kg</div>
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onMakeOffer(match)}
          className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest-deep transition-colors dark:bg-harvest dark:text-ink"
        >
          Make Offer <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function MultiFarmerCard({ result }) {
  return (
    <div className="rounded-mm border-2 border-harvest/30 bg-harvest/5 p-6">
      <div className="flex items-center gap-2 text-harvest">
        <Users size={18} />
        <span className="text-sm font-extrabold uppercase">Combined Supply Match</span>
      </div>
      <div className="mt-3">
        <div className="text-sm text-ink dark:text-night-text">
          Buyer needs <strong>{result.requirement?.quantityKg} kg</strong> of <strong>{result.requirement?.commodityName}</strong>.
          Multiple suppliers can fulfill this order:
        </div>
        <div className="mt-3 space-y-2">
          {result.suppliers?.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 dark:bg-night-card/80">
              <span className="text-sm font-medium">{s.listing?.farmer?.name || 'Farmer'}</span>
              <span className="text-xs text-mute">{s.listing?.location}</span>
              <span className="font-bold tabular">{s.listing?.availableQuantityKg} kg @ ₹{s.listing?.expectedPriceInr}/kg</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-forest/10 px-3 py-2">
          <span className="text-sm font-bold">Total Available</span>
          <span className="font-bold tabular text-forest">{result.totalSupplyKg} kg</span>
        </div>
      </div>
    </div>
  );
}

function OfferModal({ match, onClose }) {
  const [price, setPrice] = useState(match.aiFairPriceInr || '');
  const [qty, setQty] = useState(match.listing?.availableQuantityKg || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/marketplace/offers', {
        listingId: match.listing?._id,
        requirementId: match.requirement?._id,
        priceInr: Number(price),
        quantityKg: Number(qty),
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-mm bg-white p-8 text-center shadow-card dark:bg-night-card">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-forest/10">
            <Check size={32} className="text-forest" />
          </div>
          <h3 className="mt-4 text-xl font-bold">Offer Submitted!</h3>
          <p className="mt-2 text-sm text-mute">The farmer will be notified of your offer. You can track the status in Transactions.</p>
          <button onClick={onClose} className="mt-6 rounded-lg bg-forest px-6 py-2.5 text-sm font-bold text-white hover:bg-forest-deep">
            Done
          </button>
        </div>
      </div>
    );
  }

  const total = Number(price) * Number(qty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-mm bg-white p-6 shadow-card dark:bg-night-card max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Make an Offer</h2>
          <button onClick={onClose} className="text-mute hover:text-ink"><XIcon size={20} /></button>
        </div>
        <div className="rounded-lg bg-earth/50 p-4 dark:bg-night-lift/40 mb-4">
          <div className="text-sm font-bold">{match.listing?.commodityName}</div>
          <div className="text-xs text-mute">
            {match.listing?.quantityKg} kg • {match.listing?.qualityGrade} • {match.listing?.location}
          </div>
          <div className="mt-2 text-xs text-mute">
            AI Fair Price: <span className="font-bold text-forest dark:text-harvest">₹{match.aiFairPriceInr}/kg</span>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">Your Offer (₹/kg)</label>
              <input type="number" min="0" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">Quantity (kg)</label>
              <input type="number" min="1" max={match.listing?.availableQuantityKg} value={qty} onChange={(e) => setQty(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Message (optional)</label>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" placeholder="Add any notes for the farmer..." />
          </div>
          {total > 0 && (
            <div className="rounded-lg bg-forest/10 px-4 py-3 dark:bg-harvest/10">
              <div className="text-xs text-mute">Total Transaction Value</div>
              <div className="font-extrabold tabular text-xl text-forest dark:text-harvest">₹{total.toLocaleString('en-IN')}</div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium dark:border-night-mute/20">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest-deep disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [multiFarmerResults, setMultiFarmerResults] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [offerMatch, setOfferMatch] = useState(null);

  // Get query params
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
        eyebrow="AI Matching Engine"
        title="Produce–Demand Matches"
        subtitle="AI matches farmer listings with buyer requirements using commodity, quality, price, location, and demand data."
        actions={
          <div className="flex items-center gap-2">
            <DataStatusBadge status="AI_FORECAST" />
            <button onClick={loadMatches} className="rounded-full border border-line px-3 py-2 text-xs font-bold hover:bg-earth dark:border-night-mute/20 dark:hover:bg-night-lift">
              Re-Run Matching
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-earth/40 px-4 py-2 text-xs text-mute dark:border-night-mute/20 dark:bg-night-lift/40">
        <div>
          <span className="font-bold text-ink dark:text-night-text">Data Source:</span> AI_FORECAST using existing demand, price, and supply forecasts
        </div>
        <div>
          <span className="font-bold text-ink dark:text-night-text">Matches Found:</span> {matches.length}
        </div>
      </div>

      {/* Multi-farmer consolidation results */}
      {multiFarmerResults.length > 0 && (
        <section>
          <h3 className="mb-3 font-bold flex items-center gap-2">
            <Users size={18} className="text-harvest" />
            Consolidated Supply Matches
          </h3>
          <div className="space-y-4">
            {multiFarmerResults.map((result, idx) => (
              <MultiFarmerCard key={idx} result={result} />
            ))}
          </div>
        </section>
      )}

      {/* Individual matches */}
      <section>
        <h3 className="mb-3 font-bold flex items-center gap-2">
          <Zap size={18} className="text-forest" />
          Individual Matches
        </h3>
        {matches.length === 0 ? (
          <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
            <Target size={32} className="mx-auto text-mute" />
            <div className="mt-3 text-sm font-medium text-mute">No matches found</div>
            <div className="mt-1 text-xs text-mute">Create listings and requirements, then run matching.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((m) => (
              <MatchCard key={m._id} match={m} onMakeOffer={setOfferMatch} />
            ))}
          </div>
        )}
      </section>

      {offerMatch && (
        <OfferModal match={offerMatch} onClose={() => setOfferMatch(null)} />
      )}
    </div>
  );
}
