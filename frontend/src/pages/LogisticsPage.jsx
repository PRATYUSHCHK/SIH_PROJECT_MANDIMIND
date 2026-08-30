import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck,
  MapPin,
  Navigation,
  Clock,
  IndianRupee,
  Route,
  Weight,
  Check,
} from 'lucide-react';

export default function LogisticsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [logistics, setLogistics] = useState(null);
  const [selectedListing, setSelectedListing] = useState('');
  const [selectedRequirement, setSelectedRequirement] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  async function loadData() {
    setLoading(true);
    setErr('');
    try {
      const [listRes, reqRes] = await Promise.all([
        api.get('/marketplace/listings'),
        api.get('/marketplace/requirements'),
      ]);
      setListings(listRes.data.listings || []);
      setRequirements(reqRes.data.requirements || []);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  async function calculateRoute() {
    if (!selectedListing) return;
    setCalculating(true);
    try {
      const params = new URLSearchParams({ listingId: selectedListing });
      if (selectedRequirement) params.append('requirementId', selectedRequirement);
      const { data } = await api.get(`/marketplace/logistics?${params}`);
      setLogistics(data.logistics);
    } catch (e) {
      alert('Failed to calculate logistics');
    }
    setCalculating(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (err) return <ErrorState message={err} onRetry={loadData} />;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Logistics Optimization"
        title="Delivery Route & Cost Calculator"
        subtitle="AI-optimized transport routes with cost comparison. Clearly labeled as SIMULATED estimates."
        actions={<DataStatusBadge status="SIMULATED" />}
      />

      <div className="rounded-xl border border-harvest/30 bg-harvest/5 px-4 py-2 text-xs text-ink dark:bg-harvest/10">
        <span className="font-bold">⚠ Note:</span> Route calculations use simulated distance estimates.
        A real routing API (Google Maps, OSRM) can be integrated for production use.
      </div>

      {/* Selection form */}
      <div className="rounded-mm border border-line bg-white p-5 dark:border-night-mute/20 dark:bg-night-card">
        <h3 className="mb-3 font-bold text-ink dark:text-night-text">Calculate Delivery Plan</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Pickup Listing</label>
            <select
              value={selectedListing}
              onChange={(e) => setSelectedListing(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
            >
              <option value="">Select a listing</option>
              {listings.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.commodityName} — {l.quantityKg} kg — {l.location} (₹{l.expectedPriceInr}/kg)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-mute mb-1">Delivery Destination</label>
            <select
              value={selectedRequirement}
              onChange={(e) => setSelectedRequirement(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm dark:bg-night-lift dark:border-night-mute/20"
            >
              <option value="">Select a buyer requirement</option>
              {requirements.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.commodityName} — {r.quantityKg} kg — {r.deliveryLocation}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={calculateRoute}
            disabled={!selectedListing || calculating}
            className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-deep disabled:opacity-50 transition-colors"
          >
            <Navigation size={14} />
            {calculating ? 'Calculating...' : 'Calculate Route'}
          </button>
        </div>
      </div>

      {/* Logistics results */}
      {logistics && (
        <>
          {/* Delivery Plan Card */}
          <div className="rounded-mm border border-line bg-white p-6 shadow-card dark:border-night-mute/20 dark:bg-night-card">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} className="text-forest" />
              <h3 className="font-bold text-ink dark:text-night-text">Delivery Plan</h3>
              <DataStatusBadge status="SIMULATED" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-earth/50 p-4 dark:bg-night-lift/40">
                <div className="text-[11px] uppercase text-mute">Pickup</div>
                <div className="mt-1 flex items-center gap-1">
                  <MapPin size={14} className="text-forest" />
                  <span className="font-bold text-ink dark:text-night-text">{logistics.pickup.location}</span>
                </div>
              </div>
              <div className="rounded-lg bg-earth/50 p-4 dark:bg-night-lift/40">
                <div className="text-[11px] uppercase text-mute">Delivery</div>
                <div className="mt-1 flex items-center gap-1">
                  <MapPin size={14} className="text-harvest" />
                  <span className="font-bold text-ink dark:text-night-text">{logistics.delivery.location}</span>
                </div>
              </div>
              <div className="rounded-lg bg-earth/50 p-4 dark:bg-night-lift/40">
                <div className="text-[11px] uppercase text-mute">Quantity</div>
                <div className="mt-1 flex items-center gap-1">
                  <Weight size={14} className="text-mute" />
                  <span className="font-bold tabular text-ink dark:text-night-text">{logistics.quantityKg} kg</span>
                </div>
              </div>
              <div className="rounded-lg bg-earth/50 p-4 dark:bg-night-lift/40">
                <div className="text-[11px] uppercase text-mute">Distance</div>
                <div className="mt-1 flex items-center gap-1">
                  <Route size={14} className="text-mute" />
                  <span className="font-bold tabular text-ink dark:text-night-text">{logistics.distanceKm} km</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-forest/10 p-4 dark:bg-harvest/10">
                <div className="text-[11px] uppercase text-mute">Total Transport Cost</div>
                <div className="mt-1 font-extrabold tabular text-xl text-forest dark:text-harvest">
                  ₹{logistics.transportCostInr?.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="rounded-lg bg-forest/10 p-4 dark:bg-harvest/10">
                <div className="text-[11px] uppercase text-mute">Cost per kg</div>
                <div className="mt-1 font-extrabold tabular text-xl text-forest dark:text-harvest">
                  ₹{logistics.transportCostPerKg}/kg
                </div>
              </div>
              <div className="rounded-lg bg-forest/10 p-4 dark:bg-harvest/10">
                <div className="text-[11px] uppercase text-mute">Estimated Travel Time</div>
                <div className="mt-1 font-extrabold tabular text-xl text-ink dark:text-night-text">
                  {Math.floor(logistics.etaMin / 60)}h {logistics.etaMin % 60}m
                </div>
              </div>
            </div>
          </div>

          {/* Route comparison */}
          {logistics.routes && logistics.routes.length > 0 && (
            <div className="rounded-mm border border-line bg-white p-6 shadow-card dark:border-night-mute/20 dark:bg-night-card">
              <h3 className="mb-4 font-bold flex items-center gap-2 text-ink dark:text-night-text">
                <Route size={18} className="text-forest" />
                AI Recommended Routes
              </h3>
              <div className="space-y-3">
                {logistics.routes.map((route, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
                      route.recommended
                        ? 'border-forest/30 bg-forest/5 dark:border-harvest/30 dark:bg-harvest/5'
                        : 'border-line bg-earth/30 dark:border-night-mute/20 dark:bg-night-lift/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {route.recommended && (
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-forest text-white dark:bg-harvest dark:text-ink">
                          <Check size={14} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink dark:text-night-text">{route.name}</span>
                          {route.recommended && (
                            <span className="rounded-full bg-forest/15 px-2 py-0.5 text-[10px] font-extrabold text-forest dark:bg-harvest/15 dark:text-harvest">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-mute">
                          {route.distanceKm} km • {route.etaMin} min
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] uppercase text-mute">Transport</div>
                        <div className="font-bold tabular">₹{route.transportCostInr?.toLocaleString('en-IN')}</div>
                      </div>
                      {route.saving > 0 && (
                        <div className="rounded-lg bg-forest/10 px-3 py-1 text-xs font-bold text-forest dark:bg-harvest/10 dark:text-harvest">
                          Saving ₹{route.saving}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          <div className="rounded-mm overflow-hidden border border-line">
            <MapContainer
              center={[logistics.pickup.lat, logistics.pickup.lng]}
              zoom={8}
              style={{ height: '400px', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <CircleMarker
                center={[logistics.pickup.lat, logistics.pickup.lng]}
                radius={10}
                pathOptions={{ color: '#166534', fillColor: '#166534', fillOpacity: 0.8 }}
              >
                <Popup><strong>Pickup:</strong> {logistics.pickup.location}</Popup>
              </CircleMarker>
              <CircleMarker
                center={[logistics.delivery.lat, logistics.delivery.lng]}
                radius={10}
                pathOptions={{ color: '#EAB308', fillColor: '#EAB308', fillOpacity: 0.8 }}
              >
                <Popup><strong>Delivery:</strong> {logistics.delivery.location}</Popup>
              </CircleMarker>
              <Polyline
                positions={[
                  [logistics.pickup.lat, logistics.pickup.lng],
                  [logistics.delivery.lat, logistics.delivery.lng],
                ]}
                pathOptions={{ color: '#166534', weight: 3, dashArray: '8 8' }}
              />
            </MapContainer>
          </div>

          <div className="text-xs text-mute">
            <DataStatusBadge status="SIMULATED" /> All route and cost calculations are simulated estimates.
          </div>
        </>
      )}
    </div>
  );
}
