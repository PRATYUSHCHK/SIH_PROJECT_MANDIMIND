import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import {
  User,
  FarmerProfile,
  SellerProfile,
  Commodity,
  Market,
  MarketPrice,
  MarketArrival,
  WeatherRecord,
  Inventory,
  Sale,
  Purchase,
  Alert,
  ModelPerformance,
  ProduceListing,
  BuyerRequirement,
  Transaction,
  Offer,
  MarketplaceMatch,
  SupplyPool,
  Shipment,
} from '../models/index.js';
import { calculateMultiStopLogisticsPlan } from '../services/tradeViabilityService.js';

const COMMODITIES = [
  { slug: 'tomato', name: 'Tomato', perishability: 'high', shelfLifeDays: 5, typicalPriceInr: 28, waterNeed: 'high', seasonality: ['kharif', 'rabi'] },
  { slug: 'onion', name: 'Onion', perishability: 'medium', shelfLifeDays: 21, typicalPriceInr: 26, waterNeed: 'medium', seasonality: ['rabi'] },
  { slug: 'potato', name: 'Potato', perishability: 'low', shelfLifeDays: 40, typicalPriceInr: 30, waterNeed: 'medium', seasonality: ['rabi'] },
  { slug: 'chilli', name: 'Chilli', perishability: 'medium', shelfLifeDays: 10, typicalPriceInr: 55, waterNeed: 'medium', seasonality: ['kharif'] },
  { slug: 'spinach', name: 'Spinach', perishability: 'high', shelfLifeDays: 3, typicalPriceInr: 18, waterNeed: 'high', seasonality: ['rabi', 'kharif'] },
];

const MARKETS = [
  { slug: 'kothapet', name: 'Kothapet Fruit Market', city: 'Hyderabad', state: 'Telangana', lat: 17.366, lng: 78.548, qualityScore: 0.86 },
  { slug: 'gaddiannaram', name: 'Gaddiannaram Vegetable Market', city: 'Hyderabad', state: 'Telangana', lat: 17.3708, lng: 78.5247, qualityScore: 0.81 },
  { slug: 'azadpur', name: 'Azadpur Mandi', city: 'Delhi', state: 'Delhi', lat: 28.712, lng: 77.173, qualityScore: 0.9 },
  { slug: 'vashi', name: 'APMC Vashi', city: 'Navi Mumbai', state: 'Maharashtra', lat: 19.077, lng: 73.011, qualityScore: 0.84 },
  { slug: 'koyambedu', name: 'Koyambedu Market', city: 'Chennai', state: 'Tamil Nadu', lat: 13.069, lng: 80.195, qualityScore: 0.83 },
  { slug: 'kr-market', name: 'KR Market', city: 'Bengaluru', state: 'Karnataka', lat: 12.965, lng: 77.577, qualityScore: 0.8 },
];

function seeded(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export async function seed({ force = false } = {}) {
  const existing = await User.countDocuments();
  if (existing && !force) {
    console.log('[mandimind] seed skipped (data exists)');
    return;
  }

  await Promise.all([
    User.deleteMany({}),
    FarmerProfile.deleteMany({}),
    SellerProfile.deleteMany({}),
    Commodity.deleteMany({}),
    Market.deleteMany({}),
    MarketPrice.deleteMany({}),
    MarketArrival.deleteMany({}),
    WeatherRecord.deleteMany({}),
    Inventory.deleteMany({}),
    Sale.deleteMany({}),
    Purchase.deleteMany({}),
    Alert.deleteMany({}),
    ModelPerformance.deleteMany({}),
    ProduceListing.deleteMany({}),
    BuyerRequirement.deleteMany({}),
    Transaction.deleteMany({}),
    Offer.deleteMany({}),
    MarketplaceMatch.deleteMany({}),
    SupplyPool.deleteMany({}),
    Shipment.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('demo1234', 10);
  const [seller, farmer, admin] = await User.create([
    { name: 'Ananya Rao', email: 'seller@mandimind.demo', passwordHash, role: 'seller', location: 'Hyderabad', avatarInitials: 'AR' },
    { name: 'Ravi Reddy', email: 'farmer@mandimind.demo', passwordHash, role: 'farmer', location: 'Nalgonda', avatarInitials: 'RR' },
    { name: 'Meera Iyer', email: 'admin@mandimind.demo', passwordHash, role: 'admin', location: 'Hyderabad', avatarInitials: 'MI' },
  ]);

  // Additional farmers
  const [farmer2_suresh, farmer3_dhanush] = await User.create([
    { name: 'Suresh Patel', email: 'farmer2@mandimind.demo', passwordHash, role: 'farmer', location: 'Suryapet', avatarInitials: 'SP' },
    { name: 'dhanush', email: 'dhanush@mandimind.demo', passwordHash, role: 'farmer', location: 'Telangana', avatarInitials: 'DH' },
  ]);

  // Direct buyers
  const [buyer1, buyer2, buyer3, buyer4] = await User.create([
    { name: 'Hyderabad Fresh Foods', email: 'buyer@mandimind.demo', passwordHash, role: 'buyer', location: 'Hyderabad', avatarInitials: 'HF' },
    { name: 'Delhi National Produce Corp', email: 'buyer2@mandimind.demo', passwordHash, role: 'buyer', location: 'Delhi', avatarInitials: 'DN' },
    { name: 'Deccan Agro Processors & Sauces', email: 'processor@mandimind.demo', passwordHash, role: 'buyer', location: 'Hyderabad', avatarInitials: 'DA' },
    { name: 'Green Leaf Farm-to-Table Kitchen', email: 'restaurant@mandimind.demo', passwordHash, role: 'buyer', location: 'Secunderabad', avatarInitials: 'GL' },
  ]);

  await FarmerProfile.create({
    user: farmer._id,
    location: 'Nalgonda',
    landSizeAcres: 3.5,
    soilType: 'red loam',
    irrigation: 'drip',
    budgetInr: 90000,
    season: 'kharif',
    preferredCrops: ['potato', 'tomato', 'onion'],
  });

  await SellerProfile.create({
    user: seller._id,
    businessName: 'Rao Fresh Trading',
    homeMarket: 'Kothapet, Hyderabad',
    budgetInr: 50000,
    storageCapacityKg: 4000,
    products: COMMODITIES.map((c) => c.slug),
  });

  const commodities = await Commodity.create(COMMODITIES.map((c) => ({ ...c, dataStatus: 'SIMULATED' })));
  const markets = await Market.create(MARKETS.map((m) => ({ ...m, dataStatus: 'SIMULATED' })));
  const bySlug = Object.fromEntries(commodities.map((c) => [c.slug, c]));
  const days = 90;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const prices = [];
  const arrivals = [];
  const weather = [];
  const sales = [];
  const purchases = [];

  markets.forEach((market, mi) => {
    for (let d = 0; d < days; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - d));
      const rain = Math.round(seeded(mi * 100 + d) * 18 * (d % 11 === 0 ? 4 : 1) * 10) / 10;
      weather.push({
        market: market._id,
        date,
        temperatureC: Number((28 + Math.sin(d / 9) * 4 + seeded(mi + d) * 2).toFixed(1)),
        rainfallMm: rain,
        humidityPct: Number((55 + rain * 1.4 + seeded(d) * 10).toFixed(1)),
        dataStatus: 'SIMULATED',
      });
      commodities.forEach((commodity, ci) => {
        const base = commodity.typicalPriceInr * (1 + (mi - 2) * 0.03);
        const seasonal = 1 + 0.12 * Math.sin((d / 30) * Math.PI);
        const noise = (seeded(mi * 17 + ci * 9 + d) - 0.5) * 0.16;
        const modal = Number((base * seasonal * (1 + noise)).toFixed(2));
        prices.push({
          market: market._id,
          commodity: commodity._id,
          date,
          modalPriceInr: modal,
          minPriceInr: Number((modal * 0.9).toFixed(2)),
          maxPriceInr: Number((modal * 1.12).toFixed(2)),
          dataStatus: 'SIMULATED',
        });
        const qty = Math.round(800 + 400 * Math.sin(d / 7 + ci) + seeded(d + ci) * 350 + (rain > 20 ? 180 : 0));
        arrivals.push({
          market: market._id,
          commodity: commodity._id,
          date,
          quantityKg: Math.max(120, qty),
          dataStatus: 'SIMULATED',
        });
        if (market.slug === 'kothapet') {
          const sold = Math.round(180 + 80 * Math.sin(d / 6 + ci) + seeded(ci + d) * 90);
          sales.push({
            seller: seller._id,
            commodity: commodity._id,
            market: market._id,
            date,
            quantityKg: sold,
            priceInr: modal,
            dataStatus: 'SIMULATED',
          });
          if (d % 3 === 0) {
            purchases.push({
              seller: seller._id,
              commodity: commodity._id,
              market: market._id,
              date,
              quantityKg: Math.round(sold * 1.1),
              priceInr: Number((modal * 0.82).toFixed(2)),
              transportCostInr: 1.1,
              dataStatus: 'SIMULATED',
            });
          }
        }
      });
    }
  });

  await MarketPrice.insertMany(prices);
  await MarketArrival.insertMany(arrivals);
  await WeatherRecord.insertMany(weather);
  await Sale.insertMany(sales);
  await Purchase.insertMany(purchases);

  await Inventory.create([
    { seller: seller._id, commodity: bySlug.potato._id, quantityKg: 1000, ageDays: 4, unitCostInr: 22, dataStatus: 'SIMULATED' },
    { seller: seller._id, commodity: bySlug.tomato._id, quantityKg: 180, ageDays: 2, unitCostInr: 24, dataStatus: 'SIMULATED' },
    { seller: seller._id, commodity: bySlug.onion._id, quantityKg: 620, ageDays: 8, unitCostInr: 21, dataStatus: 'SIMULATED' },
    { seller: seller._id, commodity: bySlug.chilli._id, quantityKg: 140, ageDays: 4, unitCostInr: 46, dataStatus: 'SIMULATED' },
    { seller: seller._id, commodity: bySlug.spinach._id, quantityKg: 55, ageDays: 1, unitCostInr: 15, dataStatus: 'SIMULATED' },
  ]);

  await Alert.create([
    { role: 'seller', severity: 'moderate', title: 'Potato demand firm in Hyderabad market', body: 'Steady wholesale requirement from institutional buyers.', commodity: 'potato', dataStatus: 'SIMULATED' },
    { role: 'farmer', severity: 'info', title: 'Target Reached for 1,000 kg Potato Supply Pool', body: 'Ravi Reddy and dhanush have completed target collection for Hyderabad Fresh Foods.', commodity: 'potato', dataStatus: 'AI_FORECAST' },
    { role: 'buyer', severity: 'info', title: 'Potato Supply Pool ready for confirmation', body: '1,000 kg collected from 2 participating farmers at ₹30/kg.', commodity: 'potato', dataStatus: 'SIMULATED' },
  ]);

  await ModelPerformance.create([
    { modelName: 'demand_xgb', metric: 'MAE', baselineValue: 62.4, mandimindValue: 41.1, notes: 'Naive baseline: tomorrow = today. Held-out last 14 days of demo series.', dataStatus: 'HISTORICAL' },
    { modelName: 'price_xgb', metric: 'MAPE', baselineValue: 9.6, mandimindValue: 6.4, notes: 'Percent. Demo evaluation split.', dataStatus: 'HISTORICAL' },
  ]);

  // ─── DEMO PRODUCE LISTINGS ──────────────────────────────────────

  // Ravi Reddy: 900 kg Potato
  const listing_potato_ravi = await ProduceListing.create({
    farmer: farmer._id,
    commodity: bySlug.potato._id,
    commodityName: 'Potato',
    quantityKg: 900,
    unit: 'kg',
    qualityGrade: 'A',
    harvestDate: new Date(today.getTime() - 2 * 86400000),
    expectedPriceInr: 30,
    minimumPriceInr: 27,
    location: 'Nalgonda',
    lat: 17.0575,
    lng: 79.2671,
    availableFrom: today,
    deliveryPreference: 'both',
    tradePreference: 'pool',
    packagingType: 'gunny_bag',
    availableQuantityKg: 0,
    status: 'matched',
    dataStatus: 'SIMULATED',
  });

  // dhanush: 100 kg Potato
  const listing_potato_dhanush = await ProduceListing.create({
    farmer: farmer3_dhanush._id,
    commodity: bySlug.potato._id,
    commodityName: 'Potato',
    quantityKg: 100,
    unit: 'kg',
    qualityGrade: 'A',
    harvestDate: new Date(today.getTime() - 1 * 86400000),
    expectedPriceInr: 30,
    minimumPriceInr: 27,
    location: 'Telangana',
    lat: 17.215,
    lng: 79.125,
    availableFrom: today,
    deliveryPreference: 'both',
    tradePreference: 'pool',
    packagingType: 'gunny_bag',
    availableQuantityKg: 0,
    status: 'matched',
    dataStatus: 'SIMULATED',
  });

  // Direct Trade listings
  const listing_tomato_ravi = await ProduceListing.create({
    farmer: farmer._id,
    commodity: bySlug.tomato._id,
    commodityName: 'Tomato',
    quantityKg: 500,
    unit: 'kg',
    qualityGrade: 'A',
    harvestDate: new Date(today.getTime() - 1 * 86400000),
    expectedPriceInr: 28,
    minimumPriceInr: 25,
    location: 'Nalgonda',
    lat: 17.0575,
    lng: 79.2671,
    availableFrom: today,
    deliveryPreference: 'both',
    tradePreference: 'any',
    packagingType: 'standard_crate',
    availableQuantityKg: 500,
    dataStatus: 'SIMULATED',
  });

  // ─── BUYER REQUIREMENTS ──────────────────────────────────────

  // Main Potato Requirement for Hyderabad Fresh Foods (1,000 kg)
  const req_potato_bulk = await BuyerRequirement.create({
    buyer: buyer1._id,
    commodity: bySlug.potato._id,
    commodityName: 'Potato',
    quantityKg: 1000,
    qualityGrade: 'A',
    maximumPriceInr: 30,
    deliveryLocation: 'Hyderabad Fresh Foods',
    deliveryLat: 17.385,
    deliveryLng: 78.4867,
    buyerType: 'retailer',
    allowPoolAggregation: true,
    requiredByDate: new Date(today.getTime() + 2 * 86400000),
    dataStatus: 'SIMULATED',
  });

  // Direct Tomato Requirement
  const req_tomato_direct = await BuyerRequirement.create({
    buyer: buyer1._id,
    commodity: bySlug.tomato._id,
    commodityName: 'Tomato',
    quantityKg: 500,
    qualityGrade: 'A',
    maximumPriceInr: 30,
    deliveryLocation: 'Hyderabad Fresh Foods',
    deliveryLat: 17.385,
    deliveryLng: 78.4867,
    buyerType: 'retailer',
    requiredByDate: new Date(today.getTime() + 3 * 86400000),
    dataStatus: 'SIMULATED',
  });

  // ─── SUPPLY POOL (Potato 1,000 / 1,000 kg Collected — Target Reached) ───

  const contributors = [
    {
      farmer: farmer._id,
      farmerName: 'Ravi Reddy',
      listing: listing_potato_ravi._id,
      quantityKg: 900,
      verifiedQuantityKg: 900,
      offeredPriceInr: 30,
      agreedPriceInr: 30,
      grossAmountInr: 27000,
      qualityGrade: 'A',
      location: 'Nalgonda',
      lat: 17.0575,
      lng: 79.2671,
      pickupStatus: 'scheduled',
      settlementStatus: 'pending',
      status: 'committed',
    },
    {
      farmer: farmer3_dhanush._id,
      farmerName: 'dhanush',
      listing: listing_potato_dhanush._id,
      quantityKg: 100,
      verifiedQuantityKg: 100,
      offeredPriceInr: 30,
      agreedPriceInr: 30,
      grossAmountInr: 3000,
      qualityGrade: 'A',
      location: 'Telangana',
      lat: 17.215,
      lng: 79.125,
      pickupStatus: 'scheduled',
      settlementStatus: 'pending',
      status: 'committed',
    },
  ];

  const logPlan = calculateMultiStopLogisticsPlan({
    contributors,
    destination: {
      lat: 17.385,
      lng: 78.4867,
      location: 'Hyderabad Fresh Foods',
      buyerName: 'Hyderabad Fresh Foods',
    },
    commodityName: 'Potato',
    preferredVehicleType: 'standard',
  });

  const pool1 = await SupplyPool.create({
    poolCode: 'SP-001',
    buyerRequirement: req_potato_bulk._id,
    buyer: buyer1._id,
    buyerName: 'Hyderabad Fresh Foods',
    commodity: bySlug.potato._id,
    commodityName: 'Potato',
    qualityGrade: 'A',
    targetQuantityKg: 1000,
    collectedQuantityKg: 1000,
    targetPriceInr: 30,
    averageFarmerPriceInr: 30,
    totalPoolValueInr: 30000,
    destinationLocation: 'Hyderabad Fresh Foods',
    destinationLat: 17.385,
    destinationLng: 78.4867,
    status: 'target_reached',
    contributors,
    consolidatedLogistics: {
      totalDistanceKm: logPlan.distanceKm,
      estimatedTravelTimeMin: logPlan.estimatedTravelTimeMin,
      totalTransportCostInr: logPlan.totalTransportCostInr,
      transportCostPerKg: logPlan.transportCostPerKg,
      individualTransportEstimateInr: logPlan.individualTransportEstimateInr,
      consolidatedSavingsInr: logPlan.consolidatedSavingsInr,
      routeWaypoints: logPlan.routeWaypoints,
      vehicleType: logPlan.vehicle.vehicleType,
      vehicleCapacityKg: logPlan.vehicle.capacityKg,
      spoilageRisk: logPlan.spoilageRisk.riskScore,
      spoilageAdvisory: logPlan.spoilageRisk.advisoryNote,
    },
    intermediaryReduction: {
      commercialLayersCount: 0,
      serviceProviders: ['Direct Transport Carrier', 'Consolidated Cluster Pickup'],
      estimatedSavingsPct: 22.5,
    },
    timeline: [
      {
        status: 'open',
        title: 'Supply Pool Created',
        description: 'Coordinated supply pool created for Hyderabad Fresh Foods (1,000 kg Potato @ ₹30/kg).',
      },
      {
        status: 'target_reached',
        title: 'Target Reached',
        description: '1,000 kg collected (Ravi Reddy 900 kg, dhanush 100 kg). Ready for buyer confirmation.',
      },
    ],
    notes: 'Aggregated potato supply pool fulfilling Hyderabad Fresh Foods bulk procurement.',
    dataStatus: 'SIMULATED',
  });

  console.log('[mandimind] seed complete — POTATO DEMO SUPPLY POOL (TARGET REACHED: Ravi Reddy 900kg + dhanush 100kg for Hyderabad Fresh Foods)');
}

if (process.argv[1]?.includes('seed.js')) {
  await mongoose.connect(config.mongoUri);
  await seed({ force: true });
  await mongoose.disconnect();
  process.exit(0);
}
