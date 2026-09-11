import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useTranslation } from '../i18n/index.jsx';
import { DataStatusBadge } from './DataStatusBadge.jsx';
import {
  Users,
  Package,
  IndianRupee,
  MapPin,
  Truck,
  Check,
  X,
  ArrowRight,
  Sparkles,
  Layers,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Building2,
  Navigation,
  FileText,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { key: 'target_reached', label: 'Target Reached', desc: '1,000 kg collected from farmers' },
  { key: 'buyer_confirmed', label: 'Buyer Confirmed', desc: 'Combined order verified' },
  { key: 'pickup_scheduled', label: 'Vehicle Assigned', desc: 'Consolidated pickup route' },
  { key: 'consolidated', label: 'Produce Consolidated', desc: 'All farm pickups loaded' },
  { key: 'in_transit', label: 'In Transit', desc: 'Direct transport to buyer' },
  { key: 'delivered', label: 'Delivered', desc: 'Received and verified by buyer' },
  { key: 'completed', label: 'Farmer Settlement', desc: 'Transparent payments credited' },
];

export function SupplyPoolDetailModal({ poolId, currentUser, onClose, onUpdated }) {
  const { t } = useTranslation();
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function fetchPool() {
    try {
      setLoading(true);
      setErr('');
      const { data } = await api.get(`/marketplace/pools/${poolId}`);
      setPool(data.pool);
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.error || 'Failed to load Supply Pool');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (poolId) fetchPool();
  }, [poolId]);

  if (!poolId) return null;

  const isBuyer =
    currentUser?.role === 'buyer' ||
    (pool?.buyer?._id && pool.buyer._id.toString() === currentUser?._id?.toString()) ||
    pool?.buyer?.toString() === currentUser?._id?.toString();

  const isFarmer = currentUser?.role === 'farmer' || currentUser?.role === 'seller';
  const isAdmin = currentUser?.role === 'admin';

  // Current user's contribution if farmer
  const myContrib = pool?.contributors?.find(
    (c) =>
      (c.farmer?._id && c.farmer._id.toString() === currentUser?._id?.toString()) ||
      c.farmer?.toString() === currentUser?._id?.toString()
  );

  const status = pool?.status || 'open';
  const shipment = pool?.shipment;
  const transaction = pool?.poolTransaction;

  // Determine current active step index in workflow
  function getStepIndex(currentStatus) {
    if (currentStatus === 'open' || currentStatus === 'target_reached' || currentStatus === 'buyer_confirmation_pending') return 0;
    if (currentStatus === 'buyer_confirmed') return 1;
    if (currentStatus === 'logistics_planned' || currentStatus === 'pickup_scheduled' || currentStatus === 'pickup_in_progress') return 2;
    if (currentStatus === 'consolidated') return 3;
    if (currentStatus === 'in_transit' || currentStatus === 'arriving') return 4;
    if (currentStatus === 'delivered') return 5;
    if (currentStatus === 'completed') return 6;
    return 0;
  }

  const currentStepIdx = getStepIndex(status);

  // 1. Buyer confirms order
  async function handleConfirmOrder() {
    setActionLoading(true);
    setErr('');
    setSuccessMsg('');
    try {
      const { data } = await api.post(`/marketplace/pools/${pool._id}/confirm`);
      setSuccessMsg(data.message || 'Combined order successfully confirmed!');
      await fetchPool();
      if (onUpdated) onUpdated();
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.error || 'Confirmation failed');
    } finally {
      setActionLoading(false);
    }
  }

  // 2. Transporter updates pickup stop status
  async function handlePickupStop(idx, newStatus) {
    setActionLoading(true);
    setErr('');
    setSuccessMsg('');
    try {
      const { data } = await api.patch(`/marketplace/pools/${pool._id}/pickup-stop`, {
        stopIndex: idx,
        status: newStatus,
      });
      setSuccessMsg(data.message || 'Pickup stop status updated.');
      await fetchPool();
      if (onUpdated) onUpdated();
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.error || 'Pickup update failed');
    } finally {
      setActionLoading(false);
    }
  }

  // 3. Advance shipment progression
  async function handleAdvanceShipment(nextStatus) {
    setActionLoading(true);
    setErr('');
    setSuccessMsg('');
    try {
      const { data } = await api.patch(`/marketplace/pools/${pool._id}/advance-shipment`, {
        nextStatus,
      });
      setSuccessMsg(data.message || `Shipment advanced to ${nextStatus.replace('_', ' ')}.`);
      await fetchPool();
      if (onUpdated) onUpdated();
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.error || 'Shipment progression failed');
    } finally {
      setActionLoading(false);
    }
  }

  // 4. Buyer confirms delivery receipt
  async function handleConfirmDelivery() {
    setActionLoading(true);
    setErr('');
    setSuccessMsg('');
    try {
      const { data } = await api.post(`/marketplace/pools/${pool._id}/confirm-delivery`);
      setSuccessMsg(data.message || 'Delivery successfully confirmed!');
      await fetchPool();
      if (onUpdated) onUpdated();
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.error || 'Delivery confirmation failed');
    } finally {
      setActionLoading(false);
    }
  }

  // 5. Disburse farmer settlements
  async function handleSettlePayment() {
    setActionLoading(true);
    setErr('');
    setSuccessMsg('');
    try {
      const { data } = await api.post(`/marketplace/pools/${pool._id}/settle`, {
        paymentMethod: 'UPI Multi-Party Disbursement',
      });
      setSuccessMsg(data.message || 'Farmer settlements completed!');
      await fetchPool();
      if (onUpdated) onUpdated();
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.error || 'Settlement failed');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-white shadow-2xl dark:border-night-mute/20 dark:bg-night-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/70 px-6 py-4 dark:border-night-mute/30 bg-earth/30 dark:bg-night-lift/30">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-white shadow-md">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-ink dark:text-night-text">
                  {pool?.commodityName || 'Produce'} — Multi-Farmer Supply Pool
                </h3>
                <span className="rounded-full bg-forest/15 px-2.5 py-0.5 text-[11px] font-extrabold text-forest uppercase tracking-wide">
                  {status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-mute flex items-center gap-1.5 mt-0.5">
                <Building2 size={13} className="text-forest dark:text-harvest" />
                <span>Buyer: <strong>{pool?.buyerName || pool?.buyer?.name || 'Hyderabad Fresh Foods'}</strong></span>
                <span>•</span>
                <MapPin size={13} />
                <span>Destination: {pool?.destinationLocation || 'Hyderabad'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DataStatusBadge status="SIMULATED" />
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-mute hover:bg-earth dark:hover:bg-night-lift hover:text-ink transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {err && (
            <div className="rounded-xl border border-alert/30 bg-alert/10 p-3.5 text-xs text-alert font-medium flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{err}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-forest/30 bg-forest/10 p-3.5 text-xs text-forest font-medium flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Visual Workflow Timeline */}
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm dark:border-night-mute/20 dark:bg-night-lift/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-ink dark:text-night-text uppercase tracking-wider text-[11px]">
                Fulfillment Workflow Progression
              </span>
              <span className="text-[10px] text-mute font-mono">SIMULATED DELIVERY WORKFLOW</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isPassed = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div
                    key={step.key}
                    className={`flex flex-col justify-between rounded-lg p-2.5 transition-all ${
                      isCurrent
                        ? 'border-2 border-forest bg-forest/10 text-forest shadow dark:border-harvest dark:bg-harvest/15 dark:text-harvest font-bold'
                        : isPassed
                        ? 'border border-forest/30 bg-forest/5 text-forest/80 dark:border-harvest/30 dark:bg-harvest/5'
                        : 'border border-line/60 bg-earth/20 text-mute dark:border-night-mute/20 dark:bg-night-lift/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold">STEP {idx + 1}</span>
                      {isPassed ? (
                        <Check size={12} className="text-forest dark:text-harvest" />
                      ) : isCurrent ? (
                        <span className="h-2 w-2 rounded-full bg-forest dark:bg-harvest animate-ping" />
                      ) : null}
                    </div>
                    <div className="text-[11px] font-bold leading-tight">{step.label}</div>
                    <div className="text-[9px] text-mute mt-1 line-clamp-2">{step.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Farmer-Specific Contribution Banner */}
          {isFarmer && myContrib && (
            <div className="rounded-xl border-2 border-forest/40 bg-gradient-to-r from-forest/10 via-earth/30 to-harvest/10 p-4 dark:border-harvest/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wide text-forest dark:text-harvest">
                  🌾 Your Individual Contribution
                </span>
                <span className="rounded-full bg-forest/15 px-2.5 py-0.5 text-[10px] font-bold text-forest uppercase">
                  {myContrib.pickupStatus} • {myContrib.settlementStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
                <div>
                  <div className="text-[10px] uppercase text-mute">Your Committed Produce</div>
                  <div className="text-base font-extrabold tabular text-ink dark:text-night-text">
                    {myContrib.quantityKg} kg
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-mute">Agreed Unit Price</div>
                  <div className="text-base font-extrabold tabular text-forest dark:text-harvest">
                    ₹{myContrib.offeredPriceInr || pool.targetPriceInr}/kg
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-mute">Your Gross Payout</div>
                  <div className="text-base font-extrabold tabular text-ink dark:text-night-text">
                    ₹{(myContrib.quantityKg * (myContrib.offeredPriceInr || pool.targetPriceInr)).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-mute">Total Pool Share</div>
                  <div className="text-base font-extrabold tabular text-mute">
                    {Math.round((myContrib.quantityKg / (pool.targetQuantityKg || 1000)) * 100)}% of {pool.targetQuantityKg} kg
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Pool Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-earth/40 p-3 dark:bg-night-lift/30">
              <div className="text-[10px] uppercase text-mute">Total Pool Quantity</div>
              <div className="mt-1 font-bold text-sm text-ink dark:text-night-text tabular">
                {pool?.collectedQuantityKg || 0} / {pool?.targetQuantityKg || 0} kg
              </div>
            </div>
            <div className="rounded-xl bg-earth/40 p-3 dark:bg-night-lift/30">
              <div className="text-[10px] uppercase text-mute">Agreed Target Price</div>
              <div className="mt-1 font-bold text-sm text-forest dark:text-harvest tabular">
                ₹{pool?.targetPriceInr}/kg
              </div>
            </div>
            <div className="rounded-xl bg-earth/40 p-3 dark:bg-night-lift/30">
              <div className="text-[10px] uppercase text-mute">Total Combined Value</div>
              <div className="mt-1 font-bold text-sm text-ink dark:text-night-text tabular">
                ₹{((pool?.collectedQuantityKg || 0) * (pool?.targetPriceInr || 0)).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="rounded-xl bg-earth/40 p-3 dark:bg-night-lift/30">
              <div className="text-[10px] uppercase text-mute">Participating Farmers</div>
              <div className="mt-1 font-bold text-sm text-ink dark:text-night-text">
                {pool?.contributors?.length || 0} Producers
              </div>
            </div>
          </div>

          {/* Participating Farmers & Multi-Stop Pickups */}
          <div className="rounded-xl border border-line p-4 dark:border-night-mute/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-ink dark:text-night-text flex items-center gap-2">
                <Truck size={15} className="text-forest" />
                <span>Multi-Stop Consolidated Pickup Plan</span>
              </h4>
              <span className="text-[11px] text-mute">
                Est. Freight: ₹{pool?.consolidatedLogistics?.totalTransportCostInr || 0} (₹{pool?.consolidatedLogistics?.transportCostPerKg || 0}/kg)
              </span>
            </div>

            <div className="space-y-2">
              {pool?.contributors?.map((c, idx) => {
                const isMe =
                  (c.farmer?._id && c.farmer._id.toString() === currentUser?._id?.toString()) ||
                  c.farmer?.toString() === currentUser?._id?.toString();

                const isStopPickedUp = c.pickupStatus === 'picked_up';
                const isStopInProgress = c.pickupStatus === 'in_progress';

                return (
                  <div
                    key={idx}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-all ${
                      isMe
                        ? 'border-forest/50 bg-forest/5 dark:bg-harvest/5'
                        : 'border-line/70 bg-earth/30 dark:border-night-mute/20 dark:bg-night-lift/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                        isStopPickedUp ? 'bg-forest text-white' : 'bg-earth text-ink dark:bg-night-lift'
                      }`}>
                        {isStopPickedUp ? <Check size={14} /> : idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink dark:text-night-text">
                            {c.farmerName || c.farmer?.name || `Farmer ${idx + 1}`}
                          </span>
                          {isMe && (
                            <span className="rounded bg-forest/15 px-1.5 py-0.2 text-[9px] font-extrabold text-forest">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-mute flex items-center gap-1">
                          <MapPin size={11} /> {c.location || 'Cluster Farm'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold tabular text-ink dark:text-night-text">
                          {c.quantityKg} kg @ ₹{c.offeredPriceInr || pool.targetPriceInr}/kg
                        </div>
                        <div className="text-[10px] text-forest dark:text-harvest font-semibold">
                          ₹{(c.quantityKg * (c.offeredPriceInr || pool.targetPriceInr)).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                        isStopPickedUp ? 'bg-forest/15 text-forest' :
                        isStopInProgress ? 'bg-harvest/15 text-harvest' : 'bg-earth text-mute dark:bg-night-lift'
                      }`}>
                        {c.pickupStatus?.replace('_', ' ') || 'Scheduled'}
                      </span>

                      {/* Demo control to simulate pickup stop completion */}
                      {(isAdmin || currentUser?.role === 'seller' || isBuyer) && (status === 'buyer_confirmed' || status === 'pickup_scheduled' || status === 'pickup_in_progress') && !isStopPickedUp && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handlePickupStop(idx, 'picked_up')}
                          className="rounded-lg bg-forest/10 hover:bg-forest hover:text-white px-2.5 py-1 text-[10px] font-bold text-forest transition-colors"
                        >
                          Confirm Pickup
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vehicle & Logistics Details */}
          {shipment && (
            <div className="rounded-xl border border-line bg-earth/20 p-4 dark:border-night-mute/20 dark:bg-night-lift/20 space-y-2">
              <div className="font-bold text-ink dark:text-night-text flex items-center justify-between">
                <span>Consolidated Transport Assignment</span>
                <span className="font-mono text-[10px] text-mute">{shipment.shipmentNumber}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[11px]">
                <div>
                  <span className="text-mute">Vehicle Type:</span>
                  <div className="font-semibold text-ink dark:text-night-text">{shipment.vehicle?.modelName || 'Standard Cargo Truck'}</div>
                </div>
                <div>
                  <span className="text-mute">Registration:</span>
                  <div className="font-semibold text-ink dark:text-night-text">{shipment.vehicle?.registrationNumber || 'TS 08 UB 4521'}</div>
                </div>
                <div>
                  <span className="text-mute">Assigned Driver:</span>
                  <div className="font-semibold text-ink dark:text-night-text">{shipment.vehicle?.driverName || 'Ramesh Kumar'}</div>
                </div>
                <div>
                  <span className="text-mute">Spoilage Risk:</span>
                  <div className="font-semibold text-forest dark:text-harvest">{shipment.spoilageRisk?.riskScore || 'LOW'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Transparent Farmer-wise Settlement Summary (Delivered or Completed) */}
          {(status === 'delivered' || status === 'completed') && (
            <div className="rounded-xl border-2 border-forest/30 bg-forest/5 p-4 dark:border-harvest/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-forest dark:text-harvest flex items-center gap-1.5">
                  <ShieldCheck size={16} /> Transparent Farmer Settlement Payouts
                </span>
                <span className="rounded-full bg-forest px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                  Verified Produced Delivered
                </span>
              </div>

              <div className="space-y-1.5">
                {pool?.contributors?.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-ink dark:bg-night-card dark:text-night-text">
                    <div>
                      <span className="font-bold">{c.farmerName || c.farmer?.name || `Farmer ${idx + 1}`}</span>
                      <span className="text-mute ml-2">• {c.location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular font-medium">{c.quantityKg} kg verified @ ₹{c.offeredPriceInr || pool.targetPriceInr}/kg</span>
                      <span className="tabular font-extrabold text-forest dark:text-harvest text-sm">
                        ₹{(c.quantityKg * (c.offeredPriceInr || pool.targetPriceInr)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-mute italic">
                * Payment is calculated directly from verified delivered produce and the agreed pool price. Platform coordinates zero-commission direct delivery.
              </p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 bg-earth/40 px-6 py-4 dark:border-night-mute/30 dark:bg-night-lift/30">
          <div className="text-xs text-mute flex items-center gap-1.5">
            <RefreshCw size={13} className={actionLoading ? 'animate-spin' : ''} />
            <span>Workflow Stage: <strong>{status.replace(/_/g, ' ')}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {/* 1. Buyer confirms pooled order */}
            {(status === 'target_reached' || status === 'buyer_confirmation_pending' || (status === 'open' && pool?.collectedQuantityKg >= pool?.targetQuantityKg)) && (isBuyer || isAdmin) && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmOrder}
                className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest-deep disabled:opacity-50 transition-all shadow-md dark:bg-harvest dark:text-ink"
              >
                <Check size={16} />
                <span>Confirm Pooled Order</span>
              </button>
            )}

            {/* 2. Advance to In Transit after consolidation */}
            {status === 'consolidated' && (isAdmin || currentUser?.role === 'seller' || isBuyer) && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAdvanceShipment('in_transit')}
                className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest-deep transition-all shadow-md dark:bg-harvest dark:text-ink"
              >
                <Truck size={16} />
                <span>Dispatch / Start Transit</span>
              </button>
            )}

            {/* 3. In Transit -> Arriving */}
            {status === 'in_transit' && (isAdmin || currentUser?.role === 'seller' || isBuyer) && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAdvanceShipment('arriving')}
                className="flex items-center gap-2 rounded-xl bg-harvest px-5 py-2.5 text-sm font-bold text-ink hover:opacity-90 transition-all shadow-md"
              >
                <Navigation size={16} />
                <span>Vehicle Arriving at Buyer</span>
              </button>
            )}

            {/* 4. Buyer confirms delivery receipt */}
            {(status === 'arriving' || status === 'in_transit') && (isBuyer || isAdmin) && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelivery}
                className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest-deep transition-all shadow-md dark:bg-harvest dark:text-ink"
              >
                <CheckCircle2 size={16} />
                <span>Confirm Delivery Receipt</span>
              </button>
            )}

            {/* 5. Settle farmer payouts */}
            {status === 'delivered' && (isBuyer || isAdmin || isFarmer) && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSettlePayment}
                className="flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest-deep transition-all shadow-md dark:bg-harvest dark:text-ink"
              >
                <IndianRupee size={16} />
                <span>Disburse Farmer Payments (Simulated)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-earth dark:border-night-mute/20 dark:text-night-text dark:hover:bg-night-lift"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
