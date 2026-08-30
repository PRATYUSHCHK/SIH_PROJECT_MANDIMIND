import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator.jsx';
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
} from 'lucide-react';

function OpportunityCard({ opp, type }) {
  if (type === 'SELL') {
    return (
      <div className="relative overflow-hidden rounded-[18px] border border-forest/20 bg-white p-6 shadow-card dark:border-harvest/20 dark:bg-night-card">
        <div className="absolute left-0 top-0 h-full w-1.5 bg-forest" />
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-forest animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-forest dark:text-harvest">
            Today's AI Opportunity — SELL
          </span>
          <DataStatusBadge status="AI_FORECAST" />
        </div>

        <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-forest-ink dark:text-night-text">
          SELL {opp.listing?.quantityKg} KG {opp.listing?.commodityName?.toUpperCase()}
        </h3>

        <div className="mt-4 grid gap-4 rounded-xl bg-earth/60 p-4 dark:bg-night-lift/50 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mute">Buyer</div>
            <div className="mt-0.5 font-bold text-ink dark:text-night-text">{opp.requirement?.buyer?.name || 'Buyer'}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mute">Buyer Offer</div>
            <div className="mt-0.5 font-bold tabular text-ink dark:text-night-text">₹{opp.requirement?.maximumPriceInr}/kg</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mute">AI Fair Price</div>
            <div className="mt-0.5 font-bold tabular text-forest dark:text-harvest">₹{opp.fairPrice}/kg</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mute">Est. Transport</div>
            <div className="mt-0.5 font-bold tabular text-ink dark:text-night-text">₹{opp.transportCostPerKg}/kg</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-mute">Estimated Farmer Net</div>
            <div className="mt-1 font-extrabold tabular text-xl text-forest dark:text-harvest">
              ₹{opp.estimatedFarmerNet}/kg
            </div>
          </div>
          <ConfidenceIndicator value={opp.aiConfidence} />
        </div>

        {/* Reasons */}
        {opp.matchReasons?.length > 0 && (
          <div className="mt-4 border-t border-line/60 pt-3 dark:border-night-mute/30">
            <div className="text-xs font-bold uppercase tracking-wider text-mute">Why This Deal?</div>
            <ul className="mt-2 space-y-1 text-sm text-ink dark:text-night-text">
              {opp.matchReasons.filter(r => r.startsWith('✓')).map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-forest font-bold">•</span>
                  <span>{reason.replace('✓ ', '')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <a
            href={`/matches?listingId=${opp.listing?._id}`}
            className="flex items-center gap-2 rounded-full border border-forest/30 bg-forest/10 px-5 py-2 text-xs font-bold text-forest hover:bg-forest hover:text-white dark:border-harvest/30 dark:bg-harvest/10 dark:text-harvest transition-colors"
          >
            View Deal <ArrowRight size={14} />
          </a>
        </div>
      </div>
    );
  }

  // BUY type
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-harvest/20 bg-white p-6 shadow-card dark:border-harvest/20 dark:bg-night-card">
      <div className="absolute left-0 top-0 h-full w-1.5 bg-harvest" />
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 rounded-full bg-harvest animate-pulse" />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-harvest">
          Today's AI Opportunity — BUY
        </span>
        <DataStatusBadge status="AI_FORECAST" />
      </div>

      <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-ink dark:text-night-text">
        {opp.requirement?.commodityName?.toUpperCase()} — Required: {opp.requirement?.quantityKg} KG
      </h3>

      <div className="mt-4 grid gap-4 rounded-xl bg-earth/60 p-4 dark:bg-night-lift/50 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-mute">Nearby Available</div>
          <div className="mt-0.5 font-bold tabular text-forest dark:text-harvest">{opp.totalAvailableKg} kg</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-mute">AI Fair Price</div>
          <div className="mt-0.5 font-bold tabular">₹{opp.fairPrice}/kg</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-mute">Matched Suppliers</div>
          <div className="mt-0.5 font-bold">{opp.matchedSuppliers?.length || 0}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-mute">Est. Logistics</div>
          <div className="mt-0.5 font-bold tabular">₹{opp.estimatedLogisticsPerKg}/kg</div>
        </div>
      </div>

      {/* Top suppliers */}
      {opp.matchedSuppliers?.length > 0 && (
        <div className="mt-4 border-t border-line/60 pt-3 dark:border-night-mute/30">
          <div className="text-xs font-bold uppercase tracking-wider text-mute">Best Matched Suppliers</div>
          <div className="mt-2 space-y-1.5">
            {opp.matchedSuppliers.slice(0, 3).map((s, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-earth/40 px-3 py-2 dark:bg-night-lift/30">
                <div className="flex items-center gap-2">
                  <Target size={12} className="text-forest" />
                  <span className="text-sm font-medium">{s.listing?.farmer?.name}</span>
                  <span className="text-xs text-mute">{s.listing?.location}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="tabular">{s.listing?.availableQuantityKg} kg @ ₹{s.listing?.expectedPriceInr}/kg</span>
                  <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-bold text-forest">{s.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <a
          href={`/matches?requirementId=${opp.requirement?._id}`}
          className="flex items-center gap-2 rounded-full border border-harvest/30 bg-harvest/10 px-5 py-2 text-xs font-bold text-harvest hover:bg-harvest hover:text-ink transition-colors"
        >
          View Matches <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [listings, setListings] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    setErr('');
    try {
      const [oppRes, listRes] = await Promise.all([
        api.get('/marketplace/opportunities'),
        api.get('/marketplace/listings'),
      ]);
      setOpportunities(oppRes.data.opportunities || []);
      setListings(listRes.data.listings || []);
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
        eyebrow="Farmer Dashboard"
        title="What should I sell today?"
        subtitle="AI-powered marketplace opportunities based on your produce, market demand, and fair pricing."
        actions={<DataStatusBadge status="AI_FORECAST" />}
      />

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-mm border border-line bg-white px-4 py-4 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] font-medium uppercase tracking-wide text-mute">Active Listings</div>
          <div className="mt-1 text-2xl font-bold tabular">{listings.length}</div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-4 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] font-medium uppercase tracking-wide text-mute">AI Opportunities</div>
          <div className="mt-1 text-2xl font-bold tabular text-forest">{opportunities.filter(o => o.type === 'SELL').length}</div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-4 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] font-medium uppercase tracking-wide text-mute">Quick Actions</div>
          <div className="mt-1 flex gap-2">
            <a href="/marketplace" className="rounded-lg bg-forest/10 px-3 py-1 text-xs font-bold text-forest hover:bg-forest hover:text-white transition-colors">
              List Produce
            </a>
            <a href="/matches" className="rounded-lg bg-harvest/10 px-3 py-1 text-xs font-bold text-harvest hover:bg-harvest hover:text-ink transition-colors">
              Find Buyers
            </a>
          </div>
        </div>
      </div>

      {/* Opportunities */}
      <section>
        <h3 className="mb-3 font-bold flex items-center gap-2">
          <Sparkles size={18} className="text-forest" />
          AI Trade Opportunities
        </h3>
        {opportunities.filter(o => o.type === 'SELL').length === 0 ? (
          <div className="rounded-mm border border-dashed border-line bg-earth/30 p-8 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
            <Zap size={28} className="mx-auto text-mute" />
            <div className="mt-2 text-sm font-medium text-mute">No selling opportunities right now</div>
            <div className="mt-1 text-xs text-mute">List your produce on the marketplace to find AI-matched buyers.</div>
          </div>
        ) : (
          <div className="space-y-6">
            {opportunities.filter(o => o.type === 'SELL').map((opp, idx) => (
              <OpportunityCard key={idx} opp={opp} type="SELL" />
            ))}
          </div>
        )}
      </section>

      {/* Buying opportunities for admin/seller */}
      {opportunities.filter(o => o.type === 'BUY').length > 0 && (
        <section>
          <h3 className="mb-3 font-bold flex items-center gap-2">
            <ShoppingBasket size={18} className="text-harvest" />
            Buying Opportunities
          </h3>
          <div className="space-y-6">
            {opportunities.filter(o => o.type === 'BUY').map((opp, idx) => (
              <OpportunityCard key={idx} opp={opp} type="BUY" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
