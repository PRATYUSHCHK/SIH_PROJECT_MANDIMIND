import {
  Commodity,
  Market,
  MarketPrice,
  MarketArrival,
  WeatherRecord,
  Inventory,
  Sale,
  Alert,
  SellerProfile,
  Recommendation,
} from '../models/index.js';
import { mlClient } from '../services/mlClient.js';
import { localOptimize, buildFactors } from '../services/optimization.js';
import { dataBadge } from '../services/dataStatus.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function series(docs, key) {
  return docs.map((d) => ({ date: d.date, value: d[key] }));
}

async function commodityContext(slug, marketSlug, sellerId) {
  const commodity = await Commodity.findOne({ slug });
  const market = await Market.findOne({ slug: marketSlug });
  const prices = await MarketPrice.find({ commodity: commodity._id, market: market._id }).sort({ date: 1 }).limit(90);
  const arrivals = await MarketArrival.find({ commodity: commodity._id, market: market._id }).sort({ date: 1 }).limit(90);
  const sales = await Sale.find({ commodity: commodity._id, seller: sellerId }).sort({ date: 1 }).limit(90);
  const weather = await WeatherRecord.find({ market: market._id }).sort({ date: 1 }).limit(90);
  const inv = await Inventory.findOne({ commodity: commodity._id, seller: sellerId });
  const latestPrice = prices.at(-1);
  const latestArrival = arrivals.at(-1);
  const latestWeather = weather.at(-1);
  const demandToday = sales.at(-1)?.quantityKg ?? 220;
  return { commodity, market, prices, arrivals, sales, weather, inv, latestPrice, latestArrival, latestWeather, demandToday };
}

function analyzeWeatherImplications(weather) {
  const temp = weather?.temperatureC ?? 28;
  const rain = weather?.rainfallMm ?? 0;
  const hum = weather?.humidityPct ?? 60;
  const implications = [];
  let risk = 'LOW';
  let trend = 'Stable weather expected';

  if (rain > 15) {
    risk = 'HIGH';
    trend = 'Heavy rainfall disruption';
    implications.push('Heavy rainfall expected to cause harvesting disruptions in local fields');
    implications.push('Market arrivals may decrease by 15-25% due to transport delays');
    implications.push('Higher moisture increases spoilage and rot risk for perishable inventory');
  } else if (rain > 5) {
    risk = 'MODERATE';
    trend = 'Moderate rainfall expected';
    implications.push('Light to moderate rain may slow loading/unloading activities at the mandi');
    implications.push('Slight reduction in morning arrivals expected');
  }

  if (temp > 34) {
    if (risk !== 'HIGH') risk = 'MODERATE';
    implications.push('High ambient temperatures accelerate spoilage for leafy produce');
  }

  if (hum > 75) {
    implications.push('Elevated humidity increases fungal and storage decay risk');
  }

  if (implications.length === 0) {
    implications.push('Favorable weather conditions for field harvesting and mandi transit');
    implications.push('Normal market logistics expected without weather delays');
  }

  return {
    temperatureC: temp,
    rainfallMm: rain,
    humidityPct: hum,
    trend,
    risk,
    implications,
  };
}

function buildHumanReasons({ action, commodity, market, demand, price, supply, spoilage, weatherIntel, inv }) {
  const reasons = [];
  if (supply.oversupplyProb > 0.3) {
    reasons.push(`Market arrivals are expected to increase (${supply.expected} kg), creating downward pressure on price.`);
  } else {
    reasons.push(`Market arrivals remain balanced around ${supply.expected} kg, keeping prices stable.`);
  }

  if (price.trend === 'up') {
    reasons.push(`7-day price forecast indicates an upward trajectory toward ₹${price.upper}/kg.`);
  } else {
    reasons.push(`Price forecast shows softening demand with range ₹${price.lower}–₹${price.upper}/kg.`);
  }

  if (inv && inv.ageDays >= 2 && inv.commodity?.perishability === 'high') {
    reasons.push(`Existing ${commodity} inventory is ${inv.ageDays} days old with elevated spoilage risk (${Math.round((spoilage.probability || 0.08) * 100)}%).`);
  }

  if (weatherIntel.rainfallMm > 10) {
    reasons.push(`Recent rainfall (${weatherIntel.rainfallMm} mm) is impacting field transit and mandi arrivals.`);
  }

  return reasons;
}

export const sellerDashboard = asyncHandler(async (req, res) => {
  const slug = req.query.commodity || 'tomato';
  const marketSlug = req.query.market || 'kothapet';
  const ctx = await commodityContext(slug, marketSlug, req.user._id);
  const profile = await SellerProfile.findOne({ user: req.user._id });
  const mlUp = await mlClient.health();
  const weatherIntel = analyzeWeatherImplications(ctx.latestWeather);

  const payload = {
    commodity: ctx.commodity.slug,
    market: ctx.market.slug,
    currentPrice: ctx.latestPrice.modalPriceInr,
    currentInventoryKg: ctx.inv?.quantityKg ?? 0,
    inventoryAgeDays: ctx.inv?.ageDays ?? 1,
    budgetInr: profile?.budgetInr ?? 50000,
    storageCapacityKg: profile?.storageCapacityKg ?? 4000,
    rainfallMm: ctx.latestWeather.rainfallMm,
    temperatureC: ctx.latestWeather.temperatureC,
    humidityPct: ctx.latestWeather.humidityPct,
    historicalDemand: ctx.sales.map((s) => s.quantityKg),
    historicalPrice: ctx.prices.map((p) => p.modalPriceInr),
    historicalArrivals: ctx.arrivals.map((a) => a.quantityKg),
    dayOfWeek: new Date().getDay(),
    month: new Date().getMonth() + 1,
  };

  let demand;
  let price;
  let supply;
  let spoilage;
  let opt;
  let explain;
  let usedFallback = false;

  try {
    if (!mlUp) throw new Error('ml down');
    demand = await mlClient.forecastDemand(payload);
    price = await mlClient.forecastPrice(payload);
    supply = await mlClient.forecastSupply(payload);
    spoilage = await mlClient.spoilage({
      commodity: slug,
      quantityKg: ctx.inv?.quantityKg ?? 0,
      ageDays: ctx.inv?.ageDays ?? 1,
      temperatureC: ctx.latestWeather.temperatureC,
      humidityPct: ctx.latestWeather.humidityPct,
      estimatedDemandKg: demand.expected,
    });
    opt = await mlClient.optimize({
      ...payload,
      predictedDemandKg: demand.expected,
      demandLower: demand.lower,
      demandUpper: demand.upper,
      predictedPriceInr: price.expected,
      purchasePriceInr: ctx.inv?.unitCostInr ?? ctx.latestPrice.modalPriceInr * 0.82,
      expectedSellingPriceInr: price.expected,
      currentInventoryKg: ctx.inv?.quantityKg ?? 0,
      spoilageProb: spoilage.probability,
      oversupplyProb: supply.oversupplyProb,
    });
    explain = await mlClient.explain({ ...payload, quantityKg: opt.quantityKg });
  } catch {
    usedFallback = true;
    demand = { expected: 480, lower: 420, upper: 550, confidence: 0.84, series: [] };
    price = { expected: 32.4, lower: 29.2, upper: 35.1, confidence: 0.81, trend: 'up' };
    supply = { expected: 820, confidence: 0.78, oversupplyProb: 0.22, shortageProb: 0.11 };
    spoilage = { probability: 0.08, estimatedLossInr: 420 };
    opt = localOptimize({
      predictedDemandKg: 480,
      currentInventoryKg: ctx.inv?.quantityKg ?? 180,
      budgetInr: profile?.budgetInr ?? 50000,
      purchasePriceInr: 24,
      expectedSellingPriceInr: 32.4,
      spoilageProb: 0.08,
    });
    explain = {
      factors: buildFactors({
        demandDelta: 14,
        inventoryDelta: -18,
        priceDelta: 8,
        supplyDelta: -5,
        weatherDelta: 6,
        spoilageDelta: -3,
      }),
    };
  }

  const humanReasons = buildHumanReasons({
    action: opt.action,
    commodity: ctx.commodity.name,
    market: ctx.market.name,
    demand,
    price,
    supply,
    spoilage,
    weatherIntel,
    inv: ctx.inv,
  });

  const rec = await Recommendation.create({
    user: req.user._id,
    action: opt.action || 'BUY',
    commodity: ctx.commodity._id,
    quantityKg: opt.quantityKg,
    expectedProfitInr: opt.expectedProfitInr,
    confidence: opt.confidence,
    risk: opt.risk || 'LOW',
    factors: explain.factors,
    explanation: { ...explain, humanReasons },
    dataStatus: 'AI_FORECAST',
  });

  const inventories = await Inventory.find({ seller: req.user._id }).populate('commodity');
  const alerts = await Alert.find({ $or: [{ role: 'seller' }, { role: 'all' }] }).sort({ createdAt: -1 }).limit(8);
  const allCommodities = await Commodity.find();

  res.json({
    dataStatus: usedFallback ? 'SIMULATED' : 'AI_FORECAST',
    usingSimulatedFallback: usedFallback,
    badge: dataBadge(),
    generatedAt: new Date().toISOString(),
    sourceInfo: {
      source: 'AGMARKNET / e-NAM (Simulated Demo Data)',
      lastUpdated: new Date().toISOString(),
      status: usedFallback ? 'SIMULATED DATA' : 'AI FORECAST',
    },
    todayDecision: {
      action: opt.action || 'BUY',
      quantityKg: opt.quantityKg,
      commodity: ctx.commodity.name,
      bestMarket: ctx.market.name,
      sellingWindow: opt.action === 'HOLD_SELL' ? 'Next 24 hours' : 'Next 48 hours',
      expectedPriceRange: [price.lower, price.upper],
      expectedProfitInr: opt.expectedProfitInr,
      confidence: opt.confidence,
      risk: opt.risk || 'LOW',
      humanReasons,
    },
    recommendation: {
      id: rec._id,
      headline: `${opt.action || 'BUY'} ${opt.quantityKg} KG ${ctx.commodity.name.toUpperCase()}`,
      action: opt.action || 'BUY',
      quantityKg: opt.quantityKg,
      commodity: ctx.commodity.name,
      bestMarket: ctx.market.name,
      sellingWindow: opt.action === 'HOLD_SELL' ? 'Next 24 hours' : 'Next 48 hours',
      expectedProfitInr: opt.expectedProfitInr,
      confidence: opt.confidence,
      risk: opt.risk || 'LOW',
      factors: explain.factors,
      humanReasons,
      why: { ...explain, humanReasons },
    },
    weatherIntelligence: weatherIntel,
    metrics: {
      todayDemandKg: ctx.demandToday,
      predictedDemandKg: demand.expected,
      demandRange: [demand.lower, demand.upper],
      currentPriceInr: ctx.latestPrice.modalPriceInr,
      predictedPriceInr: price.expected,
      priceRange: [price.lower, price.upper],
      inventoryValueInr: Math.round((ctx.inv?.quantityKg ?? 0) * ctx.latestPrice.modalPriceInr),
      expectedProfitInr: opt.expectedProfitInr,
    },
    demandForecast: {
      historical: series(ctx.sales, 'quantityKg'),
      expected: demand.expected,
      lower: demand.lower,
      upper: demand.upper,
      confidence: demand.confidence,
      forecastSeries: demand.series || [],
      anomalies: demand.anomalies || [],
    },
    priceForecast: {
      historical: series(ctx.prices, 'modalPriceInr'),
      current: ctx.latestPrice.modalPriceInr,
      expected: price.expected,
      lower: price.lower,
      upper: price.upper,
      trend: price.trend || 'up',
      confidence: price.confidence,
    },
    inventoryHealth: inventories.map((i) => ({
      commodity: i.commodity.name,
      slug: i.commodity.slug,
      quantityKg: i.quantityKg,
      ageDays: i.ageDays,
      status: i.quantityKg < 80 ? 'low' : i.quantityKg > 700 ? 'overstocked' : 'healthy',
      spoilageRisk: i.commodity.perishability === 'high' && i.ageDays >= 2 ? 'high' : i.commodity.perishability === 'high' ? 'moderate' : 'low',
    })),
    supplyDemand: {
      expectedSupply: supply.expected,
      expectedDemand: demand.expected,
      imbalance: (supply.expected || 820) - (demand.expected || 480),
      class:
        (supply.expected || 820) - (demand.expected || 480) > 150
          ? 'SURPLUS'
          : (supply.expected || 820) - (demand.expected || 480) < -80
            ? 'SHORTAGE'
            : 'BALANCED',
      oversupplyProb: supply.oversupplyProb,
      shortageProb: supply.shortageProb,
    },
    alerts,
    commodities: allCommodities,
    budgetInr: profile?.budgetInr ?? 50000,
  });
});
