import { useState } from 'react';
import { useTranslation } from '../i18n/index.jsx';
import { api } from '../services/api.js';
import { DataStatusBadge } from './DataStatusBadge.jsx';
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
  X,
} from 'lucide-react';

export function SupplyPoolCard({ pool, currentUser, onContributed }) {
  const { t } = useTranslation();
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(pool.targetPriceInr || '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const collected = pool.collectedQuantityKg || 0;
  const target = pool.targetQuantityKg || 1000;
  const progressPct = Math.min(100, Math.round((collected / target) * 100));
  const remaining = Math.max(0, target - collected);
  const contributors = pool.contributors || [];
  const isFarmer = currentUser?.role === 'farmer' || currentUser?.role === 'seller' || currentUser?.role === 'admin';

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

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3 dark:border-night-mute/30">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-harvest/15 text-harvest">
            <Users size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-ink dark:text-night-text">
                {pool.commodityName} — Coordinated Supply Pool
              </h4>
              <span className="rounded-full bg-forest/15 px-2.5 py-0.5 text-[10px] font-bold text-forest uppercase">
                {pool.status?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-mute">
              Temporary multi-farmer order aggregation • {t('pool.destination', 'Destination')}: {pool.destinationLocation} • {pool.qualityGrade || 'Grade A'}
            </p>
          </div>
        </div>
        <DataStatusBadge status="SIMULATED" />
      </div>

      {/* Progress Bar & Stats */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold text-ink dark:text-night-text">
            {collected} kg / {target} kg {t('pool.collected', 'Collected')}
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
          <div className="text-[10px] uppercase text-mute">{t('pool.avgFarmerNet', 'Avg Farmer Net')}</div>
          <div className="mt-0.5 font-bold tabular text-forest dark:text-harvest">₹{pool.averageFarmerPriceInr || pool.targetPriceInr}/kg</div>
        </div>
        <div className="rounded-lg bg-earth/40 p-2.5 dark:bg-night-lift/30">
          <div className="text-[10px] uppercase text-mute">{t('pool.participatingFarmers', 'Farmers Joined')}</div>
          <div className="mt-0.5 font-bold text-ink dark:text-night-text">{contributors.length} Farmers</div>
        </div>
        <div className="rounded-lg bg-earth/40 p-2.5 dark:bg-night-lift/30">
          <div className="text-[10px] uppercase text-mute">{t('pool.remainingNeeded', 'Remaining')}</div>
          <div className="mt-0.5 font-bold tabular text-harvest">{remaining} kg</div>
        </div>
      </div>

      {/* Contributors Summary */}
      {contributors.length > 0 && (
        <div className="space-y-1.5 text-xs">
          <div className="font-bold uppercase tracking-wider text-mute">{t('pool.contributorsList', 'Participating Suppliers')}</div>
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
            {contributors.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between rounded bg-earth/30 px-2.5 py-1 text-ink dark:bg-night-lift/30 dark:text-night-text">
                <span className="font-medium">{c.farmer?.name || c.location || `Farmer ${idx + 1}`}</span>
                <span className="text-mute">{c.location}</span>
                <span className="tabular font-bold text-forest dark:text-harvest">{c.quantityKg} kg @ ₹{c.offeredPriceInr}/kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-between pt-2 border-t border-line/60 dark:border-night-mute/30">
        <div className="text-[11px] text-mute flex items-center gap-1.5">
          <Truck size={13} />
          <span>{t('pool.consolidatedPickup', 'Single consolidated pickup plan')}</span>
        </div>

        {isFarmer && remaining > 0 && (
          <button
            type="button"
            onClick={() => setShowContributeModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-forest px-4 py-1.5 text-xs font-bold text-white hover:bg-forest-deep transition-colors dark:bg-harvest dark:text-ink"
          >
            <Plus size={14} />
            <span>{t('pool.contribute', 'Contribute Produce')}</span>
          </button>
        )}
      </div>

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
