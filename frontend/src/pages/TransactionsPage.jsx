import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import {
  Receipt,
  IndianRupee,
  MapPin,
  Truck,
  Check,
  Clock,
  Package,
  X,
  ArrowRight,
  Target,
} from 'lucide-react';

const STATUS_STEPS = ['listed', 'matched', 'offer_pending', 'accepted', 'logistics_planned', 'in_transit', 'delivered', 'completed'];

const STATUS_CONFIG = {
  listed: { label: 'Listed', color: 'bg-mute/15 text-mute', icon: Package },
  matched: { label: 'Matched', color: 'bg-info/15 text-info', icon: Target },
  offer_pending: { label: 'Offer Pending', color: 'bg-harvest/15 text-harvest', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-forest/15 text-forest', icon: Check },
  logistics_planned: { label: 'Logistics Planned', color: 'bg-info/15 text-info', icon: Truck },
  in_transit: { label: 'In Transit', color: 'bg-harvest/15 text-harvest', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-forest/15 text-forest', icon: Package },
  completed: { label: 'Completed', color: 'bg-forest text-white', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-alert/15 text-alert', icon: X },
  cancelled: { label: 'Cancelled', color: 'bg-mute/15 text-mute', icon: X },
};


function StatusTimeline({ currentStatus }) {
  const currentIdx = STATUS_STEPS.indexOf(currentStatus);
  if (currentIdx < 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STATUS_STEPS.map((step, idx) => {
        const config = STATUS_CONFIG[step];
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = config?.icon || Package;
        return (
          <div key={step} className="flex items-center">
            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
              isCurrent ? config?.color || 'bg-forest text-white' :
              isCompleted ? 'bg-forest/10 text-forest' : 'bg-earth text-mute dark:bg-night-lift'
            }`}>
              <Icon size={10} />
              <span className="hidden sm:inline">{config?.label || step}</span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`w-3 h-0.5 ${idx < currentIdx ? 'bg-forest' : 'bg-line dark:bg-night-mute/30'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TransactionCard({ tx, onStatusUpdate, onOfferAccept, onOfferReject }) {
  const [showLogistics, setShowLogistics] = useState(false);
  const statusConfig = STATUS_CONFIG[tx.status] || STATUS_CONFIG.listed;
  const StatusIcon = statusConfig.icon;

  const nextStatus = (() => {
    const idx = STATUS_STEPS.indexOf(tx.status);
    if (idx >= 0 && idx < STATUS_STEPS.length - 1) return STATUS_STEPS[idx + 1];
    return null;
  })();
  const offerId = tx.offer?._id || tx.offer;

  return (
    <div className="rounded-mm border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${statusConfig.color}`}>
            <StatusIcon size={18} />
          </div>
          <div>
            <div className="font-bold text-ink dark:text-night-text">
              {tx.commodityName} — {tx.quantityKg} kg
            </div>
            <div className="text-xs text-mute">
              {tx.farmer?.name || 'Farmer'} → {tx.buyer?.name || 'Buyer'}
            </div>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Status timeline */}
      <div className="mt-3">
        <StatusTimeline currentStatus={tx.status} />
      </div>

      {/* Details grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">Agreed Price</div>
          <div className="mt-0.5 font-bold tabular">₹{tx.agreedPriceInr}/kg</div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">Total Value</div>
          <div className="mt-0.5 font-bold tabular text-forest dark:text-harvest">
            ₹{tx.totalValueInr?.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">Transport Cost</div>
          <div className="mt-0.5 font-bold tabular">₹{tx.transportCostInr?.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">Farmer Net</div>
          <div className="mt-0.5 font-bold tabular">₹{tx.farmerNetValueInr?.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Logistics */}
      {tx.logistics?.distanceKm > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowLogistics(!showLogistics)}
            className="text-xs font-bold text-forest hover:text-forest-deep dark:text-harvest"
          >
            {showLogistics ? 'Hide logistics' : 'Show logistics details'}
          </button>
          {showLogistics && (
            <div className="mt-2 grid gap-2 rounded-lg bg-earth/40 p-3 dark:bg-night-lift/30 sm:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase text-mute">Distance</div>
                <div className="font-bold tabular">{tx.logistics.distanceKm} km</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-mute">ETA</div>
                <div className="font-bold tabular">{tx.logistics.estimatedTimeMin} min</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-mute">Cost/kg</div>
                <div className="font-bold tabular">₹{tx.logistics.transportCostPerKg}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-mute">Route</div>
                <div className="font-bold tabular">{tx.logistics.pickupLocation} → {tx.logistics.deliveryLocation}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 dark:border-night-mute/30">
        <div className="text-xs text-mute">
          Created: {new Date(tx.createdAt).toLocaleDateString()}
          {tx.completedAt && ` • Completed: ${new Date(tx.completedAt).toLocaleDateString()}`}
        </div>
        <div className="flex gap-2">
          {tx.status === 'offer_pending' && offerId && (
            <>
              <button
                onClick={() => onOfferReject(offerId)}
                className="rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-bold text-alert hover:bg-alert/10"
              >
                Reject
              </button>
              <button
                onClick={() => onOfferAccept(offerId)}
                className="rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-deep"
              >
                Accept Offer
              </button>
            </>
          )}
          {nextStatus && nextStatus !== 'offer_pending' && nextStatus !== 'rejected' && tx.status !== 'completed' && tx.status !== 'offer_pending' && (
            <button
              onClick={() => onStatusUpdate(tx._id, nextStatus)}
              className="flex items-center gap-1 rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-bold text-forest hover:bg-forest hover:text-white transition-colors dark:bg-harvest/10 dark:text-harvest"
            >
              Advance to {STATUS_CONFIG[nextStatus]?.label} <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  async function loadTransactions() {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get('/marketplace/transactions');
      setTransactions(data.transactions || []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/marketplace/transactions/${id}/status`, { status });
      loadTransactions();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update status');
    }
  }

  async function acceptOffer(offerId) {
    try {
      await api.patch(`/marketplace/offers/${offerId}/accept`);
      loadTransactions();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to accept offer');
    }
  }

  async function rejectOffer(offerId) {
    try {
      await api.patch(`/marketplace/offers/${offerId}/reject`);
      loadTransactions();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to reject offer');
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  if (err) return <ErrorState message={err} onRetry={loadTransactions} />;
  if (loading) return <LoadingSkeleton />;

  const filtered = filter === 'all' ? transactions : transactions.filter((t) => t.status === filter);

  const statusCounts = transactions.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Direct Transactions"
        title="My Transactions"
        subtitle="Track all marketplace transactions from listing to delivery. No intermediaries."
        actions={<DataStatusBadge status="SIMULATED" />}
      />

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-mm border border-line bg-white px-4 py-3 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] uppercase text-mute">Total Transactions</div>
          <div className="mt-0.5 text-2xl font-bold tabular">{transactions.length}</div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-3 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] uppercase text-mute">Pending Offers</div>
          <div className="mt-0.5 text-2xl font-bold tabular text-harvest">{statusCounts.offer_pending || 0}</div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-3 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] uppercase text-mute">Active</div>
          <div className="mt-0.5 text-2xl font-bold tabular text-forest">{(statusCounts.accepted || 0) + (statusCounts.logistics_planned || 0) + (statusCounts.in_transit || 0)}</div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-3 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] uppercase text-mute">Completed</div>
          <div className="mt-0.5 text-2xl font-bold tabular text-forest">{statusCounts.completed || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-earth/60 p-1 dark:bg-night-lift">
        {['all', 'offer_pending', 'accepted', 'in_transit', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f ? 'bg-white text-forest shadow-sm dark:bg-night-card dark:text-harvest' : 'text-mute hover:text-ink'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
            {f !== 'all' && statusCounts[f] ? ` (${statusCounts[f]})` : ''}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {filtered.length === 0 ? (
        <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
          <Receipt size={32} className="mx-auto text-mute" />
          <div className="mt-3 text-sm font-medium text-mute">No transactions found</div>
          <div className="mt-1 text-xs text-mute">
            Create a listing and make an offer to start a transaction.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((tx) => (
            <TransactionCard key={tx._id} tx={tx} onStatusUpdate={updateStatus} onOfferAccept={acceptOffer} onOfferReject={rejectOffer} />
          ))}
        </div>
      )}
    </div>
  );
}
