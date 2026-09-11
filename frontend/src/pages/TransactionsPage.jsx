import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import { SupplyPoolDetailModal } from '../components/SupplyPoolDetailModal.jsx';
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
  CreditCard,
  Building2,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Printer,
  Sparkles,
  Users,
  Navigation,
} from 'lucide-react';

const STATUS_STEPS = ['listed', 'matched', 'offer_pending', 'accepted', 'buyer_confirmed', 'logistics_planned', 'pickup_scheduled', 'pickup_in_progress', 'consolidated', 'in_transit', 'delivered', 'completed'];

const STATUS_CONFIG = {
  listed: { key: 'listed', label: 'Listed', color: 'bg-mute/15 text-mute', icon: Package },
  matched: { key: 'matched', label: 'Matched', color: 'bg-info/15 text-info', icon: Target },
  offer_pending: { key: 'offer_pending', label: 'Offer Pending', color: 'bg-harvest/15 text-harvest', icon: Clock },
  accepted: { key: 'accepted', label: 'Accepted', color: 'bg-forest/15 text-forest', icon: Check },
  buyer_confirmed: { key: 'buyer_confirmed', label: 'Buyer Confirmed', color: 'bg-forest/15 text-forest', icon: Check },
  logistics_planned: { key: 'logistics_planned', label: 'Logistics Planned', color: 'bg-info/15 text-info', icon: Truck },
  pickup_scheduled: { key: 'pickup_scheduled', label: 'Pickup Scheduled', color: 'bg-info/15 text-info', icon: Truck },
  pickup_in_progress: { key: 'pickup_in_progress', label: 'Pickup In Progress', color: 'bg-harvest/15 text-harvest', icon: Truck },
  consolidated: { key: 'consolidated', label: 'Consolidated', color: 'bg-forest/15 text-forest', icon: Check },
  in_transit: { key: 'in_transit', label: 'In Transit', color: 'bg-harvest/15 text-harvest', icon: Truck },
  arriving: { key: 'arriving', label: 'Arriving', color: 'bg-harvest/15 text-harvest', icon: Truck },
  delivered: { key: 'delivered', label: 'Delivered', color: 'bg-forest/15 text-forest', icon: Check },
  completed: { key: 'completed', label: 'Completed', color: 'bg-forest text-white', icon: Check },
  rejected: { key: 'rejected', label: 'Rejected', color: 'bg-alert/15 text-alert', icon: X },
  cancelled: { key: 'cancelled', label: 'Cancelled', color: 'bg-mute/15 text-mute', icon: X },
};

function StatusTimeline({ currentStatus }) {
  const { t } = useTranslation();
  const currentIdx = STATUS_STEPS.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STATUS_STEPS.slice(2).map((step, idx) => {
        const config = STATUS_CONFIG[step];
        const Icon = config?.icon || Package;
        const isCurrent = step === currentStatus;
        const isCompleted = idx <= currentIdx && currentIdx >= 0;

        return (
          <div key={step} className="flex items-center gap-1 shrink-0">
            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
              isCurrent ? config?.color || 'bg-forest text-white' :
              isCompleted ? 'bg-forest/10 text-forest dark:bg-harvest/10 dark:text-harvest' : 'bg-earth text-mute dark:bg-night-lift'
            }`}>
              <Icon size={10} />
              <span className="hidden sm:inline">{t(`transactions.${step}`, config?.label || step)}</span>
            </div>
            {idx < STATUS_STEPS.length - 3 && (
              <div className={`w-2.5 h-0.5 ${idx < currentIdx ? 'bg-forest dark:bg-harvest' : 'bg-line dark:bg-night-mute/30'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PaymentModal({ tx, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [method, setMethod] = useState('upi');
  const [simulateFail, setSimulateFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [successData, setSuccessData] = useState(null);

  async function handlePay() {
    setBusy(true);
    setErr('');
    try {
      await new Promise((r) => setTimeout(r, 800));
      const { data } = await api.post(`/marketplace/transactions/${tx._id}/pay`, {
        paymentMethod: method === 'upi' ? 'UPI' : method === 'card' ? 'Debit/Credit Card' : 'Net Banking',
        simulateFailure: simulateFail,
      });
      setSuccessData(data);
      if (onSuccess) onSuccess();
    } catch (e) {
      setErr(e.response?.data?.error || 'Simulated payment processing failed. Please retry.');
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl dark:border-night-mute/20 dark:bg-night-card space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-3 dark:border-night-mute/30">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest">
              <IndianRupee size={16} />
            </div>
            <div>
              <h3 className="font-bold text-ink dark:text-night-text">{t('payment.modalTitle', 'MandiMind Payment Portal')}</h3>
              <p className="text-[10px] font-extrabold uppercase text-forest dark:text-harvest tracking-wider">
                {t('payment.badge', 'SIMULATED PAYMENT — DEMO ONLY')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-mute hover:bg-earth dark:hover:bg-night-lift">
            <X size={18} />
          </button>
        </div>

        {successData ? (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest text-white shadow-lg">
              <Check size={28} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-forest dark:text-harvest">{t('payment.successTitle', 'Payment Successful')}</h4>
              <p className="text-xs text-mute mt-1">{t('payment.successSubtitle', 'The transaction has been settled and moved to Completed status.')}</p>
            </div>

            <div className="rounded-xl border border-line/80 bg-earth/40 p-4 text-left dark:border-night-mute/30 dark:bg-night-lift/30 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-mute">{t('payment.paymentId', 'Payment ID')}:</span>
                <span className="font-mono font-bold text-ink dark:text-night-text">{successData.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mute">{t('common.commodity', 'Commodity')}:</span>
                <span className="font-bold text-ink dark:text-night-text">{tx.commodityName} — {tx.quantityKg} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mute">{t('common.total', 'Amount Settled')}:</span>
                <span className="font-bold text-forest dark:text-harvest text-sm">₹{tx.totalValueInr?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={onClose}
                className="w-full rounded-lg bg-forest py-2.5 text-xs font-bold text-white hover:bg-forest-deep transition-colors"
              >
                {t('payment.close', 'Done')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-earth/50 p-4 dark:bg-night-lift/40 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-mute">{t('common.commodity', 'Commodity')}:</span>
                <strong className="text-ink dark:text-night-text">{tx.commodityName} ({tx.quantityKg} kg)</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-mute">{t('payment.amountToPay', 'Amount to Pay')}:</span>
                <span className="text-lg font-extrabold text-forest dark:text-harvest tabular">
                  ₹{tx.totalValueInr?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-mute">{t('payment.selectMethod', 'Select Payment Method')}</label>
              <div className="grid grid-cols-3 gap-2">
                {['upi', 'card', 'netBanking'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-lg border p-2.5 text-center font-bold capitalize transition-all ${
                      method === m
                        ? 'border-forest bg-forest/10 text-forest dark:border-harvest dark:bg-harvest/15 dark:text-harvest'
                        : 'border-line text-mute hover:bg-earth dark:border-night-mute/20'
                    }`}
                  >
                    {m === 'upi' ? 'UPI' : m === 'card' ? 'Card' : 'Net Banking'}
                  </button>
                ))}
              </div>
            </div>

            {err && (
              <div className="rounded-lg border border-alert/30 bg-alert/10 p-3 text-xs text-alert flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">{t('payment.failTitle', 'Payment Failed (Simulated)')}</div>
                  <div>{err}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line/60 pt-3 dark:border-night-mute/30">
              <div className="flex items-center gap-1.5 text-[11px] text-mute">
                <ShieldCheck size={14} className="text-forest dark:text-harvest" />
                <span>Simulated Secure Demo Gateway</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-line px-3.5 py-2 text-xs font-bold text-mute hover:bg-earth dark:border-night-mute/20"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-deep disabled:opacity-50 transition-colors"
                >
                  {busy ? (
                    <span>{t('payment.processing', 'Processing...')}</span>
                  ) : (
                    <>
                      <IndianRupee size={14} />
                      {t('payment.proceedToPay', 'Pay')} ₹{tx.totalValueInr?.toLocaleString('en-IN')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReceiptModal({ tx, onClose }) {
  const { t } = useTranslation();
  const isPool = tx.tradeType === 'POOL_AGGREGATION' || tx.isPoolOrder;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl dark:border-night-mute/20 dark:bg-night-card space-y-4 print:p-0 print:border-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-line/60 pb-3 dark:border-night-mute/30">
          <div>
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-forest dark:text-harvest" />
              <h3 className="font-bold text-ink dark:text-night-text">{t('payment.receiptTitle', 'Official Payment Receipt')}</h3>
            </div>
            <p className="text-xs text-mute">
              {isPool ? 'Multi-Farmer Combined Order Electronic Settlement Voucher' : 'Direct Agricultural Electronic Settlement Voucher'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-mute hover:bg-earth dark:hover:bg-night-lift print:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl border border-forest/30 bg-forest/5 p-4 dark:border-harvest/30 dark:bg-harvest/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-mute">Settlement Status</div>
            <div className="font-extrabold text-sm text-forest dark:text-harvest">
              PAID & SETTLED — SIMULATED DEMO
            </div>
          </div>
          <span className="rounded-full bg-forest px-3 py-1 text-xs font-bold text-white">✓ Verified Delivery</span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Order Number:</span>
            <span className="font-mono font-bold">{tx.orderNumber || tx._id}</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Payment ID:</span>
            <span className="font-mono font-bold text-forest dark:text-harvest">{tx.paymentId || 'SIM-POOL-PAY'}</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Buyer (Payer):</span>
            <span className="font-bold">{tx.buyer?.name || 'Hyderabad Fresh Foods'}</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Commodity & Quantity:</span>
            <span className="font-bold">{tx.commodityName} — {tx.quantityKg} kg</span>
          </div>

          {/* If pool transaction, show farmer contributors breakdown */}
          {isPool && tx.poolContributors && tx.poolContributors.length > 0 && (
            <div className="rounded-lg bg-earth/40 p-2.5 dark:bg-night-lift/30 space-y-1.5 my-2">
              <div className="font-bold text-[10px] uppercase text-mute">Farmer-Wise Payout Breakdown:</div>
              {tx.poolContributors.map((c, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span>{c.farmerName || c.farmer?.name || `Farmer ${idx + 1}`} ({c.quantityKg} kg @ ₹{c.agreedPriceInr}/kg):</span>
                  <span className="font-bold tabular text-forest dark:text-harvest">₹{c.grossAmountInr?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between py-2 text-sm font-bold bg-earth/30 p-2 rounded-lg dark:bg-night-lift/40">
            <span>Total Settlement Value:</span>
            <span className="text-forest dark:text-harvest font-extrabold">₹{tx.totalValueInr?.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <p className="text-[10px] text-mute italic">
          Payment based on verified delivered contribution and agreed price. MandiMind coordinates zero-resale direct agriculture.
        </p>

        <div className="flex justify-end gap-2 pt-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-earth dark:border-night-mute/20 dark:text-night-text"
          >
            <Printer size={14} /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-deep transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionCard({ tx, currentUser, onStatusUpdate, onOfferAccept, onOfferReject, onPayClick, onReceiptClick, onOpenPoolModal }) {
  const { t } = useTranslation();
  const isPool = tx.tradeType === 'POOL_AGGREGATION' || tx.isPoolOrder;
  const statusConfig = STATUS_CONFIG[tx.status] || STATUS_CONFIG.listed;
  const StatusIcon = statusConfig.icon;

  const isPaid = tx.paymentStatus === 'paid' || tx.paymentStatus === 'settled' || tx.status === 'completed';
  const isBuyer = (tx.buyer?._id || tx.buyer)?.toString() === currentUser?._id?.toString() || currentUser?.role === 'buyer' || currentUser?.role === 'admin';

  // Check if current user is a participating farmer in this pool order
  const myContrib = isPool && tx.poolContributors?.find(
    (c) => (c.farmer?._id || c.farmer)?.toString() === currentUser?._id?.toString()
  );

  return (
    <div className={`rounded-mm border bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card ${
      isPool ? 'border-l-4 border-l-harvest' : 'border-line'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${statusConfig.color}`}>
            <StatusIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink dark:text-night-text text-base">
                {tx.commodityName} — {tx.quantityKg} kg
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                isPool ? 'bg-harvest/15 text-harvest' : 'bg-forest/10 text-forest'
              }`}>
                {isPool ? 'SUPPLY POOL ORDER' : 'DIRECT TRADE'}
              </span>
            </div>
            <div className="text-xs text-mute mt-0.5 flex items-center gap-1.5">
              <span>Buyer: <strong>{tx.buyer?.name || 'Hyderabad Fresh Foods'}</strong></span>
              <span>•</span>
              <span>{isPool ? `${tx.poolContributors?.length || 2} Farmers Combined` : `Producer: ${tx.farmer?.name || 'Farmer'}`}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPaid ? (
            <span className="flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-0.5 text-[10px] font-bold text-forest dark:bg-harvest/15 dark:text-harvest">
              <Check size={10} /> {tx.paymentStatus === 'settled' ? 'Settled' : 'Paid'}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-harvest/15 px-2.5 py-0.5 text-[10px] font-bold text-harvest">
              <Clock size={10} /> Payment Pending
            </span>
          )}
          <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <StatusTimeline currentStatus={tx.status} />
      </div>

      {/* If current farmer contributed to pool */}
      {myContrib && (
        <div className="mt-3 rounded-lg border border-forest/30 bg-forest/5 p-3 dark:border-harvest/30 dark:bg-harvest/5 flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] font-extrabold uppercase text-forest dark:text-harvest">
              🌾 Your Contribution
            </div>
            <div className="font-bold text-ink dark:text-night-text">
              {myContrib.quantityKg} kg @ ₹{myContrib.agreedPriceInr || tx.agreedPriceInr}/kg
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-mute uppercase">Your Gross Payout</div>
            <div className="font-extrabold text-sm text-forest dark:text-harvest tabular">
              ₹{myContrib.grossAmountInr?.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">Agreed Unit Price</div>
          <div className="mt-0.5 font-bold tabular text-ink dark:text-night-text">₹{tx.agreedPriceInr}/kg</div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">Total Order Value</div>
          <div className="mt-0.5 font-bold tabular text-forest dark:text-harvest">
            ₹{tx.totalValueInr?.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">Transport Logistics</div>
          <div className="mt-0.5 font-bold tabular text-ink dark:text-night-text">
            {isPool ? 'Consolidated Route' : `₹${tx.transportCostInr || 0}`}
          </div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">Fulfillment Type</div>
          <div className="mt-0.5 font-bold capitalize text-ink dark:text-night-text">
            {isPool ? 'Multi-Farmer Pool' : 'Direct Trade'}
          </div>
        </div>
      </div>

      {/* Actions footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 dark:border-night-mute/30">
        <div className="text-xs text-mute font-mono">
          Order #{tx.orderNumber || tx._id.slice(-6)} • {new Date(tx.createdAt).toLocaleDateString()}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* If pool order, button to open pool tracking modal */}
          {isPool && (
            <button
              type="button"
              onClick={() => onOpenPoolModal(tx.supplyPool?._id || tx.supplyPool)}
              className="flex items-center gap-1.5 rounded-lg bg-harvest/15 hover:bg-harvest hover:text-ink px-3.5 py-1.5 text-xs font-bold text-harvest transition-colors"
            >
              <Users size={13} />
              <span>Track Supply Pool</span>
            </button>
          )}

          {/* Direct trade offer accept/reject */}
          {!isPool && tx.status === 'offer_pending' && (
            <>
              <button
                onClick={() => onOfferReject(tx.offer?._id || tx.offer, tx._id)}
                className="rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-bold text-alert hover:bg-alert/10 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => onOfferAccept(tx.offer?._id || tx.offer, tx._id)}
                className="rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-deep transition-colors"
              >
                Accept Offer
              </button>
            </>
          )}

          {/* Link to logistics */}
          {['accepted', 'logistics_planned', 'in_transit', 'delivered'].includes(tx.status) && (
            <Link
              to={`/logistics?transactionId=${tx._id}`}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-earth dark:border-night-mute/20 dark:text-night-text dark:hover:bg-night-lift transition-colors"
            >
              <Truck size={13} className="text-forest dark:text-harvest" /> Route
            </Link>
          )}

          {/* Pay now */}
          {!isPaid && isBuyer && ['accepted', 'logistics_planned', 'in_transit', 'delivered'].includes(tx.status) && (
            <button
              onClick={() => onPayClick(tx)}
              className="flex items-center gap-1.5 rounded-lg bg-forest px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-forest-deep shadow-sm transition-colors"
            >
              <IndianRupee size={13} /> Pay Now
            </button>
          )}

          {/* View receipt */}
          {isPaid && (
            <button
              onClick={() => onReceiptClick(tx)}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-earth dark:border-night-mute/20 dark:text-night-text transition-colors"
            >
              <Receipt size={13} className="text-forest dark:text-harvest" /> View Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tradeTypeFilter, setTradeTypeFilter] = useState('all'); // 'all' | 'direct' | 'pools'

  const [paymentTx, setPaymentTx] = useState(null);
  const [receiptTx, setReceiptTx] = useState(null);
  const [activePoolModalId, setActivePoolModalId] = useState(null);

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

  async function acceptOffer(offerId, txId) {
    try {
      if (offerId) {
        await api.patch(`/marketplace/offers/${offerId}/accept`);
      } else if (txId) {
        await api.patch(`/marketplace/transactions/${txId}/status`, { status: 'accepted' });
      }
      loadTransactions();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to accept offer');
    }
  }

  async function rejectOffer(offerId, txId) {
    try {
      if (offerId) {
        await api.patch(`/marketplace/offers/${offerId}/reject`);
      } else if (txId) {
        await api.patch(`/marketplace/transactions/${txId}/status`, { status: 'rejected' });
      }
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

  const filtered = transactions
    .filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter))
    .filter((t) => {
      if (tradeTypeFilter === 'direct') return t.tradeType !== 'POOL_AGGREGATION';
      if (tradeTypeFilter === 'pools') return t.tradeType === 'POOL_AGGREGATION' || t.isPoolOrder;
      return true;
    });

  const poolCount = transactions.filter((t) => t.tradeType === 'POOL_AGGREGATION' || t.isPoolOrder).length;
  const directCount = transactions.filter((t) => t.tradeType !== 'POOL_AGGREGATION').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('transactions.eyebrow', 'Order & Settlement Pipeline')}
        title={t('transactions.title', 'My Transactions')}
        subtitle="Track direct trade agreements and multi-farmer combined orders with verified transparent settlement."
        actions={<DataStatusBadge status="SIMULATED" />}
      />

      {/* Type Tabs */}
      <div className="flex items-center gap-3 border-b border-line dark:border-night-mute/30 pb-2">
        <button
          type="button"
          onClick={() => setTradeTypeFilter('all')}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
            tradeTypeFilter === 'all'
              ? 'border-forest text-forest dark:border-harvest dark:text-harvest'
              : 'border-transparent text-mute hover:text-ink'
          }`}
        >
          <Receipt size={16} />
          <span>All Orders ({transactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTradeTypeFilter('pools')}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
            tradeTypeFilter === 'pools'
              ? 'border-harvest text-harvest'
              : 'border-transparent text-mute hover:text-ink'
          }`}
        >
          <Users size={16} />
          <span>Supply Pool Orders ({poolCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setTradeTypeFilter('direct')}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
            tradeTypeFilter === 'direct'
              ? 'border-forest text-forest dark:border-harvest dark:text-harvest'
              : 'border-transparent text-mute hover:text-ink'
          }`}
        >
          <Package size={16} />
          <span>Direct Trade ({directCount})</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
          <Receipt size={32} className="mx-auto text-mute" />
          <div className="mt-3 text-sm font-medium text-mute">{t('transactions.noTransactions', 'No transactions found')}</div>
          <div className="mt-1 text-xs text-mute">
            Orders are generated from accepted direct offers or confirmed multi-farmer supply pools.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((tx) => (
            <TransactionCard
              key={tx._id}
              tx={tx}
              currentUser={user}
              onStatusUpdate={updateStatus}
              onOfferAccept={acceptOffer}
              onOfferReject={rejectOffer}
              onPayClick={(item) => setPaymentTx(item)}
              onReceiptClick={(item) => setReceiptTx(item)}
              onOpenPoolModal={(id) => setActivePoolModalId(id)}
            />
          ))}
        </div>
      )}

      {paymentTx && (
        <PaymentModal
          tx={paymentTx}
          onClose={() => setPaymentTx(null)}
          onSuccess={loadTransactions}
        />
      )}

      {receiptTx && (
        <ReceiptModal
          tx={receiptTx}
          onClose={() => setReceiptTx(null)}
        />
      )}

      {activePoolModalId && (
        <SupplyPoolDetailModal
          poolId={activePoolModalId}
          currentUser={user}
          onClose={() => setActivePoolModalId(null)}
          onUpdated={loadTransactions}
        />
      )}
    </div>
  );
}
