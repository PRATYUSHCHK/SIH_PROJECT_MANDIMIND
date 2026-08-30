import { Commodity, Market, MarketPrice, MarketArrival, Inventory, WeatherRecord, Simulation } from '../models/index.js';
import { mlClient } from '../services/mlClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dataBadge } from '../services/dataStatus.js';

export const markets = asyncHandler(async (req, res) => {
  const list = await Market.find();
  res.json({ dataStatus: 'SIMULATED', badge: dataBadge(), markets: list });
});

export const commodities = asyncHandler(async (req, res) => {
  const list = await Commodity.find();
  res.json({ dataStatus: 'SIMULATED', commodities: list });
});

export const marketCompare = asyncHandler(async (req, res) => {
  const slug = req.query.commodity || 'tomato';
  const commodity = await Commodity.findOne({ slug });
  const markets = await Market.find();
  const rows = [];
  const batchQtyKg = 500;

  for (const market of markets) {
    const price = await MarketPrice.findOne({ market: market._id, commodity: commodity._id }).sort({ date: -1 });
    const arrival = await MarketArrival.findOne({ market: market._id, commodity: commodity._id }).sort({ date: -1 });
    const distanceKm = Math.round(20 + Math.abs(market.lat - 17.366) * 110);
    const transport = Number((distanceKm * 0.08).toFixed(2));
    const purchase = Number((price.modalPriceInr * 0.82).toFixed(2));
    const sell = price.modalPriceInr;
    const handlingFee = 0.40; // loading/unloading
    const commissionFee = 0.50; // mandi fee
    const spoilageLossPerKg = Number((sell * 0.02).toFixed(2)); // estimated transport decay loss

    const netProfitPerKg = Number((sell - purchase - transport - handlingFee - commissionFee - spoilageLossPerKg).toFixed(2));
    const totalExpectedProfit = Math.round(netProfitPerKg * batchQtyKg);

    const supplyRisk = arrival.quantityKg > 1400 ? 'HIGH' : arrival.quantityKg > 1000 ? 'MODERATE' : 'LOW';
    const aiScore = Number((netProfitPerKg * 8 - (supplyRisk === 'HIGH' ? 18 : supplyRisk === 'MODERATE' ? 8 : 0) + market.qualityScore * 10).toFixed(1));

    rows.push({
      market: market.name,
      slug: market.slug,
      city: market.city,
      purchasePriceInr: purchase,
      transportInr: transport,
      handlingInr: handlingFee,
      commissionInr: commissionFee,
      spoilageLossInr: spoilageLossPerKg,
      distanceKm,
      quality: market.qualityScore,
      expectedSellingPriceInr: sell,
      expectedProfitInrPerKg: netProfitPerKg,
      totalExpectedProfitInr: totalExpectedProfit,
      risk: supplyRisk,
      aiScore,
      recommended: false,
    });
  }

  rows.sort((a, b) => b.aiScore - a.aiScore);
  if (rows[0]) rows[0].recommended = true;

  const top = rows[0];
  const recommendedMarket = top
    ? {
        name: top.market,
        city: top.city,
        expectedSellingPriceInr: top.expectedSellingPriceInr,
        transportInr: top.transportInr,
        expectedProfitInrPerKg: top.expectedProfitInrPerKg,
        totalExpectedProfitInr: top.totalExpectedProfitInr,
        risk: top.risk,
        confidence: 0.84,
        reason: `Although another market has a slightly higher gross selling price, ${top.market} provides the best expected net profit (₹${top.expectedProfitInrPerKg}/kg, total ₹${top.totalExpectedProfitInr.toLocaleString('en-IN')}) after accounting for transportation (₹${top.transportInr}/kg), handling, mandi charges, and supply risk.`,
      }
    : null;

  res.json({
    dataStatus: 'SIMULATED',
    badge: dataBadge(),
    commodity: commodity.name,
    why: top
      ? `${top.market} has the best risk-adjusted outcome: ₹${top.expectedProfitInrPerKg}/kg expected net profit after transport and fees, ${top.risk.toLowerCase()} supply risk, and quality score ${(top.quality * 100).toFixed(0)}%.`
      : '',
    recommendedMarket,
    rows,
  });
});

export const mapData = asyncHandler(async (req, res) => {
  const slug = req.query.commodity || 'tomato';
  const commodity = await Commodity.findOne({ slug });
  const markets = await Market.find();
  const points = [];
  for (const market of markets) {
    const price = await MarketPrice.findOne({ market: market._id, commodity: commodity._id }).sort({ date: -1 });
    const arrival = await MarketArrival.findOne({ market: market._id, commodity: commodity._id }).sort({ date: -1 });
    const weather = await WeatherRecord.findOne({ market: market._id }).sort({ date: -1 });
    const distanceKm = Math.round(20 + Math.abs(market.lat - 17.366) * 110);
    const transport = Number((distanceKm * 0.08).toFixed(2));
    const purchase = Number((price.modalPriceInr * 0.82).toFixed(2));
    const netProfitPerKg = Number((price.modalPriceInr - purchase - transport - 0.90).toFixed(2));

    const demand = Math.round((price.modalPriceInr / commodity.typicalPriceInr) * 520);
    const shortageProb = Math.max(0, Number((0.35 - arrival.quantityKg / 4000).toFixed(2)));
    const oversupplyProb = Math.max(0, Number((arrival.quantityKg / 2800 - 0.2).toFixed(2)));
    points.push({
      ...market.toObject(),
      currentPriceInr: price.modalPriceInr,
      predictedPriceInr: Number((price.modalPriceInr * 1.06).toFixed(2)),
      transportInr: transport,
      netProfitInrPerKg: netProfitPerKg,
      totalProfitInr: Math.round(netProfitPerKg * 500),
      arrivalsKg: arrival.quantityKg,
      demandKg: demand,
      predictedDemandKg: Math.round(demand * 1.08),
      shortageProb,
      oversupplyProb,
      weather,
      recommendation: oversupplyProb > 0.45 ? 'Reduce procurement' : shortageProb > 0.35 ? 'Increase procurement' : 'Hold balanced stock',
      trend: price.modalPriceInr > commodity.typicalPriceInr ? 'up' : 'down',
    });
  }
  res.json({ dataStatus: 'SIMULATED', badge: dataBadge(), commodity: commodity.name, points });
});

export const inventory = asyncHandler(async (req, res) => {
  const items = await Inventory.find({ seller: req.user._id }).populate('commodity');

  const decisions = items.map((i) => {
    const qty = i.quantityKg;
    const currentPrice = i.unitCostInr ? Number((i.unitCostInr * 1.2).toFixed(2)) : 28;
    const sellNowRevenue = Math.round(qty * currentPrice);

    const storeDays = i.commodity.perishability === 'high' ? 2 : 5;
    const storageCostPerKgPerDay = 0.30;
    const totalStorageCost = Math.round(qty * storageCostPerKgPerDay * storeDays);

    const spoilagePct = i.commodity.perishability === 'high' ? 0.04 * storeDays : 0.015 * storeDays;
    const spoilageLossKg = Math.round(qty * spoilagePct);
    const remainingQty = qty - spoilageLossKg;

    const priceIncreaseMultiplier = i.commodity.perishability === 'high' ? 1.04 : 1.08;
    const expectedFuturePrice = Number((currentPrice * priceIncreaseMultiplier).toFixed(2));
    const storeGrossRevenue = Math.round(remainingQty * expectedFuturePrice);
    const storeNetRevenue = storeGrossRevenue - totalStorageCost;

    const profitDiff = storeNetRevenue - sellNowRevenue;

    let decision = 'HOLD';
    let decisionBadgeClass = 'HOLD';
    let reason = '';

    if (profitDiff > 250 && i.commodity.perishability !== 'high') {
      decision = `STORE FOR ${storeDays} DAYS`;
      decisionBadgeClass = 'STORE';
      reason = `Expected future price of ₹${expectedFuturePrice}/kg generates ₹${profitDiff.toLocaleString('en-IN')} net gain after accounting for ₹${totalStorageCost} storage cost and ${Math.round(spoilagePct * 100)}% spoilage risk.`;
    } else if (i.commodity.perishability === 'high' || i.ageDays >= 2 || profitDiff <= 0) {
      decision = 'SELL NOW';
      decisionBadgeClass = 'SELL';
      reason = `Expected price increase (₹${(expectedFuturePrice - currentPrice).toFixed(1)}/kg) does not compensate for ₹${totalStorageCost} storage fee and ${Math.round(spoilagePct * 100)}% spoilage risk (${spoilageLossKg} kg loss).`;
    } else {
      decision = 'HOLD';
      decisionBadgeClass = 'HOLD';
      reason = `Inventory is within healthy threshold (${i.ageDays} days old). Market conditions support steady holding.`;
    }

    return {
      commodity: i.commodity.name,
      slug: i.commodity.slug,
      quantityKg: qty,
      ageDays: i.ageDays,
      currentValueInr: sellNowRevenue,
      spoilageRisk: i.commodity.perishability === 'high' && i.ageDays >= 2 ? 'HIGH' : i.commodity.perishability === 'high' ? 'MODERATE' : 'LOW',
      currentPriceInr: currentPrice,
      expectedFuturePriceInr: expectedFuturePrice,
      storeDays,
      storageCostInr: totalStorageCost,
      spoilageLossKg,
      sellNowRevenueInr: sellNowRevenue,
      storeNetRevenueInr: storeNetRevenue,
      profitDiffInr: profitDiff,
      decision,
      decisionBadgeClass,
      reason,
    };
  });

  const actions = decisions.map((d) => ({
    slug: d.slug,
    action: d.decision,
    detail: d.reason,
    expectedRecoveryInr: d.sellNowRevenueInr,
    lossAvoidedInr: Math.max(0, d.profitDiffInr),
  }));

  res.json({ dataStatus: 'SIMULATED', items, decisions, actions });
});

export const elasticity = asyncHandler(async (req, res) => {
  try {
    const data = await mlClient.elasticity({ commodity: req.query.commodity || 'tomato' });
    res.json({ dataStatus: 'AI_FORECAST', ...data });
  } catch {
    const curve = [20, 25, 30, 35, 40].map((p, i) => ({ price: p, demandKg: [650, 560, 470, 350, 230][i] }));
    res.json({ dataStatus: 'SIMULATED', usingSimulatedFallback: true, curve, elasticity: -1.15 });
  }
});

export const simulate = asyncHandler(async (req, res) => {
  try {
    const data = await mlClient.simulate(req.body);
    await Simulation.create({
      user: req.user._id,
      commodity: req.body.commodity || 'tomato',
      inputs: req.body,
      baseline: data.baseline,
      simulated: data.simulated,
      dataStatus: 'SIMULATED',
    });
    res.json({ dataStatus: 'SIMULATED', ...data });
  } catch (err) {
    res.status(503).json({
      error: 'Simulator ML service unavailable',
      code: 'ML_UNAVAILABLE',
      hint: 'Start the FastAPI service on port 8000. This is not a fake result.',
    });
  }
});

export const farmerRank = asyncHandler(async (req, res) => {
  try {
    const data = await mlClient.farmerRank(req.body);
    res.json({ dataStatus: 'AI_FORECAST', disclaimer: 'Estimated return only — not guaranteed profit.', ...data });
  } catch {
    res.status(503).json({ error: 'Farmer ranking requires the ML service.', code: 'ML_UNAVAILABLE' });
  }
});

export const anomalies = asyncHandler(async (req, res) => {
  const slug = req.query.commodity || 'tomato';
  const commodity = await Commodity.findOne({ slug });
  const market = await Market.findOne({ slug: req.query.market || 'kothapet' });
  const prices = await MarketPrice.find({ commodity: commodity._id, market: market._id }).sort({ date: 1 });
  try {
    const data = await mlClient.anomalies({ series: prices.map((p) => p.modalPriceInr), dates: prices.map((p) => p.date) });
    res.json({ dataStatus: 'AI_FORECAST', ...data });
  } catch {
    res.json({ dataStatus: 'SIMULATED', usingSimulatedFallback: true, points: [] });
  }
});
