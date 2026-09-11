import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/index.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { ErrorState, LoadingSkeleton } from '../components/States.jsx';
import { SupplyPoolDetailModal } from '../components/SupplyPoolDetailModal.jsx';
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
  Building2,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export default function LogisticsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTxId = searchParams.get('transactionId');

  const [activeTab, setActiveTab] = useState('pools'); // 'pools' | 'direct'
  const [transactions, setTransactions] = useState([]);
  const [supplyPools, setSupplyPools] = useState([]);
  const [poolShipments, setPoolShipments] = useState([]);
  const [selectedTxId, setSelectedTxId] = useState(paramTxId || '');
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [activeModalPoolId, setActiveModalPoolId] = useState(null);

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
      // 1. Direct transactions
      const txRes = await api.get('/marketplace/transactions');
      const allTx = txRes.data.transactions || [];
      const directTx = allTx.filter((t) =>
        ['accepted', 'logistics_planned', 'in_transit', 'delivered', 'completed'].includes(t.status) &&
        t.tradeType !== 'POOL_AGGREGATION'
      );
      setTransactions(directTx);

      // 2. Supply Pools & Pool Shipments
      const [poolsRes, shipRes] = await Promise.all([
        api.get('/marketplace/pools'),
        api.get('/marketplace/shipments?tradeType=POOL_AGGREGATION').catch(() => ({ data: { shipments: [] } })),
      ]);

      const activePools = poolsRes.data.pools || [];
      setSupplyPools(activePools);
      setPoolShipments(shipRes.data?.shipments || []);

      if (activePools.length > 0) {
        setSelectedPoolId(activePools[0]._id);
      }

      const targetId = paramTxId || (directTx.length > 0 ? directTx[0]._id : '');
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

  if (err && !loading && !logistics && supplyPools.length === 0) {
    return <ErrorState message={err} onRetry={loadData} />;
  }
  if (loading) return <LoadingSkeleton />;

  const selectedPool = supplyPools.find((p) => p._id === selectedPoolId) || supplyPools[0];
  const selectedTx = transactions.find((t) => t._id === selectedTxId);

  // Multi-stop coordinates for Leaflet Map
  const poolWaypoints = selectedPool?.consolidatedLogistics?.routeWaypoints || [];
  const poolStops = selectedPool?.contributors || [];
  const mapPositions = poolWaypoints
    .filter((w) => w.lat && w.lng)
    .map((w) => [w.lat, w.lng]);

  const defaultCenter = mapPositions.length > 0 ? mapPositions[0] : [17.385, 78.487];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('logistics.eyebrow', 'Logistics Optimization & Cold-Chain Management')}
        title={t('logistics.title', 'Delivery Route & Transit Spoilage Calculator')}
        subtitle="AI-optimized multi-stop consolidation and direct trade transport routing with perishability safeguards."
        actions={<DataStatusBadge status="SIMULATED" />}
      />

      <div className="rounded-xl border border-harvest/30 bg-harvest/5 px-4 py-2.5 text-xs text-ink dark:bg-harvest/10 flex items-center justify-between">
        <div>
          <span className="font-bold">⚠ Transparency Notice:</span> MandiMind acts as a digital trade coordinator. Logistics carriers are independent transport providers.
        </div>
        <DataStatusBadge status="SIMULATED" />
      </div>

      {/* Navigation Tabs: Supply Pool vs Direct Trade */}
      <div className="flex items-center gap-3 border-b border-line dark:border-night-mute/30 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('pools')}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'pools'
              ? 'border-harvest text-harvest'
              : 'border-transparent text-mute hover:text-ink'
          }`}
        >
          <Users size={16} />
          <span>SUPPLY POOL SHIPMENTS ({supplyPools.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('direct')}
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'direct'
              ? 'border-forest text-forest dark:border-harvest dark:text-harvest'
              : 'border-transparent text-mute hover:text-ink'
          }`}
        >
          <Truck size={16} />
          <span>DIRECT TRADE SHIPMENTS ({transactions.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: SUPPLY POOL SHIPMENTS ──────────────────────────────── */}
      {activeTab === 'pools' && (
        <div className="space-y-6">
          {supplyPools.length === 0 ? (
            <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
              <Users size={36} className="mx-auto text-mute" />
              <h3 className="mt-3 text-base font-bold text-ink dark:text-night-text">No active supply pool shipments</h3>
              <p className="mt-1 text-xs text-mute max-w-md mx-auto">
                Supply pool shipments are created when multiple farmers collectively fulfill bulk buyer requirements.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Pool Selector & Details */}
              <div className="space-y-4 lg:col-span-1">
                <div className="rounded-xl border border-line bg-white p-4 shadow-sm dark:border-night-mute/20 dark:bg-night-card space-y-3">
                  <h3 className="font-bold text-ink dark:text-night-text text-sm flex items-center justify-between">
                    <span>Active Coordinated Pools</span>
                    <span className="text-[10px] text-mute">{supplyPools.length} Active</span>
                  </h3>

                  <div className="space-y-2">
                    {supplyPools.map((p) => {
                      const isSelected = p._id === selectedPool?._id;
                      return (
                        <div
                          key={p._id}
                          onClick={() => setSelectedPoolId(p._id)}
                          className={`cursor-pointer rounded-xl border p-3 text-xs transition-all ${
                            isSelected
                              ? 'border-forest bg-forest/5 shadow dark:border-harvest dark:bg-harvest/10'
                              : 'border-line/70 hover:bg-earth/40 dark:border-night-mute/20 dark:hover:bg-night-lift/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-ink dark:text-night-text">{p.commodityName}</span>
                            <span className="rounded-full bg-forest/15 px-2 py-0.5 text-[9px] font-bold text-forest uppercase">
                              {p.status?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-mute mt-1 flex items-center justify-between">
                            <span>Buyer: {p.buyerName || 'Hyderabad Fresh Foods'}</span>
                            <span className="font-bold tabular text-forest dark:text-harvest">{p.collectedQuantityKg} kg</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Pool Shipment Card */}
                {selectedPool && (
                  <div className="rounded-xl border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-4">
                    <div className="flex items-center justify-between border-b border-line/60 pb-3 dark:border-night-mute/30">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase text-forest dark:text-harvest">
                          CONSOLIDATED SHIPMENT
                        </div>
                        <h4 className="text-base font-bold text-ink dark:text-night-text">
                          {selectedPool.commodityName} — {selectedPool.collectedQuantityKg} kg
                        </h4>
                      </div>
                      <span className="rounded-full bg-harvest/15 px-2.5 py-0.5 text-[10px] font-bold text-harvest uppercase">
                        {selectedPool.status?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-mute">Buyer:</span>
                        <span className="font-semibold text-ink dark:text-night-text">{selectedPool.buyerName || 'Hyderabad Fresh Foods'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mute">Destination:</span>
                        <span className="font-semibold text-ink dark:text-night-text">{selectedPool.destinationLocation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mute">Participating Farmers:</span>
                        <span className="font-bold text-forest dark:text-harvest">{selectedPool.contributors?.length} Farmers</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mute">Assigned Vehicle:</span>
                        <span className="font-semibold text-ink dark:text-night-text">
                          {selectedPool.consolidatedLogistics?.vehicleType === 'refrigerated' ? '❄️ Cold-Chain Reefer' : 'Standard Cargo Truck'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mute">Total Distance:</span>
                        <span className="font-bold tabular text-ink dark:text-night-text">
                          {selectedPool.consolidatedLogistics?.totalDistanceKm || 95} km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mute">Estimated Travel Time:</span>
                        <span className="font-bold tabular text-ink dark:text-night-text">
                          {selectedPool.consolidatedLogistics?.estimatedTravelTimeMin || 140} mins
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mute">Total Freight:</span>
                        <span className="font-extrabold text-forest dark:text-harvest tabular">
                          ₹{selectedPool.consolidatedLogistics?.totalTransportCostInr || 1850}
                        </span>
                      </div>
                    </div>

                    {/* Action Button to open complete tracking modal */}
                    <button
                      type="button"
                      onClick={() => setActiveModalPoolId(selectedPool._id)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest py-2.5 text-xs font-bold text-white hover:bg-forest-deep transition-all shadow-md dark:bg-harvest dark:text-ink"
                    >
                      <Navigation size={14} />
                      <span>Track Shipment & Fulfillment</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Multi-Stop Route Map & Stops */}
              <div className="space-y-4 lg:col-span-2">
                {/* Multi-Stop Leaflet Map */}
                <div className="rounded-xl border border-line bg-white p-4 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-ink dark:text-night-text flex items-center gap-2 text-sm">
                      <Route size={16} className="text-forest" />
                      <span>Multi-Stop Consolidated Pickup Route</span>
                    </h4>
                    <span className="text-[10px] text-mute font-mono">SIMULATED ROUTE VISUALIZATION</span>
                  </div>

                  <div className="h-[320px] w-full overflow-hidden rounded-xl border border-line dark:border-night-mute/30">
                    <MapContainer
                      center={defaultCenter}
                      zoom={9}
                      scrollWheelZoom={false}
                      className="h-full w-full"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {mapPositions.length > 1 && (
                        <Polyline positions={mapPositions} color="#15803d" weight={4} dashArray="6, 6" />
                      )}

                      {poolWaypoints.map((w, idx) => (
                        <CircleMarker
                          key={idx}
                          center={[w.lat || 17.05, w.lng || 79.26]}
                          radius={w.type === 'destination' ? 9 : 7}
                          pathOptions={{
                            color: w.type === 'destination' ? '#b45309' : '#15803d',
                            fillColor: w.type === 'destination' ? '#f59e0b' : '#22c55e',
                            fillOpacity: 0.9,
                          }}
                        >
                          <Popup>
                            <div className="text-xs">
                              <strong>{w.name}</strong>
                              <div>{w.location}</div>
                              {w.pickupQtyKg && <div>Pickup: {w.pickupQtyKg} kg</div>}
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </div>

                  {/* Route Stop Chain */}
                  <div className="rounded-lg bg-earth/40 p-3 text-xs dark:bg-night-lift/30 space-y-2">
                    <div className="font-bold uppercase tracking-wider text-mute text-[10px]">
                      Sequenced Pickup Route Chain:
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedPool?.contributors?.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="rounded-lg bg-white px-2.5 py-1 text-ink dark:bg-night-card dark:text-night-text font-bold shadow-sm">
                            Stop {idx + 1}: {c.farmerName || c.farmer?.name || 'Farmer'} ({c.location}) — {c.quantityKg} kg
                          </span>
                          <ArrowRight size={12} className="text-mute" />
                        </div>
                      ))}
                      <span className="rounded-lg bg-forest/15 px-2.5 py-1 text-forest font-extrabold">
                        Buyer: {selectedPool?.buyerName || 'Hyderabad Fresh Foods'} ({selectedPool?.collectedQuantityKg} kg)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Multi-Stop Spoilage & Perishability Safeguard */}
                <div className="rounded-xl border border-line bg-white p-4 shadow-sm dark:border-night-mute/20 dark:bg-night-card space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink dark:text-night-text flex items-center gap-1.5">
                      <Thermometer size={14} className="text-forest" /> Transit Spoilage & Perishability Analysis
                    </span>
                    <span className="rounded-full bg-forest/15 px-2 py-0.5 text-[10px] font-bold text-forest">
                      Spoilage Risk: {selectedPool?.consolidatedLogistics?.spoilageRisk || 'LOW'}
                    </span>
                  </div>
                  <p className="text-xs text-mute">
                    {selectedPool?.consolidatedLogistics?.spoilageAdvisory ||
                      'Multi-stop transit route is calculated with optimal vehicle capacity and dwell times to preserve produce freshness.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: DIRECT TRADE SHIPMENTS ──────────────────────────────── */}
      {activeTab === 'direct' && (
        <div className="space-y-6">
          {transactions.length === 0 ? (
            <div className="rounded-mm border border-dashed border-line bg-earth/30 p-12 text-center dark:border-night-mute/20 dark:bg-night-lift/30">
              <Truck size={36} className="mx-auto text-mute" />
              <h3 className="mt-3 text-base font-bold text-ink dark:text-night-text">{t('logistics.noAcceptedTx', 'No accepted direct transactions available')}</h3>
              <p className="mt-1 text-xs text-mute max-w-md mx-auto">
                Direct trade shipments are created when an individual farmer offer is accepted by a buyer.
              </p>
            </div>
          ) : (
            <div className="rounded-mm border border-line bg-white p-5 shadow-card dark:border-night-mute/20 dark:bg-night-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3 dark:border-night-mute/30">
                <div>
                  <h3 className="font-bold text-ink dark:text-night-text">{t('logistics.selectTx', 'Select Accepted Transaction')}</h3>
                  <p className="text-xs text-mute">Direct Producer-to-Buyer single leg transport.</p>
                </div>
                {selectedTx && (
                  <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-extrabold uppercase text-forest dark:bg-harvest/15 dark:text-harvest">
                    Status: {selectedTx.status?.replace('_', ' ')}
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

                <div>
                  <label className="block text-xs font-bold uppercase text-mute mb-1">Vehicle Type</label>
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

              {selectedTx && (
                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="rounded-lg border border-line/70 bg-earth/40 p-4 dark:border-night-mute/30 dark:bg-night-lift/30">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-forest dark:text-harvest">
                      Producer Pickup
                    </div>
                    <div className="mt-2 font-bold text-ink dark:text-night-text">
                      {selectedTx.commodityName} — {selectedTx.quantityKg} kg — {selectedTx.farmer?.location || 'Nalgonda'}
                    </div>
                  </div>

                  <div className="rounded-lg border border-line/70 bg-earth/40 p-4 dark:border-night-mute/30 dark:bg-night-lift/30">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-harvest">
                      Buyer Destination
                    </div>
                    <div className="mt-2 font-bold text-ink dark:text-night-text">
                      {selectedTx.buyer?.name || 'Buyer'} — {selectedTx.buyer?.location || 'Hyderabad'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {activeModalPoolId && (
        <SupplyPoolDetailModal
          poolId={activeModalPoolId}
          currentUser={user}
          onClose={() => setActiveModalPoolId(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}
