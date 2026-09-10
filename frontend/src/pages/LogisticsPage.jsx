import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
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
  Receipt,
  ArrowRight,
  Sparkles,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Users,
  Box,
} from 'lucide-react';

export default function LogisticsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTxId = searchParams.get('transactionId');

  const [transactions, setTransactions] = useState([]);
  const [selectedTxId, setSelectedTxId] = useState(paramTxId || '');
  const [logistics, setLogistics] = useState(null);
  const [vehicleType, setVehicleType] = useState('standard');
  const [ambientTempC, setAmbientTempC] = useState(31);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  async function loadData() {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get('/marketplace/transactions');
      const allTx = data.transactions || [];
      const relevant = allTx.filter((t) =>
        ['accepted', 'logistics_planned', 'in_transit', 'delivered', 'completed'].includes(t.status)
      );
      setTransactions(relevant);

      const targetId = paramTxId || (relevant.length > 0 ? relevant[0]._id : '');
      if (targetId) {
        setSelectedTxId(targetId);
        await calculateRouteForTx(targetId, vehicleType);
      }
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  async function calculateRouteForTx(txId, vType = vehicleType) {
    if (!txId) return;
    setCalculating(true);
    setErr('');
    try {
      const { data } = await api.get('/marketplace/logistics', {
        params: { transactionId: txId, vehicleType: vType, ambientTempC },
      });
      setLogistics(data.logistics || data);
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.error || e.message);
    }
    setCalculating(false);
  }

  function handleSelectTx(id) {
    setSelectedTxId(id);
    setSearchParams({ transactionId: id });
    calculateRouteForTx(id, vehicleType);
  }

  function handleVehicleChange(v) {
    setVehicleType(v);
    if (selectedTxId) {
      calculateRouteForTx(selectedTxId, v);
    }
  }

  async function advanceStatus(newStatus) {
    if (!selectedTxId) return;
    setAdvancing(true);
    try {
      await api.patch(`/marketplace/transactions/${selectedTxId}/status`, { status: newStatus });
      await loadData();
    } catch (e) {
      alert(e.response?.data?.message || e.response?.data?.error || 'Failed to update status');
    }
    setAdvancing(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (err && !loading && !logistics) return <ErrorState message={err} onRetry={loadData} />;
  if (loading) return <LoadingSkeleton />;

  const selectedTx = transactions.find((t) => t._id === selectedTxId);
  const pickupLocation = selectedTx?.listing?.location || selectedTx?.farmer?.location || 'Nalgonda';
  const deliveryLocation =
    selectedTx?.requirement?.deliveryLocation ||
    selectedTx?.buyer?.location ||
    'Hyderabad';

  const spoilage = logistics?.spoilageRisk;
  const spoilageColor =
    spoilage?.spoilageRiskScore === 'LOW' ? 'bg-forest/15 text-forest border-forest/30' :
    spoilage?.spoilageRiskScore === 'MEDIUM' ? 'bg-harvest/15 text-harvest border-harvest/30' :
    'bg-alert/15 text-alert border-alert/30';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('logistics.eyebrow', 'Logistics Optimization & Cold-Chain Management')}
        title={t('logistics.title', 'Delivery Route & Transit Spoilage Calculator')}
        subtitle={t('logistics.subtitle', 'AI-optimized transport routes derived strictly from accepted transactions with cold-chain and spoilage tracking.')}
        actions={<DataStatusBadge status="SIMULATED" />}
      />

      <div className="rounded-xl border border-harvest/30 bg-harvest/5 px-4 py-2.5 text-xs text-ink dark:bg-harvest/10 flex items-center justify-between">
        <div>
          <span className="font-bold">⚠ Transparency Notice:</span> MandiMind acts as a digital coordination layer. Transport companies are independent service providers, not produce owners.
        </div>
        <DataStatusBadge status="SIMULATED" />
      </div>

      {/* Transaction selection & Route configuration */}
      {transactions.length === 0 ? (
        <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
          <Truck size={36} className="mx-auto text-mute" />
          <h3 className="mt-3 text-base font-bold text-ink dark:text-night-text">{t('logistics.noAcceptedTx', 'No accepted transactions available for logistics')}</h3>
          <p className="mt-1 text-xs text-mute max-w-md mx-auto">
            {t('logistics.noAcceptedDesc', 'Logistics routes are created from accepted marketplace transactions. Accept an offer in Transactions or AI Matches to calculate and plan delivery.')}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => navigate('/transactions')}
              className="rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-deep transition-colors"
            >
              {t('nav.transactions', 'View Transactions')}
            </button>
            <button
              onClick={() => navigate('/matches')}
              className="rounded-lg border border-line px-4 py-2 text-xs font-bold text-ink hover:bg-earth dark:border-night-mute/20 dark:text-night-text transition-colors"
            >
              {t('nav.matches', 'View AI Matches')}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-mm border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3 dark:border-night-mute/30">
            <div>
              <h3 className="font-bold text-ink dark:text-night-text">{t('logistics.selectTx', 'Select Accepted Transaction')}</h3>
              <p className="text-xs text-mute">Derived strictly from verified agreement between producer and buyer.</p>
            </div>
            {selectedTx && (
              <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-extrabold uppercase text-forest dark:bg-harvest/15 dark:text-harvest">
                {t('common.status', 'Status')}: {t(`transactions.${selectedTx.status}`, selectedTx.status?.replace('_', ' '))}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-mute mb-1">{t('logistics.selectTx', 'Accepted Transaction')}</label>
              <select
                value={selectedTxId}
                onChange={(e) => handleSelectTx(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2.5 text-sm dark:bg-night-lift dark:border-night-mute/20 font-medium"
              >
                {transactions.map((tx) => (
                  <option key={tx._id} value={tx._id}>
                    {tx.commodityName} — {tx.quantityKg} kg | {tx.farmer?.name || 'Producer'} → {tx.buyer?.name || 'Buyer'} (₹{tx.agreedPriceInr}/kg)
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-mute mb-1">Vehicle & Cold-Chain</label>
              <select
                value={vehicleType}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2.5 text-sm dark:bg-night-lift dark:border-night-mute/20 font-bold text-forest dark:text-harvest"
              >
                <option value="standard">Standard Truck (Ambient)</option>
                <option value="ventilated">Ventilated Agri-Crate Van</option>
                <option value="refrigerated">❄️ Refrigerated (Cold-Chain)</option>
              </select>
            </div>
          </div>

          {/* Transaction parties & locations */}
          {selectedTx && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="rounded-lg border border-line/70 bg-earth/40 p-4 dark:border-night-mute/30 dark:bg-night-lift/30">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-forest dark:text-harvest">
                  {t('logistics.pickup', 'Pickup Listing (Producer)')}
                </div>
                <div className="mt-2 font-bold text-ink dark:text-night-text">
                  {selectedTx.commodityName} — {selectedTx.quantityKg} kg — {pickupLocation}
                </div>
                <div className="mt-1 text-xs text-mute">
                  {t('auth.farmerDemo', 'Producer')}: {selectedTx.farmer?.name || 'Farmer'} • ₹{selectedTx.agreedPriceInr}/kg agreed price
                </div>
              </div>

              <div className="rounded-lg border border-line/70 bg-earth/40 p-4 dark:border-night-mute/30 dark:bg-night-lift/30">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-harvest">
                  {t('logistics.delivery', 'Delivery Destination (Buyer)')}
                </div>
                <div className="mt-2 font-bold text-ink dark:text-night-text">
                  {selectedTx.commodityName} — {selectedTx.quantityKg} kg — {deliveryLocation}
                </div>
                <div className="mt-1 text-xs text-mute">
                  {t('auth.buyerDemo', 'Buyer')}: {selectedTx.buyer?.name || 'Direct Buyer'} • ₹{selectedTx.totalValueInr?.toLocaleString('en-IN')} total order
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-mute">
              {t('common.commodity', 'Commodity')}: <strong className="text-ink dark:text-night-text">{selectedTx?.commodityName}</strong> • {t('common.quantity', 'Quantity')}: <strong className="text-ink dark:text-night-text">{selectedTx?.quantityKg} kg</strong>
            </div>
            <div className="flex gap-2">
              {selectedTx?.status === 'accepted' && (
                <button
                  onClick={() => advanceStatus('logistics_planned')}
                  disabled={advancing}
                  className="flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/10 px-4 py-2 text-xs font-bold text-forest hover:bg-forest hover:text-white transition-colors dark:border-harvest/30 dark:bg-harvest/10 dark:text-harvest"
                >
                  <Check size={14} />
                  {advancing ? t('common.loading', 'Saving...') : t('logistics.confirmPlan', 'Confirm Logistics Plan')}
                </button>
              )}
              {selectedTx?.status === 'logistics_planned' && (
                <button
                  onClick={() => advanceStatus('in_transit')}
                  disabled={advancing}
                  className="flex items-center gap-1.5 rounded-lg bg-harvest px-4 py-2 text-xs font-bold text-ink hover:bg-harvest/90 transition-colors"
                >
                  <Truck size={14} />
                  Dispatch Vehicle (Mark In Transit)
                </button>
              )}
              {selectedTx?.status === 'in_transit' && (
                <button
                  onClick={() => advanceStatus('delivered')}
                  disabled={advancing}
                  className="flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-deep transition-colors"
                >
                  <Check size={14} />
                  Mark Produce Delivered
                </button>
              )}
              <button
                onClick={() => calculateRouteForTx(selectedTxId, vehicleType)}
                disabled={!selectedTxId || calculating}
                className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white hover:bg-forest-deep disabled:opacity-50 transition-colors"
              >
                <Navigation size={14} />
                {calculating ? 'Calculating...' : 'Recalculate Route'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logistics & Spoilage Results */}
      {logistics && selectedTx && (
        <>
          {/* Spoilage Risk Advisory Banner */}
          {spoilage && (
            <div className="rounded-xl border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Thermometer size={18} className="text-forest dark:text-harvest" />
                  <h4 className="font-bold text-ink dark:text-night-text">Transit Perishability & Spoilage Intelligence</h4>
                </div>
                <div className={`flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold ${spoilageColor}`}>
                  {spoilage.spoilageRiskScore} RISK ({spoilage.spoilagePercent}% Est. Decay)
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-lg bg-earth/40 p-3 dark:bg-night-lift/30">
                  <div className="text-mute uppercase text-[10px]">Commodity Perishability</div>
                  <div className="mt-1 font-bold text-ink dark:text-night-text">{spoilage.perishability} Perishable</div>
                </div>
                <div className="rounded-lg bg-earth/40 p-3 dark:bg-night-lift/30">
                  <div className="text-mute uppercase text-[10px]">Safe Transit Window</div>
                  <div className="mt-1 font-bold text-ink dark:text-night-text">Max {spoilage.maxSafeTransitHours} Hours ({vehicleType})</div>
                </div>
                <div className="rounded-lg bg-earth/40 p-3 dark:bg-night-lift/30">
                  <div className="text-mute uppercase text-[10px]">Estimated Transit Duration</div>
                  <div className="mt-1 font-bold text-ink dark:text-night-text">{Math.round(logistics.etaMin / 60)} Hours ({logistics.distanceKm} km)</div>
                </div>
              </div>

              {spoilage.spoilageRiskScore === 'HIGH' && vehicleType !== 'refrigerated' && (
                <div className="rounded-lg bg-alert/10 p-3 text-xs text-alert flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>High Transit Spoilage Warning:</strong> Ambient temperature and transit distance create elevated spoilage risk. Switch to Refrigerated Cold-Chain to protect farm produce quality.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delivery Plan Card */}
          <div className="rounded-mm border border-line bg-white p-6 shadow-card dark:border-night-mute/20 dark:bg-night-card">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} className="text-forest" />
              <h3 className="font-bold text-ink dark:text-night-text">
                Delivery Plan: {logistics.commodityName || selectedTx.commodityName} ({logistics.quantityKg} kg)
              </h3>
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
                AI Recommended Routes & Mode Comparison
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
                          {route.distanceKm} km • {route.etaMin} min • {route.vehicleType || 'standard'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] uppercase text-mute">Transport Cost</div>
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
                <Popup>
                  <strong>Pickup Point (Producer):</strong> {logistics.pickup.location}
                  <br />
                  {selectedTx.commodityName} — {selectedTx.quantityKg} kg
                </Popup>
              </CircleMarker>
              <CircleMarker
                center={[logistics.delivery.lat, logistics.delivery.lng]}
                radius={10}
                pathOptions={{ color: '#EAB308', fillColor: '#EAB308', fillOpacity: 0.8 }}
              >
                <Popup>
                  <strong>Delivery Destination (Buyer):</strong> {logistics.delivery.location}
                  <br />
                  {selectedTx.commodityName} — {selectedTx.quantityKg} kg
                </Popup>
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
        </>
      )}
    </div>
  );
}
