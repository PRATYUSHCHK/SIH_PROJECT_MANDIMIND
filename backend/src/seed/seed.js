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
} from '../models/index.js';

const COMMODITIES = [
  { slug: 'tomato', name: 'Tomato', perishability: 'high', shelfLifeDays: 5, typicalPriceInr: 28, waterNeed: 'high', seasonality: ['kharif', 'rabi'] },
  { slug: 'onion', name: 'Onion', perishability: 'medium', shelfLifeDays: 21, typicalPriceInr: 26, waterNeed: 'medium', seasonality: ['rabi'] },
  { slug: 'potato', name: 'Potato', perishability: 'low', shelfLifeDays: 40, typicalPriceInr: 22, waterNeed: 'medium', seasonality: ['rabi'] },
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
  ]);

  const passwordHash = await bcrypt.hash('demo1234', 10);
  const [seller, farmer, admin] = await User.create([
    { name: 'Ananya Rao', email: 'seller@mandimind.demo', passwordHash, role: 'seller', location: 'Hyderabad', avatarInitials: 'AR' },
    { name: 'Ravi Reddy', email: 'farmer@mandimind.demo', passwordHash, role: 'farmer', location: 'Nalgonda', avatarInitials: 'RR' },
    { name: 'Meera Iyer', email: 'admin@mandimind.demo', passwordHash, role: 'admin', location: 'Hyderabad', avatarInitials: 'MI' },
  ]);

  await FarmerProfile.create({
    user: farmer._id,
    location: 'Nalgonda',
    landSizeAcres: 3.5,
    soilType: 'red loam',
    irrigation: 'drip',
    budgetInr: 90000,
    season: 'kharif',
    preferredCrops: ['tomato', 'chilli', 'onion'],
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
    { seller: seller._id, commodity: bySlug.tomato._id, quantityKg: 180, ageDays: 2, unitCostInr: 24, dataStatus: 'SIMULATED' },
    { seller: seller._id, commodity: bySlug.onion._id, quantityKg: 620, ageDays: 8, unitCostInr: 21, dataStatus: 'SIMULATED' },
    { seller: seller._id, commodity: bySlug.potato._id, quantityKg: 910, ageDays: 12, unitCostInr: 18, dataStatus: 'SIMULATED' },
    { seller: seller._id, commodity: bySlug.chilli._id, quantityKg: 140, ageDays: 4, unitCostInr: 46, dataStatus: 'SIMULATED' },
    { seller: seller._id, commodity: bySlug.spinach._id, quantityKg: 55, ageDays: 1, unitCostInr: 15, dataStatus: 'SIMULATED' },
  ]);

  await Alert.create([
    { role: 'seller', severity: 'moderate', title: 'Tomato oversupply risk increased 18%', body: 'Arrivals at Kothapet and Gaddiannaram are trending above the 14-day median.', commodity: 'tomato', dataStatus: 'SIMULATED' },
    { role: 'seller', severity: 'info', title: 'Onion demand expected to increase tomorrow', body: 'Day-of-week and festival adjacency lift expected demand in Hyderabad.', commodity: 'onion', dataStatus: 'AI_FORECAST' },
    { role: 'seller', severity: 'high', title: 'Spinach spoilage risk is high', body: 'Leafy stock is 1 day old with humidity above 70%. Prioritise sale today.', commodity: 'spinach', dataStatus: 'SIMULATED' },
    { role: 'farmer', severity: 'info', title: 'Tomato demand is strong this week', body: 'Nearby mandis show firm prices and below-average arrivals.', commodity: 'tomato', dataStatus: 'AI_FORECAST' },
    { role: 'admin', severity: 'moderate', title: 'Price anomaly in chilli at Vashi', body: 'Modal price moved more than 2.5σ versus the trailing 21-day mean.', commodity: 'chilli', dataStatus: 'SIMULATED' },
  ]);

  await ModelPerformance.create([
    { modelName: 'demand_xgb', metric: 'MAE', baselineValue: 62.4, mandimindValue: 41.1, notes: 'Naive baseline: tomorrow = today. Held-out last 14 days of demo series.', dataStatus: 'HISTORICAL' },
    { modelName: 'demand_xgb', metric: 'RMSE', baselineValue: 81.2, mandimindValue: 54.8, notes: 'Demo series only — not a live production claim.', dataStatus: 'HISTORICAL' },
    { modelName: 'price_xgb', metric: 'MAE', baselineValue: 2.85, mandimindValue: 1.94, notes: 'INR/kg. Naive baseline vs gradient boosting.', dataStatus: 'HISTORICAL' },
    { modelName: 'price_xgb', metric: 'MAPE', baselineValue: 9.6, mandimindValue: 6.4, notes: 'Percent. Demo evaluation split.', dataStatus: 'HISTORICAL' },
    { modelName: 'supply_xgb', metric: 'MAE', baselineValue: 118, mandimindValue: 79, notes: 'kg arrivals. Seasonal naive vs boosting.', dataStatus: 'HISTORICAL' },
  ]);

  // ─── Marketplace seed data ──────────────────────────────────────

  // Additional farmers for multi-farmer aggregation testing
  const [farmer2] = await User.create([
    { name: 'Suresh Patel', email: 'farmer2@mandimind.demo', passwordHash, role: 'farmer', location: 'Suryapet', avatarInitials: 'SP' },
  ]);

  // Direct buyers: Retailer, Organic Kitchen/Restaurant, Food Processing Enterprise, and Distant Wholesaler
  const [buyer1, buyer2, buyer3, buyer4] = await User.create([
    { name: 'Hyderabad Fresh Supermarkets', email: 'buyer@mandimind.demo', passwordHash, role: 'buyer', location: 'Hyderabad', avatarInitials: 'HF' },
    { name: 'Delhi National Produce Corp', email: 'buyer2@mandimind.demo', passwordHash, role: 'buyer', location: 'Delhi', avatarInitials: 'DN' },
    { name: 'Deccan Agro Processors & Sauces', email: 'processor@mandimind.demo', passwordHash, role: 'buyer', location: 'Hyderabad', avatarInitials: 'DA' },
    { name: 'Green Leaf Farm-to-Table Kitchen', email: 'restaurant@mandimind.demo', passwordHash, role: 'buyer', location: 'Secunderabad', avatarInitials: 'GL' },
  ]);

  // Farmer produce listings
  const listing1 = await ProduceListing.create({
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

  const listing2 = await ProduceListing.create({
    farmer: farmer._id,
    commodity: bySlug.onion._id,
    commodityName: 'Onion',
    quantityKg: 350,
    unit: 'kg',
    qualityGrade: 'A',
    harvestDate: new Date(today.getTime() - 2 * 86400000),
    expectedPriceInr: 26,
    minimumPriceInr: 23,
    location: 'Nalgonda',
    lat: 17.0575,
    lng: 79.2671,
    availableFrom: today,
    deliveryPreference: 'both',
    tradePreference: 'pool',
    packagingType: 'gunny_bag',
    availableQuantityKg: 350,
    dataStatus: 'SIMULATED',
  });

  const listing2_suresh = await ProduceListing.create({
    farmer: farmer2._id,
    commodity: bySlug.onion._id,
    commodityName: 'Onion',
    quantityKg: 450,
    unit: 'kg',
    qualityGrade: 'A',
    harvestDate: new Date(today.getTime() - 1 * 86400000),
    expectedPriceInr: 25.5,
    minimumPriceInr: 23,
    location: 'Suryapet',
    lat: 17.1439,
    lng: 79.6239,
    availableFrom: today,
    deliveryPreference: 'both',
    tradePreference: 'pool',
    packagingType: 'gunny_bag',
    availableQuantityKg: 450,
    dataStatus: 'SIMULATED',
  });

  const listing3 = await ProduceListing.create({
    farmer: farmer._id,
    commodity: bySlug.chilli._id,
    commodityName: 'Chilli',
    quantityKg: 200,
    unit: 'kg',
    qualityGrade: 'B',
    harvestDate: new Date(today.getTime() - 3 * 86400000),
    expectedPriceInr: 55,
    minimumPriceInr: 48,
    location: 'Nalgonda',
    lat: 17.0575,
    lng: 79.2671,
    availableFrom: today,
    deliveryPreference: 'both',
    packagingType: 'ventilated_box',
    availableQuantityKg: 200,
    dataStatus: 'SIMULATED',
  });

  const listing4_spinach = await ProduceListing.create({
    farmer: farmer._id,
    commodity: bySlug.spinach._id,
    commodityName: 'Spinach',
    quantityKg: 150,
    unit: 'kg',
    qualityGrade: 'A',
    harvestDate: new Date(),
    expectedPriceInr: 20,
    minimumPriceInr: 17,
    location: 'Nalgonda',
    lat: 17.0575,
    lng: 79.2671,
    availableFrom: today,
    deliveryPreference: 'both',
    packagingType: 'refrigerated_box',
    availableQuantityKg: 150,
    dataStatus: 'SIMULATED',
  });

  // Buyer requirements
  // 1. Local Tomato requirement (Hyderabad - 95km)
  const req1_local_tomato = await BuyerRequirement.create({
    buyer: buyer1._id,
    commodity: bySlug.tomato._id,
    commodityName: 'Tomato',
    quantityKg: 500,
    qualityGrade: 'A',
    maximumPriceInr: 30,
    deliveryLocation: 'Hyderabad',
    deliveryLat: 17.385,
    deliveryLng: 78.4867,
    buyerType: 'retailer',
    requiredByDate: new Date(today.getTime() + 2 * 86400000),
    dataStatus: 'SIMULATED',
  });

  // 2. Distant Tomato requirement with artificially high price (Delhi - 1500km)
  const req2_distant_tomato = await BuyerRequirement.create({
    buyer: buyer2._id,
    commodity: bySlug.tomato._id,
    commodityName: 'Tomato',
    quantityKg: 1000,
    qualityGrade: 'A',
    maximumPriceInr: 36, // Higher gross price, but high transport & spoilage
    deliveryLocation: 'Delhi',
    deliveryLat: 28.6139,
    deliveryLng: 77.209,
    buyerType: 'wholesaler',
    requiredByDate: new Date(today.getTime() + 4 * 86400000),
    dataStatus: 'SIMULATED',
  });

  // 3. Bulk Onion requirement (1000kg) allowing Supply Pooling
  const req3_bulk_onion = await BuyerRequirement.create({
    buyer: buyer3._id,
    commodity: bySlug.onion._id,
    commodityName: 'Onion',
    quantityKg: 1000,
    qualityGrade: 'Any',
    maximumPriceInr: 28,
    deliveryLocation: 'Hyderabad',
    deliveryLat: 17.385,
    deliveryLng: 78.4867,
    buyerType: 'processor',
    allowPoolAggregation: true,
    requiredByDate: new Date(today.getTime() + 3 * 86400000),
    dataStatus: 'SIMULATED',
  });

  // Pre-seed a Supply Pool for the bulk Onion requirement
  const pool1 = await SupplyPool.create({
    buyerRequirement: req3_bulk_onion._id,
    commodity: bySlug.onion._id,
    commodityName: 'Onion',
    qualityGrade: 'Any',
    targetQuantityKg: 1000,
    collectedQuantityKg: 800,
    targetPriceInr: 28,
    averageFarmerPriceInr: 25.75,
    destinationLocation: 'Hyderabad',
    destinationLat: 17.385,
    destinationLng: 78.4867,
    status: 'open',
    contributors: [
      {
        farmer: farmer._id,
        listing: listing2._id,
        quantityKg: 350,
        offeredPriceInr: 26,
        qualityGrade: 'A',
        location: 'Nalgonda',
        lat: 17.0575,
        lng: 79.2671,
        status: 'committed',
      },
      {
        farmer: farmer2._id,
        listing: listing2_suresh._id,
        quantityKg: 450,
        offeredPriceInr: 25.5,
        qualityGrade: 'A',
        location: 'Suryapet',
        lat: 17.1439,
        lng: 79.6239,
        status: 'committed',
      },
    ],
    consolidatedLogistics: {
      totalDistanceKm: 110,
      estimatedTravelTimeMin: 145,
      totalTransportCostInr: 1750,
      transportCostPerKg: 2.18,
      vehicleType: 'standard',
      spoilageRisk: 'LOW',
      routeWaypoints: [
        { farmerName: 'Ravi Reddy', location: 'Nalgonda', lat: 17.0575, lng: 79.2671, pickupQtyKg: 350, sequence: 1 },
        { farmerName: 'Suresh Patel', location: 'Suryapet', lat: 17.1439, lng: 79.6239, pickupQtyKg: 450, sequence: 2 },
      ],
    },
    intermediaryReduction: {
      commercialLayersCount: 0,
      serviceProviders: ['Direct Transport Logistics', 'FPO Quality Cell'],
      estimatedSavingsPct: 22.4,
    },
    notes: 'Aggregated FPO collection route across Nalgonda-Suryapet belt for Deccan Agro Processors.',
    dataStatus: 'SIMULATED',
  });

  console.log('[mandimind] seed complete — SIMULATED DEMO DATA WITH TRADE VIABILITY & SUPPLY POOLS');
}

if (process.argv[1]?.includes('seed.js')) {
  await mongoose.connect(config.mongoUri);
  await seed({ force: true });
  await mongoose.disconnect();
  process.exit(0);
}
