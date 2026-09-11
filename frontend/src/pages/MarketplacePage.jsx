import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import { SupplyPoolCard } from '../components/SupplyPoolCard.jsx';
import {
  ShoppingBasket,
  Search,
  Plus,
  MapPin,
  Calendar,
  Weight,
  IndianRupee,
  Star,
  Package,
  X,
  Check,
  Users,
  Box,
  Truck,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

function CreateListingForm({ commodities, onClose, onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    commodity: '',
    commodityName: 'Tomato',
    quantityKg: '',
    qualityGrade: 'A',
    harvestDate: new Date().toISOString().split('T')[0],
    expectedPriceInr: '',
    minimumPriceInr: '',
    location: 'Nalgonda',
    deliveryPreference: 'both',
    tradePreference: 'any',
    packagingType: 'standard_crate',
  });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/marketplace/listings', {
        ...form,
        quantityKg: Number(form.quantityKg),
        expectedPriceInr: Number(form.expectedPriceInr),
        minimumPriceInr: Number(form.minimumPriceInr || Number(form.expectedPriceInr) * 0.9),
      });
      onCreated();
      onClose();
    } catch {
      alert('Failed to create listing');
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-night-card max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-3 dark:border-night-mute/30">
          <h2 className="text-lg font-bold">{t('marketplace.createListingTitle', 'List Your Farm Produce')}</h2>
          <button onClick={onClose} className="text-mute hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase text-mute mb-1">{t('common.commodity', 'Commodity')}</label>
            <select
              value={form.commodity}
              onChange={(e) => {
                const c = commodities.find((c) => c._id === e.target.value);
                setForm({ ...form, commodity: e.target.value, commodityName: c?.name || 'Unknown' });
              }}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
              required
            >
              <option value="">{t('common.commodity', 'Select commodity')}</option>
              {commodities.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Quantity (kg)</label>
              <input type="number" min="1" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required placeholder="500" />
            </div>
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Quality Grade</label>
              <select value={form.qualityGrade} onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20">
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C</option>
                <option value="Organic">Certified Organic</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Harvest Date</label>
              <input type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
            </div>
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Packaging Type</label>
              <select value={form.packagingType} onChange={(e) => setForm({ ...form, packagingType: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20">
                <option value="standard_crate">Standard Plastic Crates</option>
                <option value="ventilated_box">Ventilated Agri-Boxes</option>
                <option value="gunny_bag">Jute / Gunny Bags</option>
                <option value="refrigerated_box">Insulated Cold-Chain Boxes</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Expected Price (₹/kg)</label>
              <input type="number" min="0" step="0.5" value={form.expectedPriceInr} onChange={(e) => setForm({ ...form, expectedPriceInr: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required placeholder="28" />
            </div>
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Min Price (₹/kg)</label>
              <input type="number" min="0" step="0.5" value={form.minimumPriceInr} onChange={(e) => setForm({ ...form, minimumPriceInr: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" placeholder="Auto" />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase text-mute mb-1">Farm / Village Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Delivery Preference</label>
              <select value={form.deliveryPreference} onChange={(e) => setForm({ ...form, deliveryPreference: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20">
                <option value="both">Both Pickup & Delivery</option>
                <option value="pickup">Buyer Pickup Only</option>
                <option value="delivery">Farmer Delivery Only</option>
              </select>
            </div>
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Trade Mode Preference</label>
              <select value={form.tradePreference} onChange={(e) => setForm({ ...form, tradePreference: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20">
                <option value="any">Individual or Supply Pool</option>
                <option value="direct">Direct Individual Only</option>
                <option value="pool">Join Supply Pool (FPO)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-earth dark:border-night-mute/20 dark:hover:bg-night-lift">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-forest px-5 py-2 text-sm font-bold text-white hover:bg-forest-deep disabled:opacity-50">
              {loading ? 'Creating...' : 'List Farm Produce'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateRequirementForm({ commodities, onClose, onCreated }) {
  const [form, setForm] = useState({
    commodity: '',
    commodityName: 'Tomato',
    quantityKg: '',
    qualityGrade: 'Any',
    maximumPriceInr: '',
    deliveryLocation: 'Hyderabad',
    buyerType: 'retailer',
    allowPoolAggregation: true,
    requiredByDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/marketplace/requirements', {
        ...form,
        quantityKg: Number(form.quantityKg),
        maximumPriceInr: Number(form.maximumPriceInr),
      });
      onCreated();
      onClose();
    } catch {
      alert('Failed to post requirement');
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-night-card max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-3 dark:border-night-mute/30">
          <h2 className="text-lg font-bold">Post Direct Buying Requirement</h2>
          <button onClick={onClose} className="text-mute hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase text-mute mb-1">Commodity Needed</label>
            <select
              value={form.commodity}
              onChange={(e) => {
                const c = commodities.find((c) => c._id === e.target.value);
                setForm({ ...form, commodity: e.target.value, commodityName: c?.name || 'Unknown' });
              }}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
              required
            >
              <option value="">Select commodity</option>
              {commodities.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Required Quantity (kg)</label>
              <input type="number" min="1" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required placeholder="800" />
            </div>
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Quality Grade</label>
              <select value={form.qualityGrade} onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20">
                <option value="Any">Any Grade</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="Organic">Organic</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Buyer Organization Type</label>
              <select value={form.buyerType} onChange={(e) => setForm({ ...form, buyerType: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20">
                <option value="retailer">Supermarket / Retailer</option>
                <option value="restaurant">Restaurant / Hotel</option>
                <option value="processor">Food Processing Enterprise</option>
                <option value="institutional">Institutional / Canteen</option>
                <option value="bulk_consumer">Bulk Consumer Group</option>
              </select>
            </div>
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Max Offer Price (₹/kg)</label>
              <input type="number" min="0" step="0.5" value={form.maximumPriceInr} onChange={(e) => setForm({ ...form, maximumPriceInr: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required placeholder="30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Delivery Destination</label>
              <input type="text" value={form.deliveryLocation} onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
            </div>
            <div>
              <label className="block font-bold uppercase text-mute mb-1">Required By Date</label>
              <input type="date" value={form.requiredByDate} onChange={(e) => setForm({ ...form, requiredByDate: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-earth/40 p-3">
            <input
              type="checkbox"
              id="allowPooling"
              checked={form.allowPoolAggregation}
              onChange={(e) => setForm({ ...form, allowPoolAggregation: e.target.checked })}
              className="rounded text-forest"
            />
            <label htmlFor="allowPooling" className="font-bold text-ink dark:text-night-text cursor-pointer">
              Allow Multi-Farmer Supply Pooling (FPO Aggregation)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-earth dark:border-night-mute/20 dark:hover:bg-night-lift">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-forest px-5 py-2 text-sm font-bold text-white hover:bg-forest-deep disabled:opacity-50">
              {loading ? 'Posting...' : 'Post Requirement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ListingCard({ listing, currentUser, onMatch }) {
  const { t } = useTranslation();
  const isBuyer = currentUser?.role === 'buyer';
  const isFarmer = currentUser?.role === 'farmer';
  const isSeller = currentUser?.role === 'seller';

  const gradeColor = listing.qualityGrade === 'A' ? 'bg-forest/15 text-forest' : listing.qualityGrade === 'B' ? 'bg-harvest/15 text-harvest' : 'bg-earth text-ink';

  return (
    <div className="rounded-mm border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card hover:shadow-lg transition-shadow space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest/10">
            <ShoppingBasket size={18} className="text-forest" />
          </div>
          <div>
            <div className="font-bold text-ink dark:text-night-text">{listing.commodityName}</div>
            <div className="text-xs text-mute">{listing.farmer?.name || 'Producer'} • {listing.location}</div>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${gradeColor}`}>
          Grade {listing.qualityGrade}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-mute">
          <Weight size={13} />
          <span className="tabular font-bold text-ink dark:text-night-text">{listing.availableQuantityKg || listing.quantityKg} kg available</span>
        </div>
        <div className="flex items-center gap-1.5 text-mute">
          <IndianRupee size={13} />
          <span className="tabular font-bold text-forest dark:text-harvest">₹{listing.expectedPriceInr}/kg asking</span>
        </div>
        <div className="flex items-center gap-1.5 text-mute">
          <Box size={13} />
          <span>{listing.packagingType?.replace('_', ' ') || 'Crates'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-mute">
          <Calendar size={13} />
          <span>{new Date(listing.harvestDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-line/60 dark:border-night-mute/30">
        <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[10px] font-bold text-forest uppercase">
          {isBuyer ? 'DIRECT SUPPLIER' : 'DIRECT TRADE'}
        </span>
        <button
          onClick={() => onMatch(listing, 'listing')}
          className="flex items-center gap-1 rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-deep transition-colors dark:bg-harvest dark:text-ink"
        >
          <span>{isBuyer ? 'Find Direct Suppliers' : 'Find Direct Buyers'}</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

function RequirementCard({ requirement, currentUser, onMatch }) {
  const { t } = useTranslation();
  const isBuyer = currentUser?.role === 'buyer';
  const gradeColor = requirement.qualityGrade === 'A' ? 'bg-forest/15 text-forest' : requirement.qualityGrade === 'Any' ? 'bg-info/15 text-info' : 'bg-earth text-ink';

  return (
    <div className="rounded-mm border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card hover:shadow-lg transition-shadow space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-harvest/10">
            <Package size={18} className="text-harvest" />
          </div>
          <div>
            <div className="font-bold text-ink dark:text-night-text">{requirement.commodityName}</div>
            <div className="text-xs text-mute">
              {requirement.buyer?.name || 'Buyer'} • <span className="uppercase font-semibold">{requirement.buyerType || 'Retailer'}</span>
            </div>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${gradeColor}`}>
          {requirement.qualityGrade}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-mute">
          <Weight size={13} />
          <span className="tabular font-bold text-ink dark:text-night-text">{requirement.quantityKg} kg needed</span>
        </div>
        <div className="flex items-center gap-1.5 text-mute">
          <IndianRupee size={13} />
          <span className="tabular font-bold text-forest dark:text-harvest">Max ₹{requirement.maximumPriceInr}/kg</span>
        </div>
        <div className="flex items-center gap-1.5 text-mute">
          <MapPin size={13} />
          <span>{requirement.deliveryLocation}</span>
        </div>
        <div className="flex items-center gap-1.5 text-mute">
          <Calendar size={13} />
          <span>By {new Date(requirement.requiredByDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-line/60 dark:border-night-mute/30">
        <span className="rounded-full bg-harvest/15 px-2.5 py-0.5 text-[10px] font-bold text-harvest uppercase">
          {requirement.allowPoolAggregation ? 'POOLS ALLOWED' : 'DIRECT ONLY'}
        </span>
        <button
          onClick={() => onMatch(requirement, 'requirement')}
          className="flex items-center gap-1 rounded-lg bg-harvest px-3 py-1.5 text-xs font-bold text-ink hover:bg-harvest/80 transition-colors"
        >
          <span>{isBuyer ? 'Find Direct Suppliers' : 'Make Direct Offer'}</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('listings'); // 'listings' | 'requirements' | 'pools'
  const [listings, setListings] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [supplyPools, setSupplyPools] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showCreateRequirement, setShowCreateRequirement] = useState(false);
  const [filterCommodity, setFilterCommodity] = useState('');

  const isBuyer = user?.role === 'buyer';
  const isFarmer = user?.role === 'farmer';
  const isSeller = user?.role === 'seller';
  const isAdmin = user?.role === 'admin';

  async function loadData() {
    setLoading(true);
    setErr('');
    try {
      const [listRes, reqRes, poolRes, comRes] = await Promise.all([
        api.get('/marketplace/listings'),
        api.get('/marketplace/requirements'),
        api.get('/marketplace/pools').catch(() => ({ data: { pools: [] } })),
        api.get('/commodities'),
      ]);
      setListings(listRes.data.listings || []);
      setRequirements(reqRes.data.requirements || []);
      setSupplyPools(poolRes.data.pools || []);
      setCommodities(comRes.data.commodities || []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (err && !loading) return <ErrorState message={err} onRetry={loadData} />;
  if (loading) return <LoadingSkeleton />;

  const filteredListings = filterCommodity
    ? listings.filter((l) => l.commodityName?.toLowerCase() === filterCommodity.toLowerCase())
    : listings;
  const filteredRequirements = filterCommodity
    ? requirements.filter((r) => r.commodityName?.toLowerCase() === filterCommodity.toLowerCase())
    : requirements;
  const filteredPools = filterCommodity
    ? supplyPools.filter((p) => p.commodityName?.toLowerCase() === filterCommodity.toLowerCase())
    : supplyPools;

  function handleMatch(item, type) {
    if (type === 'listing' || tab === 'listings') {
      navigate(`/matches?listingId=${item._id}`);
    } else {
      navigate(`/matches?requirementId=${item._id}`);
    }
  }

  // Role-specific Header Copy
  const headerEyebrow = isBuyer
    ? 'Direct Sourcing & Farm Supplier Floor'
    : isFarmer
    ? 'Direct Trading & Aggregation Floor'
    : isSeller
    ? 'Agricultural Supply Floor'
    : 'Platform Administration';

  const headerTitle = isBuyer
    ? t('marketplace.buyerTitle', 'Find Direct Suppliers')
    : isFarmer
    ? t('marketplace.farmerTitle', 'Farmer–Buyer Marketplace')
    : isSeller
    ? t('marketplace.sellerTitle', 'Agricultural Supply Marketplace')
    : t('marketplace.adminTitle', 'Marketplace Oversight & Monitoring');

  const headerSubtitle = isBuyer
    ? t('marketplace.buyerSubtitle', 'Source produce directly from verified farmers and direct suppliers. Zero middleman markups.')
    : isFarmer
    ? t('marketplace.farmerSubtitle', 'Sell your farm harvest directly to verified institutional buyers with zero intermediary cut.')
    : isSeller
    ? t('marketplace.sellerSubtitle', 'Source fresh agricultural inventory and trade directly with bulk buyers and producer networks.')
    : t('marketplace.adminSubtitle', 'Monitor active farm listings, procurement demands, direct trade offers, and supply aggregation pools.');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={headerEyebrow}
        title={headerTitle}
        subtitle={headerSubtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DataStatusBadge status="SIMULATED" />
            <select
              value={filterCommodity}
              onChange={(e) => setFilterCommodity(e.target.value)}
              className="rounded-full border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
            >
              <option value="">{t('marketplace.allCommodities', 'All Commodities')}</option>
              {commodities.map((c) => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Role-Aware Tabs */}
      <div className="flex gap-1 rounded-xl bg-earth/60 p-1 dark:bg-night-lift">
        <button
          onClick={() => setTab('listings')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === 'listings'
              ? 'bg-white text-forest shadow-sm dark:bg-night-card dark:text-harvest'
              : 'text-mute hover:text-ink'
          }`}
        >
          <ShoppingBasket size={14} className="mr-1.5 inline" />
          {isBuyer ? 'Find Direct Suppliers' : t('marketplace.produceListings', 'Farm Listings')} ({filteredListings.length})
        </button>
        <button
          onClick={() => setTab('requirements')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === 'requirements'
              ? 'bg-white text-forest shadow-sm dark:bg-night-card dark:text-harvest'
              : 'text-mute hover:text-ink'
          }`}
        >
          <Package size={14} className="mr-1.5 inline" />
          {isBuyer ? 'My Procurement Demands' : t('marketplace.buyerRequirements', 'Direct Buyer Demands')} ({filteredRequirements.length})
        </button>
        <button
          onClick={() => setTab('pools')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === 'pools'
              ? 'bg-white text-forest shadow-sm dark:bg-night-card dark:text-harvest'
              : 'text-mute hover:text-ink'
          }`}
        >
          <Users size={14} className="mr-1.5 inline" />
          {isBuyer ? 'Supply Pool Opportunities' : 'FPO Supply Pools'} ({filteredPools.length})
        </button>
      </div>

      {/* Role-Specific Action Buttons */}
      <div className="flex justify-end gap-3">
        {isBuyer ? (
          <button
            onClick={() => setShowCreateRequirement(true)}
            className="flex items-center gap-2 rounded-lg bg-harvest px-5 py-2.5 text-sm font-bold text-ink hover:bg-harvest/80 transition-colors"
          >
            <Plus size={16} /> Post Procurement Demand
          </button>
        ) : (isFarmer || isSeller) ? (
          <button
            onClick={() => setShowCreateListing(true)}
            className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest-deep transition-colors"
          >
            <Plus size={16} /> {t('marketplace.listProduce', 'List Produce')}
          </button>
        ) : isAdmin ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateListing(true)}
              className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-deep"
            >
              <Plus size={14} /> List Produce
            </button>
            <button
              onClick={() => setShowCreateRequirement(true)}
              className="flex items-center gap-2 rounded-lg bg-harvest px-4 py-2 text-xs font-bold text-ink hover:bg-harvest/80"
            >
              <Plus size={14} /> Post Requirement
            </button>
          </div>
        ) : null}
      </div>

      {/* Content */}
      {tab === 'listings' ? (
        filteredListings.length === 0 ? (
          <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
            <ShoppingBasket size={32} className="mx-auto text-mute" />
            <div className="mt-3 text-sm font-medium text-mute">
              {isBuyer ? 'No direct suppliers found' : t('marketplace.noListings', 'No produce listings found')}
            </div>
            <div className="mt-1 text-xs text-mute">
              {isBuyer
                ? 'No active farm produce listings match your criteria. Post a procurement demand to notify verified suppliers.'
                : 'List your farm produce to match with direct institutional buyers.'}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((l) => (
              <ListingCard key={l._id} listing={l} currentUser={user} onMatch={handleMatch} />
            ))}
          </div>
        )
      ) : tab === 'requirements' ? (
        filteredRequirements.length === 0 ? (
          <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
            <Package size={32} className="mx-auto text-mute" />
            <div className="mt-3 text-sm font-medium text-mute">
              {isBuyer ? 'No procurement demands found' : t('marketplace.noRequirements', 'No buyer requirements found')}
            </div>
            <div className="mt-1 text-xs text-mute">
              {isBuyer
                ? 'Post direct buying requirements to connect with certified farm suppliers.'
                : 'Direct buyers post procurement requirements here.'}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRequirements.map((r) => (
              <RequirementCard key={r._id} requirement={r} currentUser={user} onMatch={handleMatch} />
            ))}
          </div>
        )
      ) : (
        /* Supply Pools Tab */
        filteredPools.length === 0 ? (
          <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
            <Users size={32} className="mx-auto text-mute" />
            <div className="mt-3 text-sm font-medium text-mute">No active supply pools found</div>
            <div className="mt-1 text-xs text-mute">
              Supply pools are created when buyer orders exceed single-farmer harvest size.
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredPools.map((pool) => (
              <SupplyPoolCard
                key={pool._id}
                pool={pool}
                currentUser={user}
                onContributed={loadData}
              />
            ))}
          </div>
        )
      )}

      {/* Modals */}
      {showCreateListing && (
        <CreateListingForm commodities={commodities} onClose={() => setShowCreateListing(false)} onCreated={loadData} />
      )}
      {showCreateRequirement && (
        <CreateRequirementForm commodities={commodities} onClose={() => setShowCreateRequirement(false)} onCreated={loadData} />
      )}
    </div>
  );
}
