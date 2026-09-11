import { useState } from 'react';
import { useTranslation } from '../i18n/index.jsx';
import { api } from '../services/api.js';
import { DataStatusBadge } from './DataStatusBadge.jsx';
import { SupplyPoolDetailModal } from './SupplyPoolDetailModal.jsx';
import {
  Users,
  Package,
  IndianRupee,
  MapPin,
  Truck,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  Building2,
  Clock,
  ShieldCheck,
  Navigation,
  CheckCircle2,
  X,
} from 'lucide-react';

export function SupplyPoolCard({ pool, currentUser, onContributed }) {
  const { t } = useTranslation();
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(pool.targetPriceInr || '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const collected = pool.collectedQuantityKg || 0;
  const target = pool.targetQuantityKg || 1000;
  const progressPct = Math.min(100, Math.round((collected / target) * 100));
  const remaining = Math.max(0, target - collected);
  const contributors = pool.contributors || [];
  const status = pool.status || 'open';

  const isFarmer = currentUser?.role === 'farmer' || currentUser?.role === 'seller';
  const isBuyer =
    currentUser?.role === 'buyer' ||
    (pool.buyer?._id && pool.buyer._id.toString() === currentUser?._id?.toString()) ||
    pool.buyer?.toString() === currentUser?._id?.toString();

  // Find my contribution if logged in as farmer
  const myContrib = contributors.find(
    (c) =>
      (c.farmer?._id && c.farmer._id.toString() === currentUser?._id?.toString()) ||
      c.farmer?.toString() === currentUser?._id?.toString()
  );

  const buyerName = pool.buyerName || pool.buyer?.name || 'Hyderabad Fresh Foods';

  async function handleContribute(e) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      await api.post(`/marketplace/pools/${pool._id}/contribute`, {
        quantityKg: Number(qty),
        offeredPriceInr: Number(price),
      });
      setShowContributeModal(false);
      if (onContributed) onContributed();
    } catch (error) {
      setErr(error.response?.data?.message || error.response?.data?.error || 'Failed to contribute to pool');
    }
    setLoading(false);
  }

  // Action button text and color based on state
  function getActionButton() {
    if (status === 'open' && remaining > 0 && isFarmer && !myContrib) {
      return {
        label: t('pool.contribute', 'Contribute Produce'),
        icon: Plus,
        className: 'bg-forest hover:bg-forest-deep text-white dark:bg-harvest dark:text-ink',
        onClick: () => setShowContributeModal(true),
      };
    }

    if (status === 'target_reached' || status === 'buyer_confirmation_pending') {
      if (isBuyer) {
        return {
          label: 'Review & Confirm Pooled Order',
          icon: CheckCircle2,
          className: 'bg-forest hover:bg-forest-deep text-white dark:bg-harvest dark:text-ink',
          onClick: () => setShowDetailModal(true),
        };
      }
      return {
        label: 'Ready for Buyer Confirmation',
        icon: ArrowRight,
        className: 'bg-harvest hover:opacity-90 text-ink',
        onClick: () => setShowDetailModal(true),
      };
    }

    if (status === 'buyer_confirmed') {
      return {
        label: 'Order Confirmed • Plan Delivery',
        icon: Truck,
        className: 'bg-forest hover:bg-forest-deep text-white dark:bg-harvest dark:text-ink',
        onClick: () => setShowDetailModal(true),
      };
    }

    if (status === 'pickup_scheduled' || status === 'pickup_in_progress') {
      return {
        label: 'Vehicle Assigned • View Pickups',
        icon: Truck,
        className: 'bg-forest hover:bg-forest-deep text-white dark:bg-harvest dark:text-ink',
        onClick: () => setShowDetailModal(true),
      };
    }

    if (status === 'consolidated') {
      return {
        label: 'Consolidated • Track Dispatch',
        icon: Navigation,
        className: 'bg-forest hover:bg-forest-deep text-white dark:bg-harvest dark:text-ink',
        onClick: () => setShowDetailModal(true),
      };
    }

    if (status === 'in_transit' || status === 'arriving') {
      return {
        label: 'In Transit • Track Shipment',
        icon: Navigation,
        className: 'bg-harvest hover:opacity-90 text-ink',
        onClick: () => setShowDetailModal(true),
      };
    }

    if (status === 'delivered') {
      return {
        label: isBuyer ? 'Delivered • View Settlement' : 'Delivered • View Settlement',
        icon: IndianRupee,
        className: 'bg-forest hover:bg-forest-deep text-white dark:bg-harvest dark:text-ink',
        onClick: () => setShowDetailModal(true),
      };
    }

    if (status === 'completed') {
      return {
        label: 'Completed • View Payment Receipt',
        icon: ShieldCheck,
        className: 'bg-forest text-white',
        onClick: () => setShowDetailModal(true),
      };
    }

    return {
      label: 'View Order Details',
      icon: ArrowRight,
      className: 'bg-earth hover:bg-earth/80 text-ink dark:bg-night-lift dark:text-night-text',
      onClick: () => setShowDetailModal(true),
    };
  }

  const action = getActionButton();
  const ActionIcon = action.icon;

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-4">
      {/* Header with Buyer Information */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3 dark:border-night-mute/30">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest">
            <Users size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-ink dark:text-night-text">
                {pool.commodityName} — Coordinated Supply Pool
              </h4>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                status === 'completed' || status === 'delivered' ? 'bg-forest/15 text-forest' :
                status === 'target_reached' || status === 'buyer_confirmed' || status === 'in_transit' ? 'bg-harvest/20 text-harvest font-black' :
                'bg-forest/15 text-forest'
              }`}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-mute mt-0.5">
              <span className="flex items-center gap-1 font-semibold text-ink dark:text-night-text">
                <Building2 size={12} className="text-forest dark:text-harvest" />
                Buyer: {buyerName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {pool.destinationLocation || 'Hyderabad'}
              </span>
            </div>
          </div>
        </div>
        <DataStatusBadge status="SIMULATED" />
      </div>

      {/* Progress Bar & Stats */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold text-ink dark:text-night-text">
            {collected.toLocaleString('en-IN')} kg / {target.toLocaleString('en-IN')} kg {t('pool.collected', 'Collected')}
          </span>
          <span className="font-extrabold text-forest dark:text-harvest tabular">{progressPct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-earth dark:bg-night-lift">
          <div
            className="h-full bg-forest transition-all duration-500 dark:bg-harvest"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Pricing & Key Metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div className="rounded-lg bg-earth/40 p-2.5 dark:bg-night-lift/30">
          <div className="text-[10px] uppercase text-mute">{t('pool.targetPrice', 'Target Price')}</div>
          <div className="mt-0.5 font-bold tabular text-ink dark:text-night-text">₹{pool.targetPriceInr}/kg</div>
        </div>
        <div className="rounded-lg bg-earth/40 p-2.5 dark:bg-night-lift/30">
          <div className="text-[10px] uppercase text-mute">Total Value</div>
          <div className="mt-0.5 font-bold tabular text-forest dark:text-harvest">
            ₹{((pool.collectedQuantityKg || target) * pool.targetPriceInr).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-lg bg-earth/40 p-2.5 dark:bg-night-lift/30">
          <div className="text-[10px] uppercase text-mute">{t('pool.participatingFarmers', 'Farmers Joined')}</div>
          <div className="mt-0.5 font-bold text-ink dark:text-night-text">{contributors.length} Farmers</div>
        </div>
        <div className="rounded-lg bg-earth/40 p-2.5 dark:bg-night-lift/30">
          <div className="text-[10px] uppercase text-mute">Fulfillment Status</div>
          <div className="mt-0.5 font-bold tabular text-harvest capitalize">
            {status.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Individual Contribution Highlight for Logged-In Farmer */}
      {isFarmer && myContrib && (
        <div className="rounded-lg border border-forest/30 bg-forest/5 p-3 dark:border-harvest/30 dark:bg-harvest/5 flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-forest dark:text-harvest">
              🌾 Your Contribution
            </div>
            <div className="font-bold text-ink dark:text-night-text">
              {myContrib.quantityKg} kg @ ₹{myContrib.offeredPriceInr || pool.targetPriceInr}/kg
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-mute uppercase">Your Expected Gross</div>
            <div className="font-extrabold text-sm text-forest dark:text-harvest tabular">
              ₹{(myContrib.quantityKg * (myContrib.offeredPriceInr || pool.targetPriceInr)).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* Contributors Summary */}
      {contributors.length > 0 && (
        <div className="space-y-1.5 text-xs">
          <div className="font-bold uppercase tracking-wider text-mute flex items-center justify-between">
            <span>{t('pool.contributorsList', 'Participating Suppliers')}</span>
            <span className="text-[10px] text-mute">Consolidated pickup route</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
            {contributors.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between rounded bg-earth/30 px-2.5 py-1 text-ink dark:bg-night-lift/30 dark:text-night-text">
                <span className="font-medium">{c.farmerName || c.farmer?.name || c.location || `Farmer ${idx + 1}`}</span>
                <span className="text-mute">{c.location}</span>
                <span className="tabular font-bold text-forest dark:text-harvest">{c.quantityKg} kg @ ₹{c.offeredPriceInr || pool.targetPriceInr}/kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60 dark:border-night-mute/30">
        <div className="text-[11px] text-mute flex items-center gap-1.5">
          <Truck size={13} />
          <span>
            {status === 'open' && remaining > 0 ? `${remaining} kg remaining to reach target` :
             status === 'target_reached' || status === 'buyer_confirmation_pending' ? 'Target reached — waiting for buyer confirmation' :
             status === 'buyer_confirmed' ? 'Order confirmed by buyer' :
             status === 'pickup_scheduled' || status === 'pickup_in_progress' ? 'Multi-stop pickup in progress' :
             status === 'consolidated' ? 'Produce consolidated in cargo vehicle' :
             status === 'in_transit' ? 'Shipment in transit to buyer' :
             status === 'delivered' ? 'Shipment delivered to buyer' : 'Order & payment completed'}
          </span>
        </div>

        <button
          type="button"
          onClick={action.onClick}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-sm ${action.className}`}
        >
          <ActionIcon size={14} />
          <span>{action.label}</span>
        </button>
      </div>

      {/* Supply Pool Detail Modal */}
      {showDetailModal && (
        <SupplyPoolDetailModal
          poolId={pool._id}
          currentUser={currentUser}
          onClose={() => setShowDetailModal(false)}
          onUpdated={() => {
            if (onContributed) onContributed();
          }}
        />
      )}

      {/* Contribution Modal */}
      {showContributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-2xl dark:border-night-mute/20 dark:bg-night-card space-y-4">
            <div className="flex items-center justify-between border-b border-line/60 pb-3 dark:border-night-mute/30">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-harvest" />
                <h3 className="font-bold text-ink dark:text-night-text">
                  {t('pool.contributeTitle', 'Contribute to Supply Pool')}
                </h3>
              </div>
              <button onClick={() => setShowContributeModal(false)} className="text-mute hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {err && <div className="rounded-lg bg-alert/10 p-2.5 text-xs text-alert">{err}</div>}

            <form onSubmit={handleContribute} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-mute mb-1">{t('common.commodity', 'Commodity')}</label>
                <div className="font-bold text-sm text-ink dark:text-night-text">{pool.commodityName} ({pool.qualityGrade || 'Grade A'})</div>
              </div>

              <div>
                <label className="block font-bold text-mute mb-1">
                  {t('pool.quantityToCommit', 'Quantity to Commit (kg)')} — (Remaining: {remaining} kg)
                </label>
                <input
                  type="number"
                  min="1"
                  max={remaining}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder={`e.g. ${Math.min(200, remaining)}`}
                  required
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
                />
              </div>

              <div>
                <label className="block font-bold text-mute mb-1">{t('pool.offeredPrice', 'Expected Price (₹/kg)')}</label>
                <input
                  type="number"
                  step="0.5"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={`₹${pool.targetPriceInr}/kg`}
                  required
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
                />
              </div>

              <div className="rounded-lg bg-forest/5 p-3 text-[11px] text-mute border border-forest/20">
                ✓ Aggregated transport will pick up produce directly from your farm cluster, reducing freight expenses.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContributeModal(false)}
                  className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-earth dark:border-night-mute/20 dark:hover:bg-night-lift"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-forest px-4 py-2 font-bold text-white hover:bg-forest-deep disabled:opacity-50 dark:bg-harvest dark:text-ink"
                >
                  {loading ? 'Submitting...' : t('pool.confirmCommitment', 'Confirm Contribution')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
