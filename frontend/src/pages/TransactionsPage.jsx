import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
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
  CreditCard,
  Building2,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  Printer,
  Sparkles,
} from 'lucide-react';

const STATUS_STEPS = ['listed', 'matched', 'offer_pending', 'accepted', 'logistics_planned', 'in_transit', 'delivered', 'completed'];

const STATUS_CONFIG = {
  listed: { key: 'listed', label: 'Listed', color: 'bg-mute/15 text-mute', icon: Package },
  matched: { key: 'matched', label: 'Matched', color: 'bg-info/15 text-info', icon: Target },
  offer_pending: { key: 'offer_pending', label: 'Offer Pending', color: 'bg-harvest/15 text-harvest', icon: Clock },
  accepted: { key: 'accepted', label: 'Accepted', color: 'bg-forest/15 text-forest', icon: Check },
  logistics_planned: { key: 'logistics_planned', label: 'Logistics Planned', color: 'bg-info/15 text-info', icon: Truck },
  in_transit: { key: 'in_transit', label: 'In Transit', color: 'bg-harvest/15 text-harvest', icon: Truck },
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
      {STATUS_STEPS.map((step, idx) => {
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
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`w-3 h-0.5 ${idx < currentIdx ? 'bg-forest dark:bg-harvest' : 'bg-line dark:bg-night-mute/30'}`} />
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
  const [upiId, setUpiId] = useState('buyer@upi');
  const [successData, setSuccessData] = useState(null);

  async function handlePay() {
    setBusy(true);
    setErr('');
    try {
      await new Promise((r) => setTimeout(r, 900));
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

            <div className="rounded-xl border border-line/80 bg-earth/40 p-4 text-left dark:border-night-mute/30 dark:bg-night-lift/30 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-mute">{t('payment.paymentId', 'Payment ID')}:</span>
                <span className="font-mono font-bold text-ink dark:text-night-text">{successData.paymentId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-mute">{t('common.commodity', 'Commodity')}:</span>
                <span className="font-bold text-ink dark:text-night-text">{tx.commodityName} — {tx.quantityKg} kg</span>
              </div>
              <div className="flex justify-between text-xs">
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
                <span className="text-mute">Supplier (Beneficiary):</span>
                <span className="font-medium text-ink dark:text-night-text">{tx.farmer?.name || 'Farmer'}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-line/60 pt-2 dark:border-night-mute/30">
                <span className="font-bold text-ink dark:text-night-text">{t('payment.amountToPay', 'Amount to Pay')}:</span>
                <span className="text-base font-extrabold text-forest dark:text-harvest tabular">
                  ₹{tx.totalValueInr?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-mute">{t('payment.selectMethod', 'Select Payment Method')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi', label: 'UPI', icon: QrCode },
                  { id: 'card', label: 'Card (Demo)', icon: CreditCard },
                  { id: 'netBanking', label: 'Net Banking', icon: Building2 },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                      method === m.id
                        ? 'border-forest bg-forest/10 text-forest dark:border-harvest dark:bg-harvest/15 dark:text-harvest'
                        : 'border-line bg-earth/20 hover:border-forest/40 dark:border-night-mute/20'
                    }`}
                  >
                    <m.icon size={18} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {method === 'upi' && (
              <div>
                <label className="block text-xs font-bold uppercase text-mute mb-1">{t('payment.upiIdLabel', 'UPI ID / VPA')}</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="buyer@upi"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20 font-medium"
                />
              </div>
            )}
            {method === 'card' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-mute mb-1">{t('payment.cardDemoLabel', 'Card Number (Simulated / Masked)')}</label>
                  <input
                    disabled
                    value="•••• •••• •••• 4242"
                    className="w-full rounded-lg border border-line bg-earth/40 px-3 py-2 text-sm font-mono dark:bg-night-lift/50 dark:border-night-mute/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input disabled value="12/28" className="rounded-lg border border-line bg-earth/40 px-3 py-2 text-sm font-mono dark:bg-night-lift/50" />
                  <input disabled value="•••" className="rounded-lg border border-line bg-earth/40 px-3 py-2 text-sm font-mono dark:bg-night-lift/50" />
                </div>
              </div>
            )}
            {method === 'netBanking' && (
              <div>
                <label className="block text-xs font-bold uppercase text-mute mb-1">{t('payment.bankLabel', 'Select Bank')}</label>
                <select className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20 font-medium">
                  <option>State Bank of India (Demo)</option>
                  <option>HDFC Bank (Demo)</option>
                  <option>ICICI Bank (Demo)</option>
                  <option>Axis Bank (Demo)</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="simFail"
                checked={simulateFail}
                onChange={(e) => setSimulateFail(e.target.checked)}
                className="rounded border-line text-forest focus:ring-forest"
              />
              <label htmlFor="simFail" className="text-xs text-mute cursor-pointer select-none">
                {t('payment.simulateFailToggle', 'Simulate Failure (Demo error testing)')}
              </label>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl dark:border-night-mute/20 dark:bg-night-card space-y-4 print:p-0 print:border-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-line/60 pb-3 dark:border-night-mute/30">
          <div>
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-forest dark:text-harvest" />
              <h3 className="font-bold text-ink dark:text-night-text">{t('payment.receiptTitle', 'Official Payment Receipt')}</h3>
            </div>
            <p className="text-xs text-mute">{t('payment.receiptSubtitle', 'Agricultural Electronic Settlement Voucher')}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-mute hover:bg-earth dark:hover:bg-night-lift print:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl border border-forest/30 bg-forest/5 p-4 dark:border-harvest/30 dark:bg-harvest/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-mute">Settlement Status</div>
            <div className="font-extrabold text-sm text-forest dark:text-harvest">
              {t('payment.receiptStatus', 'PAID — SIMULATED DEMO')}
            </div>
          </div>
          <span className="rounded-full bg-forest px-3 py-1 text-xs font-bold text-white">✓ Verified</span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Transaction ID:</span>
            <span className="font-mono font-medium">{tx._id}</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Payment ID:</span>
            <span className="font-mono font-bold text-forest dark:text-harvest">{tx.paymentId || 'SIM-PAY-DEMO'}</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Settlement Date:</span>
            <span>{tx.paidAt ? new Date(tx.paidAt).toLocaleString() : new Date().toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Payment Method:</span>
            <span className="font-bold">{tx.paymentMethod || 'UPI Transfer'}</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Buyer (Payer):</span>
            <span className="font-bold">{tx.buyer?.name || 'Buyer'}</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Supplier (Beneficiary):</span>
            <span className="font-bold">{tx.farmer?.name || 'Farmer'}</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Commodity & Quantity:</span>
            <span className="font-bold">{tx.commodityName} — {tx.quantityKg} kg</span>
          </div>
          <div className="flex justify-between border-b border-line/40 py-1.5 dark:border-night-mute/20">
            <span className="text-mute">Agreed Price:</span>
            <span>₹{tx.agreedPriceInr}/kg</span>
          </div>
          <div className="flex justify-between py-2 text-sm font-bold bg-earth/30 p-2 rounded-lg dark:bg-night-lift/40">
            <span>Total Settlement Amount:</span>
            <span className="text-forest dark:text-harvest font-extrabold">₹{tx.totalValueInr?.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-earth dark:border-night-mute/20 dark:text-night-text"
          >
            <Printer size={14} /> {t('payment.printReceipt', 'Print Receipt')}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-deep transition-colors"
          >
            {t('payment.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionCard({ tx, currentUser, onStatusUpdate, onOfferAccept, onOfferReject, onPayClick, onReceiptClick }) {
  const { t } = useTranslation();
  const [showLogistics, setShowLogistics] = useState(false);
  const statusConfig = STATUS_CONFIG[tx.status] || STATUS_CONFIG.listed;
  const StatusIcon = statusConfig.icon;

  const nextStatus = (() => {
    const idx = STATUS_STEPS.indexOf(tx.status);
    if (idx >= 0 && idx < STATUS_STEPS.length - 1) return STATUS_STEPS[idx + 1];
    return null;
  })();
  const offerId = tx.offer?._id || tx.offer;
  const offerDoc = typeof tx.offer === 'object' ? tx.offer : null;

  const userIdStr = (currentUser?._id || currentUser?.id)?.toString();
  const farmerIdStr = (tx.farmer?._id || tx.farmer?.id || tx.farmer)?.toString();
  const buyerIdStr = (tx.buyer?._id || tx.buyer?.id || tx.buyer)?.toString();
  const createdByIdStr = (offerDoc?.createdBy?._id || offerDoc?.createdBy?.id || offerDoc?.createdBy)?.toString();
  const isAdmin = currentUser?.role === 'admin';
  const isBuyer = userIdStr === buyerIdStr || currentUser?.role === 'buyer' || isAdmin;

  let isRecipient = false;
  let isSender = false;

  if (isAdmin) {
    isRecipient = true;
    isSender = false;
  } else if (createdByIdStr && userIdStr) {
    if (userIdStr === createdByIdStr) {
      isSender = true;
      isRecipient = false;
    } else if (userIdStr === farmerIdStr || userIdStr === buyerIdStr) {
      isRecipient = true;
      isSender = false;
    }
  } else {
    if (userIdStr && farmerIdStr && userIdStr === farmerIdStr) {
      isRecipient = true;
      isSender = false;
    } else if (userIdStr && buyerIdStr && userIdStr === buyerIdStr) {
      isSender = true;
      isRecipient = false;
    } else if (currentUser?.role === 'farmer' || currentUser?.role === 'seller') {
      isRecipient = true;
      isSender = false;
    } else if (currentUser?.role === 'buyer') {
      isSender = true;
      isRecipient = false;
    }
  }

  const isPaid = tx.paymentStatus === 'paid' || tx.status === 'completed';

  return (
    <div className="rounded-mm border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card">
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
              {tx.farmer?.name || 'Supplier'} → {tx.buyer?.name || 'Buyer'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPaid ? (
            <span className="flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-0.5 text-[10px] font-bold text-forest dark:bg-harvest/15 dark:text-harvest">
              <Check size={10} /> {t('transactions.paid', 'Paid')}
            </span>
          ) : tx.paymentStatus === 'failed' ? (
            <span className="flex items-center gap-1 rounded-full bg-alert/10 px-2.5 py-0.5 text-[10px] font-bold text-alert">
              <AlertTriangle size={10} /> {t('transactions.failed', 'Payment Failed')}
            </span>
          ) : (
            ['accepted', 'logistics_planned', 'in_transit', 'delivered'].includes(tx.status) && (
              <span className="flex items-center gap-1 rounded-full bg-harvest/15 px-2.5 py-0.5 text-[10px] font-bold text-harvest">
                <Clock size={10} /> {t('transactions.pending', 'Payment Pending')}
              </span>
            )
          )}
          <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${statusConfig.color}`}>
            {t(`transactions.${tx.status}`, statusConfig.label)}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <StatusTimeline currentStatus={tx.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">{t('transactions.agreedPrice', 'Agreed Price')}</div>
          <div className="mt-0.5 font-bold tabular">₹{tx.agreedPriceInr}/kg</div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">{t('transactions.totalValue', 'Total Value')}</div>
          <div className="mt-0.5 font-bold tabular text-forest dark:text-harvest">
            ₹{tx.totalValueInr?.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">{t('transactions.transportCost', 'Transport Cost')}</div>
          <div className="mt-0.5 font-bold tabular">₹{tx.transportCostInr?.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-lg bg-earth/50 p-3 dark:bg-night-lift/40">
          <div className="text-[10px] uppercase text-mute">
            {tx.farmer?.role === 'seller' ? t('transactions.sellerNet', 'Seller Net') : t('transactions.farmerNet', 'Farmer Net')}
          </div>
          <div className="mt-0.5 font-bold tabular">₹{tx.farmerNetValueInr?.toLocaleString('en-IN')}</div>
        </div>
      </div>

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
                <div className="text-[10px] uppercase text-mute">{t('logistics.distance', 'Distance')}</div>
                <div className="font-bold tabular">{tx.logistics.distanceKm} km</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-mute">{t('logistics.eta', 'ETA')}</div>
                <div className="font-bold tabular">{tx.logistics.estimatedTimeMin} min</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-mute">{t('logistics.costPerKg', 'Cost/kg')}</div>
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 dark:border-night-mute/30">
        <div className="text-xs text-mute">
          Created: {new Date(tx.createdAt).toLocaleDateString()}
          {tx.completedAt && ` • Completed: ${new Date(tx.completedAt).toLocaleDateString()}`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tx.status === 'offer_pending' && (
            <>
              {isRecipient ? (
                <>
                  <button
                    onClick={() => onOfferReject(offerId, tx._id)}
                    className="rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-bold text-alert hover:bg-alert/10 transition-colors"
                  >
                    {t('transactions.rejectOffer', 'Reject')}
                  </button>
                  <button
                    onClick={() => onOfferAccept(offerId, tx._id)}
                    className="rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-deep transition-colors"
                  >
                    {t('transactions.acceptOffer', 'Accept Offer')}
                  </button>
                </>
              ) : isSender ? (
                <span className="flex items-center gap-1.5 rounded-lg bg-harvest/15 px-3 py-1.5 text-xs font-bold text-harvest">
                  <Clock size={12} /> {t('transactions.offerSentBadge', 'Offer Sent — Awaiting Review')}
                </span>
              ) : null}
            </>
          )}

          {['accepted', 'logistics_planned', 'in_transit', 'delivered'].includes(tx.status) && (
            <Link
              to={`/logistics?transactionId=${tx._id}`}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-earth dark:border-night-mute/20 dark:text-night-text dark:hover:bg-night-lift transition-colors"
            >
              <Truck size={13} className="text-forest dark:text-harvest" /> {t('transactions.routeBtn', 'Route')}
            </Link>
          )}

          {!isPaid && isBuyer && ['accepted', 'logistics_planned', 'in_transit', 'delivered'].includes(tx.status) && (
            <button
              onClick={() => onPayClick(tx)}
              className="flex items-center gap-1.5 rounded-lg bg-harvest px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-harvest-deep shadow-sm transition-colors"
            >
              <IndianRupee size={13} /> {t('transactions.payNow', 'Pay Now')}
            </button>
          )}

          {isPaid && (
            <button
              onClick={() => onReceiptClick(tx)}
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-earth dark:border-night-mute/20 dark:text-night-text transition-colors"
            >
              <Receipt size={13} className="text-forest dark:text-harvest" /> {t('transactions.viewReceipt', 'View Receipt')}
            </button>
          )}

          {nextStatus && nextStatus !== 'offer_pending' && nextStatus !== 'rejected' && tx.status !== 'completed' && tx.status !== 'offer_pending' && (
            <button
              onClick={() => onStatusUpdate(tx._id, nextStatus)}
              className="flex items-center gap-1 rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-bold text-forest hover:bg-forest hover:text-white transition-colors dark:bg-harvest/10 dark:text-harvest"
            >
              {t('transactions.advanceTo', 'Advance to')} {t(`transactions.${nextStatus}`, STATUS_CONFIG[nextStatus]?.label)} <ArrowRight size={12} />
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
  const [filter, setFilter] = useState('all');

  const [paymentTx, setPaymentTx] = useState(null);
  const [receiptTx, setReceiptTx] = useState(null);

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

  const filtered = filter === 'all' ? transactions : transactions.filter((t) => t.status === filter);

  const statusCounts = transactions.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('transactions.eyebrow', 'Order & Settlement Pipeline')}
        title={t('transactions.title', 'My Transactions')}
        subtitle={t('transactions.subtitle', 'Track your marketplace transactions from offer to verified settlement.')}
        actions={<DataStatusBadge status="SIMULATED" />}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-mm border border-line bg-white px-4 py-3 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] uppercase text-mute">{t('common.all', 'Total Transactions')}</div>
          <div className="mt-0.5 text-2xl font-bold tabular">{transactions.length}</div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-3 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] uppercase text-mute">{t('transactions.offer_pending', 'Pending Offers')}</div>
          <div className="mt-0.5 text-2xl font-bold tabular text-harvest">{statusCounts.offer_pending || 0}</div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-3 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] uppercase text-mute">Active Orders</div>
          <div className="mt-0.5 text-2xl font-bold tabular text-forest dark:text-harvest">
            {(statusCounts.accepted || 0) + (statusCounts.logistics_planned || 0) + (statusCounts.in_transit || 0) + (statusCounts.delivered || 0)}
          </div>
        </div>
        <div className="rounded-mm border border-line bg-white px-4 py-3 dark:border-night-mute/20 dark:bg-night-card">
          <div className="text-[11px] uppercase text-mute">{t('transactions.completed', 'Completed')}</div>
          <div className="mt-0.5 text-2xl font-bold tabular text-forest">{statusCounts.completed || 0}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-earth/60 p-1 dark:bg-night-lift">
        {['all', 'offer_pending', 'accepted', 'in_transit', 'delivered', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === f ? 'bg-white text-forest shadow-sm dark:bg-night-card dark:text-harvest' : 'text-mute hover:text-ink'
            }`}
          >
            {f === 'all' ? t('common.all', 'All') : t(`transactions.${f}`, STATUS_CONFIG[f]?.label || f)}
            {f !== 'all' && statusCounts[f] ? ` (${statusCounts[f]})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
          <Receipt size={32} className="mx-auto text-mute" />
          <div className="mt-3 text-sm font-medium text-mute">{t('transactions.noTransactions', 'No transactions found')}</div>
          <div className="mt-1 text-xs text-mute">
            Create a listing and make an offer in Marketplace or AI Matches to start a transaction.
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
            />
          ))}
        </div>
      )}

      {paymentTx && (
        <PaymentModal
          tx={paymentTx}
          onClose={() => setPaymentTx(null)}
          onSuccess={() => {
            loadTransactions();
          }}
        />
      )}

      {receiptTx && (
        <ReceiptModal
          tx={receiptTx}
          onClose={() => setReceiptTx(null)}
        />
      )}
    </div>
  );
}
