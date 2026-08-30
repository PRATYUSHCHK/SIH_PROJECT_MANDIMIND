import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
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
} from 'lucide-react';

function CreateListingForm({ commodities, onClose, onCreated }) {
  const [form, setForm] = useState({
    commodity: '',
    commodityName: 'Tomato',
    quantityKg: '',
    qualityGrade: 'A',
    harvestDate: new Date().toISOString().split('T')[0],
    expectedPriceInr: '',
    minimumPriceInr: '',
    location: 'Hyderabad',
    deliveryPreference: 'both',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-mm bg-white p-6 shadow-card dark:bg-night-card max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">List Your Produce</h2>
          <button onClick={onClose} className="text-mute hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Commodity</label>
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
              <label className="block text-xs font-bold uppercase text-mute mb-1">Quantity (kg)</label>
              <input type="number" min="1" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required placeholder="500" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">Quality Grade</label>
              <select value={form.qualityGrade} onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20">
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
                <option value="Organic">Organic</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Harvest Date</label>
            <input type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">Expected Price (₹/kg)</label>
              <input type="number" min="0" step="0.5" value={form.expectedPriceInr} onChange={(e) => setForm({ ...form, expectedPriceInr: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required placeholder="28" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">Min Price (₹/kg)</label>
              <input type="number" min="0" step="0.5" value={form.minimumPriceInr} onChange={(e) => setForm({ ...form, minimumPriceInr: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" placeholder="Auto" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Delivery Preference</label>
            <select value={form.deliveryPreference} onChange={(e) => setForm({ ...form, deliveryPreference: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20">
              <option value="both">Both Pickup & Delivery</option>
              <option value="pickup">Buyer Pickup Only</option>
              <option value="delivery">Farmer Delivery Only</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-earth dark:border-night-mute/20 dark:hover:bg-night-lift">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest-deep disabled:opacity-50">
              {loading ? 'Creating...' : 'List Produce'}
            </button>
          </div>
        </form>
        <div className="mt-3 text-xs text-mute">
          <DataStatusBadge status="SIMULATED" /> Listing will be visible to all buyers on the marketplace.
        </div>
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
      alert('Failed to create requirement');
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-mm bg-white p-6 shadow-card dark:bg-night-card max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Post Buying Requirement</h2>
          <button onClick={onClose} className="text-mute hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Commodity Needed</label>
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
              <label className="block text-xs font-bold uppercase text-mute mb-1">Required Quantity (kg)</label>
              <input type="number" min="1" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required placeholder="800" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">Quality Grade</label>
              <select value={form.qualityGrade} onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20">
                <option value="Any">Any Grade</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">Max Price (₹/kg)</label>
              <input type="number" min="0" step="0.5" value={form.maximumPriceInr} onChange={(e) => setForm({ ...form, maximumPriceInr: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required placeholder="30" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">Required By</label>
              <input type="date" value={form.requiredByDate} onChange={(e) => setForm({ ...form, requiredByDate: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Delivery Location</label>
            <input type="text" value={form.deliveryLocation} onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })} className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20" required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-earth dark:border-night-mute/20 dark:hover:bg-night-lift">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest-deep disabled:opacity-50">
              {loading ? 'Posting...' : 'Post Requirement'}
            </button>
          </div>
        </form>
        <div className="mt-3 text-xs text-mute">
          <DataStatusBadge status="SIMULATED" /> Your requirement will be matched with available farmer listings.
        </div>
      </div>
    </div>
  );
}

function ListingCard({ listing, onMatch }) {
  const gradeColor = listing.qualityGrade === 'A' ? 'bg-forest/15 text-forest' : listing.qualityGrade === 'Organic' ? 'bg-harvest/15 text-harvest' : 'bg-earth text-ink';
  return (
    <div className="rounded-mm border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest/10">
            <ShoppingBasket size={18} className="text-forest" />
          </div>
          <div>
            <div className="font-bold text-ink dark:text-night-text">{listing.commodityName}</div>
            <div className="text-xs text-mute">Listed by {listing.farmer?.name || 'Farmer'}</div>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${gradeColor}`}>
          {listing.qualityGrade}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Weight size={14} className="text-mute" />
          <span className="tabular font-bold">{listing.quantityKg} kg</span>
        </div>
        <div className="flex items-center gap-2">
          <IndianRupee size={14} className="text-mute" />
          <span className="tabular font-bold">₹{listing.expectedPriceInr}/kg</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-mute" />
          <span>{listing.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-mute" />
          <span>Harvested {new Date(listing.harvestDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-earth/60 px-2 py-0.5 text-[10px] text-mute dark:bg-night-lift">
          {listing.deliveryPreference === 'both' ? 'Pickup or Delivery' : listing.deliveryPreference}
        </span>
        <button
          onClick={() => onMatch(listing)}
          className="rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-bold text-forest hover:bg-forest hover:text-white transition-colors dark:bg-harvest/10 dark:text-harvest dark:hover:bg-harvest"
        >
          Find Buyers
        </button>
      </div>
    </div>
  );
}

function RequirementCard({ requirement, onMatch }) {
  const gradeColor = requirement.qualityGrade === 'A' ? 'bg-forest/15 text-forest' : requirement.qualityGrade === 'Any' ? 'bg-info/15 text-info' : 'bg-earth text-ink';
  return (
    <div className="rounded-mm border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-harvest/10">
            <Package size={18} className="text-harvest" />
          </div>
          <div>
            <div className="font-bold text-ink dark:text-night-text">{requirement.commodityName}</div>
            <div className="text-xs text-mute">Required by {requirement.buyer?.name || 'Buyer'}</div>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${gradeColor}`}>
          {requirement.qualityGrade}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Weight size={14} className="text-mute" />
          <span className="tabular font-bold">{requirement.quantityKg} kg needed</span>
        </div>
        <div className="flex items-center gap-2">
          <IndianRupee size={14} className="text-mute" />
          <span className="tabular font-bold">Max ₹{requirement.maximumPriceInr}/kg</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-mute" />
          <span>{requirement.deliveryLocation}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-mute" />
          <span>By {new Date(requirement.requiredByDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onMatch(requirement)}
          className="rounded-lg bg-harvest/10 px-3 py-1.5 text-xs font-bold text-harvest hover:bg-harvest hover:text-ink transition-colors"
        >
          Find Suppliers
        </button>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showCreateRequirement, setShowCreateRequirement] = useState(false);
  const [filterCommodity, setFilterCommodity] = useState('');

  async function loadData() {
    setLoading(true);
    setErr('');
    try {
      const [listRes, reqRes, comRes] = await Promise.all([
        api.get('/marketplace/listings'),
        api.get('/marketplace/requirements'),
        api.get('/commodities'),
      ]);
      setListings(listRes.data.listings);
      setRequirements(reqRes.data.requirements);
      setCommodities(comRes.data.commodities);
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
    ? listings.filter((l) => l.commodityName.toLowerCase() === filterCommodity.toLowerCase())
    : listings;
  const filteredRequirements = filterCommodity
    ? requirements.filter((r) => r.commodityName.toLowerCase() === filterCommodity.toLowerCase())
    : requirements;

  function handleMatch(item) {
    if (tab === 'listings') {
      window.location.href = `/matches?listingId=${item._id}`;
    } else {
      window.location.href = `/matches?requirementId=${item._id}`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Direct Marketplace"
        title="Farmer–Buyer Marketplace"
        subtitle="Connect directly with buyers. No intermediaries. AI-powered matching for fair prices."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DataStatusBadge status="SIMULATED" />
            <select
              value={filterCommodity}
              onChange={(e) => setFilterCommodity(e.target.value)}
              className="rounded-full border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
            >
              <option value="">All Commodities</option>
              {commodities.map((c) => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Data source */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-earth/40 px-4 py-2 text-xs text-mute dark:border-night-mute/20 dark:bg-night-lift/40">
        <div>
          <span className="font-bold text-ink dark:text-night-text">Data Source:</span> SIMULATED DEMO DATA
        </div>
        <div>
          <span className="font-bold text-ink dark:text-night-text">Last Updated:</span> {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-earth/60 p-1 dark:bg-night-lift">
        <button
          onClick={() => setTab('listings')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === 'listings' ? 'bg-white text-forest shadow-sm dark:bg-night-card dark:text-harvest' : 'text-mute hover:text-ink'
          }`}
        >
          <ShoppingBasket size={14} className="mr-1.5 inline" />
          Produce Listings ({filteredListings.length})
        </button>
        <button
          onClick={() => setTab('requirements')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === 'requirements' ? 'bg-white text-forest shadow-sm dark:bg-night-card dark:text-harvest' : 'text-mute hover:text-ink'
          }`}
        >
          <Package size={14} className="mr-1.5 inline" />
          Buyer Requirements ({filteredRequirements.length})
        </button>
      </div>

      {/* Create button */}
      <div className="flex justify-end">
        {tab === 'listings' && (user?.role === 'farmer' || user?.role === 'admin') ? (
          <button
            onClick={() => setShowCreateListing(true)}
            className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-deep transition-colors"
          >
            <Plus size={16} /> List Produce
          </button>
        ) : tab === 'requirements' && (user?.role === 'buyer' || user?.role === 'admin' || user?.role === 'seller') ? (
          <button
            onClick={() => setShowCreateRequirement(true)}
            className="flex items-center gap-2 rounded-lg bg-harvest px-4 py-2.5 text-sm font-bold text-ink hover:bg-harvest/80 transition-colors"
          >
            <Plus size={16} /> Post Requirement
          </button>
        ) : null}
      </div>

      {/* Content */}
      {tab === 'listings' ? (
        filteredListings.length === 0 ? (
          <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
            <ShoppingBasket size={32} className="mx-auto text-mute" />
            <div className="mt-3 text-sm font-medium text-mute">No produce listings found</div>
            <div className="mt-1 text-xs text-mute">Farmers can list their produce here to find buyers directly.</div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((l) => (
              <ListingCard key={l._id} listing={l} onMatch={handleMatch} />
            ))}
          </div>
        )
      ) : filteredRequirements.length === 0 ? (
        <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
          <Package size={32} className="mx-auto text-mute" />
          <div className="mt-3 text-sm font-medium text-mute">No buyer requirements found</div>
          <div className="mt-1 text-xs text-mute">Buyers can post their requirements here to find farmers directly.</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequirements.map((r) => (
            <RequirementCard key={r._id} requirement={r} onMatch={handleMatch} />
          ))}
        </div>
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
