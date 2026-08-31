import {
  ProduceListing,
  BuyerRequirement,
  MarketplaceMatch,
  Offer,
  Transaction,
  Inventory,
  Commodity,
  Market,
  MarketPrice,
  MarketArrival,
  WeatherRecord,
  User,
} from '../models/index.js';

import { mlClient } from '../services/mlClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dataBadge } from '../services/dataStatus.js';
import { AppError } from '../middleware/error.js';

// ─── Helpers ────────────────────────────────────────────────────────────

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcTransportCost(distanceKm, quantityKg) {
  // Simulated: base ₹12/km + ₹0.80/kg handling
  const perKm = 12;
  const perKg = 0.8;
  return Number((distanceKm * perKm + quantityKg * perKg).toFixed(2));
}

function calcETA(distanceKm) {
  // Simulated: average 40 km/h in rural/urban mix
  return Math.round((distanceKm / 40) * 60);
}

async function getCommodityPriceInfo(commodityId) {
  const market = await Market.findOne({ slug: 'kothapet' });
  if (!market) return null;
  const prices = await MarketPrice.find({ commodity: commodityId, market: market._id })
    .sort({ date: 1 })
    .limit(30);
  const arrivals = await MarketArrival.find({ commodity: commodityId, market: market._id })
    .sort({ date: 1 })
    .limit(30);
  const latest = prices.at(-1);
  const prev = prices.at(-2);
  const avgPrice = prices.length ? Number((prices.reduce((s, p) => s + p.modalPriceInr, 0) / prices.length).toFixed(2)) : 0;
  const avgArrival = arrivals.length ? Math.round(arrivals.reduce((s, a) => s + a.quantityKg, 0) / arrivals.length) : 0;
  const trend = latest && prev ? (latest.modalPriceInr > prev.modalPriceInr ? 'up' : 'down') : 'stable';
  return {
    currentPrice: latest?.modalPriceInr || 0,
    avgPrice,
    trend,
    avgArrival,
    prices: prices.map((p) => p.modalPriceInr),
    arrivals: arrivals.map((a) => a.quantityKg),
  };
}

async function computeAIFairPrice(commodityId, qualityGrade, location, quantityKg) {
  const info = await getCommodityPriceInfo(commodityId);
  if (!info || !info.currentPrice) {
    return { fairPrice: 28, range: { lower: 25, upper: 32 }, confidence: 0.7 };
  }

  let multiplier = 1;
  if (qualityGrade === 'A') multiplier = 1.08;
  else if (qualityGrade === 'B') multiplier = 0.95;
  else if (qualityGrade === 'Organic') multiplier = 1.2;

  // Volume discount for large quantities
  if (quantityKg >= 500) multiplier *= 0.97;
  if (quantityKg >= 1000) multiplier *= 0.95;

  const fairPrice = Number((info.avgPrice * multiplier).toFixed(2));
  const range = {
    lower: Number((fairPrice * 0.92).toFixed(2)),
    upper: Number((fairPrice * 1.1).toFixed(2)),
  };
  const confidence = info.prices.length > 14 ? 0.87 : 0.72;

  return { fairPrice, range, confidence, marketTrend: info.trend, avgMarketPrice: info.currentPrice };
}

async function computeMatchScore(listing, requirement) {
  let score = 0;
  const reasons = [];
  const checks = {
    commodityMatch: false,
    qualityMatch: false,
    priceMatch: false,
    locationMatch: false,
    quantityMatch: false,
    demandMatch: false,
  };

  // Commodity match (required - 0 or 25 pts)
  if (listing.commodityName.toLowerCase() === requirement.commodityName.toLowerCase()) {
    score += 25;
    checks.commodityMatch = true;
    reasons.push('✓ Commodity matches');
  } else {
    return { score: 0, reasons: ['✗ Commodity does not match'], checks };
  }

  // Quality match (20 pts)
  if (requirement.qualityGrade === 'Any' || listing.qualityGrade === requirement.qualityGrade) {
    score += 20;
    checks.qualityMatch = true;
    reasons.push('✓ Quality matches');
  } else if (
    (listing.qualityGrade === 'A' && requirement.qualityGrade === 'B') ||
    (listing.qualityGrade === 'B' && requirement.qualityGrade === 'A')
  ) {
    score += 10;
    reasons.push('~ Quality partially matches');
  } else {
    reasons.push('✗ Quality mismatch');
  }

  // Price match (25 pts)
  if (listing.expectedPriceInr <= requirement.maximumPriceInr) {
    score += 25;
    checks.priceMatch = true;
    reasons.push('✓ Price is within buyer range');
  } else {
    const excess = ((listing.expectedPriceInr - requirement.maximumPriceInr) / requirement.maximumPriceInr) * 100;
    if (excess < 10) {
      score += 12;
      reasons.push('~ Price slightly above buyer max');
    } else {
      reasons.push('✗ Price exceeds buyer budget');
    }
  }

  // Location match (15 pts)
  const distance = haversineKm(listing.lat || 17.385, listing.lng || 78.487, requirement.deliveryLat || 17.385, requirement.deliveryLng || 78.487);
  if (distance < 30) {
    score += 15;
    checks.locationMatch = true;
    reasons.push('✓ Location is nearby');
  } else if (distance < 100) {
    score += 10;
    checks.locationMatch = true;
    reasons.push('✓ Location within reasonable distance');
  } else if (distance < 250) {
    score += 5;
    reasons.push('~ Moderate distance');
  } else {
    reasons.push('✗ Far from delivery location');
  }

  // Quantity match (10 pts)
  const listingAvailable = listing.availableQuantityKg || listing.quantityKg;
  if (listingAvailable >= requirement.quantityKg) {
    score += 10;
    checks.quantityMatch = true;
    reasons.push('✓ Quantity can fully fulfill requirement');
  } else if (listingAvailable >= requirement.quantityKg * 0.5) {
    score += 5;
    reasons.push('~ Partial quantity available');
  } else {
    reasons.push('✗ Insufficient quantity');
  }

  // Demand trend bonus (5 pts)
  try {
    const info = await getCommodityPriceInfo(listing.commodity);
    if (info && info.trend === 'up') {
      score += 5;
      checks.demandMatch = true;
      reasons.push('✓ Demand trend is increasing');
    } else if (info && info.trend === 'down') {
      reasons.push('~ Demand trend is softening');
    }
  } catch {
    // ML service may be down
  }

  return { score: Math.min(100, score), reasons, checks };
}

// ─── PRODUCE LISTINGS ─────────────────────────────────────────────────

export const createListing = asyncHandler(async (req, res) => {
  const {
    commodity, commodityName, quantityKg, unit, qualityGrade,
    harvestDate, expectedPriceInr, minimumPriceInr, location,
    lat, lng, availableFrom, deliveryPreference,
  } = req.body;

  const commodityDoc = commodity ? await Commodity.findById(commodity) : null;

  const listing = await ProduceListing.create({
    farmer: req.user._id,
    commodity: commodityDoc?._id || commodity,
    commodityName: commodityName || commodityDoc?.name || 'Unknown',
    quantityKg,
    unit: unit || 'kg',
    qualityGrade: qualityGrade || 'A',
    harvestDate,
    expectedPriceInr,
    minimumPriceInr: minimumPriceInr || expectedPriceInr * 0.9,
    location: location || req.user.location,
    lat: lat || 17.385,
    lng: lng || 78.487,
    availableFrom: availableFrom || new Date(),
    deliveryPreference: deliveryPreference || 'both',
    availableQuantityKg: quantityKg,
    dataStatus: 'SIMULATED',
  });

  res.status(201).json({ dataStatus: 'SIMULATED', listing });
});

export const getListings = asyncHandler(async (req, res) => {
  const filter = { status: 'active' };
  if (req.query.commodity) filter.commodityName = new RegExp(req.query.commodity, 'i');
  if (req.query.location) filter.location = new RegExp(req.query.location, 'i');
  if (req.query.farmer) filter.farmer = req.user._id;

  const listings = await ProduceListing.find(filter)
    .populate('farmer', 'name location avatarInitials')
    .populate('commodity', 'name slug')
    .sort({ createdAt: -1 });

  res.json({ dataStatus: 'SIMULATED', badge: dataBadge(), listings });
});

export const getMyListings = asyncHandler(async (req, res) => {
  const listings = await ProduceListing.find({ farmer: req.user._id })
    .populate('commodity', 'name slug')
    .sort({ createdAt: -1 });
  res.json({ dataStatus: 'SIMULATED', listings });
});

export const updateListing = asyncHandler(async (req, res) => {
  const listing = await ProduceListing.findById(req.params.id);
  if (!listing) throw new AppError('Listing not found', 404);
  if (listing.farmer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403);
  }
  Object.assign(listing, req.body);
  await listing.save();
  res.json({ dataStatus: 'SIMULATED', listing });
});

// ─── BUYER REQUIREMENTS ───────────────────────────────────────────────

export const createRequirement = asyncHandler(async (req, res) => {
  const {
    commodity, commodityName, quantityKg, qualityGrade,
    maximumPriceInr, deliveryLocation, deliveryLat, deliveryLng,
    requiredByDate,
  } = req.body;

  const commodityDoc = commodity ? await Commodity.findById(commodity) : null;

  const requirement = await BuyerRequirement.create({
    buyer: req.user._id,
    commodity: commodityDoc?._id || commodity,
    commodityName: commodityName || commodityDoc?.name || 'Unknown',
    quantityKg,
    qualityGrade: qualityGrade || 'Any',
    maximumPriceInr,
    deliveryLocation: deliveryLocation || req.user.location,
    deliveryLat: deliveryLat || 17.385,
    deliveryLng: deliveryLng || 78.487,
    requiredByDate,
    dataStatus: 'SIMULATED',
  });

  res.status(201).json({ dataStatus: 'SIMULATED', requirement });
});

export const getRequirements = asyncHandler(async (req, res) => {
  const filter = { status: { $in: ['active', 'partially_fulfilled'] } };
  if (req.query.commodity) filter.commodityName = new RegExp(req.query.commodity, 'i');
  if (req.query.buyer) filter.buyer = req.user._id;

  const requirements = await BuyerRequirement.find(filter)
    .populate('buyer', 'name location avatarInitials')
    .populate('commodity', 'name slug')
    .sort({ createdAt: -1 });

  res.json({ dataStatus: 'SIMULATED', badge: dataBadge(), requirements });
});

export const getMyRequirements = asyncHandler(async (req, res) => {
  const requirements = await BuyerRequirement.find({ buyer: req.user._id })
    .populate('commodity', 'name slug')
    .sort({ createdAt: -1 });
  res.json({ dataStatus: 'SIMULATED', requirements });
});

// ─── AI MATCHING ──────────────────────────────────────────────────────

export const runMatching = asyncHandler(async (req, res) => {
  const { listingId, requirementId } = req.query;

  let matches = [];
  let requirements = [];//fixed

  if (listingId) {
    // Find matching requirements for a listing
    const listing = await ProduceListing.findById(listingId);
    if (!listing) throw new AppError('Listing not found', 404);
    requirements = await BuyerRequirement.find({ //fixed
      status: { $in: ['active', 'partially_fulfilled'] },
      $or: [
        { commodityName: listing.commodityName },
        { commodity: listing.commodity },
      ],
    }).populate('buyer', 'name location avatarInitials');

    for (const req of requirements) {
      const existing = await MarketplaceMatch.findOne({ listing: listing._id, requirement: req._id });
      if (existing) {
        matches.push(existing);
        continue;
      }
      const result = await computeMatchScore(listing, req);
      const fairPriceInfo = await computeAIFairPrice(listing.commodity, listing.qualityGrade, listing.location, listing.quantityKg);
      const match = await MarketplaceMatch.create({
        listing: listing._id,
        requirement: req._id,
        matchScore: result.score,
        ...result.checks,
        matchReasons: result.reasons,
        aiFairPriceInr: fairPriceInfo.fairPrice,
        aiPriceRange: fairPriceInfo.range,
        dealVerdict: result.score >= 75 ? 'FAIR_DEAL' : result.score >= 50 ? 'GOOD_FOR_FARMER' : 'UNDERPRICED',
        demandTrend: fairPriceInfo.marketTrend,
        dataStatus: 'AI_FORECAST',
      });
      matches.push(match);
    }
  } else if (requirementId) {
    // Find matching listings for a requirement
    const requirement = await BuyerRequirement.findById(requirementId);
    requirements = [requirement];//fixed
    if (!requirement) throw new AppError('Requirement not found', 404);
    const listings = await ProduceListing.find({
      status: 'active',
      $or: [
        { commodityName: requirement.commodityName },
        { commodity: requirement.commodity },
      ],
    }).populate('farmer', 'name location avatarInitials');

    for (const listing of listings) {
      const existing = await MarketplaceMatch.findOne({ listing: listing._id, requirement: requirement._id });
      if (existing) {
        matches.push(existing);
        continue;
      }
      const result = await computeMatchScore(listing, requirement);
      const fairPriceInfo = await computeAIFairPrice(listing.commodity, listing.qualityGrade, listing.location, listing.quantityKg);
      const match = await MarketplaceMatch.create({
        listing: listing._id,
        requirement: requirement._id,
        matchScore: result.score,
        ...result.checks,
        matchReasons: result.reasons,
        aiFairPriceInr: fairPriceInfo.fairPrice,
        aiPriceRange: fairPriceInfo.range,
        dealVerdict: result.score >= 75 ? 'FAIR_DEAL' : result.score >= 50 ? 'GOOD_FOR_FARMER' : 'UNDERPRICED',
        demandTrend: fairPriceInfo.marketTrend,
        dataStatus: 'AI_FORECAST',
      });
      matches.push(match);
    }
  } else {
    // Global matching: match all active listings against all active requirements
    const listings = await ProduceListing.find({ status: 'active' }).populate('farmer', 'name location avatarInitials');
    requirements = await BuyerRequirement.find({ status: { $in: ['active', 'partially_fulfilled'] } })
      .populate('buyer', 'name location avatarInitials');

    for (const listing of listings) {
      for (const req of requirements) {
        const existing = await MarketplaceMatch.findOne({ listing: listing._id, requirement: req._id });
        if (existing) {
          matches.push(existing);
          continue;
        }
        const result = await computeMatchScore(listing, req);
        if (result.score > 0) {
          const fairPriceInfo = await computeAIFairPrice(listing.commodity, listing.qualityGrade, listing.location, listing.quantityKg);
          const match = await MarketplaceMatch.create({
            listing: listing._id,
            requirement: req._id,
            matchScore: result.score,
            ...result.checks,
            matchReasons: result.reasons,
            aiFairPriceInr: fairPriceInfo.fairPrice,
            aiPriceRange: fairPriceInfo.range,
            dealVerdict: result.score >= 75 ? 'FAIR_DEAL' : result.score >= 50 ? 'GOOD_FOR_FARMER' : 'UNDERPRICED',
            demandTrend: fairPriceInfo.marketTrend,
            dataStatus: 'AI_FORECAST',
          });
          matches.push(match);
        }
      }
    }
  }

  // Populate references
  matches = await MarketplaceMatch.find({
    _id: { $in: matches.map((m) => m._id) },
  })
    .populate({ path: 'listing', populate: { path: 'farmer', select: 'name location avatarInitials' } })
    .populate({ path: 'requirement', populate: { path: 'buyer', select: 'name location avatarInitials' } })
    .sort({ matchScore: -1 });

  // Multi-farmer consolidation: for requirements where single listing is insufficient
  const multiFarmerResults = [];
  for (const req of requirements || []) {
    const reqDoc = await BuyerRequirement.findById(req._id || req);
    if (!reqDoc) continue;
    const matchedListings = matches
      .filter((m) => (m.requirement?._id || m.requirement).toString() === reqDoc._id.toString())
      .sort((a, b) => b.matchScore - a.matchScore);

    let totalAvailable = 0;
    const selectedListings = [];
    for (const m of matchedListings) {
      const list = await ProduceListing.findById(m.listing?._id || m.listing);
      if (list && totalAvailable < reqDoc.quantityKg) {
        totalAvailable += list.availableQuantityKg;
        selectedListings.push({ listing: list, match: m });
      }
    }
    if (totalAvailable >= reqDoc.quantityKg && matchedListings.length > 1) {
      multiFarmerResults.push({
        requirement: reqDoc,
        suppliers: selectedListings,
        totalSupplyKg: totalAvailable,
        consolidated: true,
      });
    }
  }

  res.json({
    dataStatus: 'AI_FORECAST',
    badge: dataBadge(),
    matches,
    multiFarmerResults,
    totalMatches: matches.length,
  });
});

export const getMatchById = asyncHandler(async (req, res) => {
  const match = await MarketplaceMatch.findById(req.params.id)
    .populate({ path: 'listing', populate: [{ path: 'farmer', select: 'name location avatarInitials' }, { path: 'commodity', select: 'name slug' }] })
    .populate({ path: 'requirement', populate: [{ path: 'buyer', select: 'name location avatarInitials' }, { path: 'commodity', select: 'name slug' }] });
  if (!match) throw new AppError('Match not found', 404);
  res.json({ dataStatus: 'AI_FORECAST', match });
});

// ─── FAIR PRICE ───────────────────────────────────────────────────────

export const getFairPrice = asyncHandler(async (req, res) => {
  const { commodityId, qualityGrade, location, quantityKg } = req.query;
  const qty = Number(quantityKg) || 100;
  const fairPriceInfo = await computeAIFairPrice(commodityId, qualityGrade || 'A', location || 'Hyderabad', qty);

  // Try ML service for enhanced prediction
  let demandForecast = null;
  try {
    const commodity = await Commodity.findById(commodityId);
    if (commodity) {
      const market = await Market.findOne({ slug: 'kothapet' });
      const prices = await MarketPrice.find({ commodity: commodityId, market: market?._id }).sort({ date: 1 }).limit(30);
      const arrivals = await MarketArrival.find({ commodity: commodityId, market: market?._id }).sort({ date: 1 }).limit(30);

      demandForecast = await mlClient.forecastDemand({
        commodity: commodity.slug,
        historicalDemand: arrivals.map((a) => a.quantityKg),
        historicalPrice: prices.map((p) => p.modalPriceInr),
        dayOfWeek: new Date().getDay(),
        month: new Date().getMonth() + 1,
      });
    }
  } catch {
    // ML service may be down
  }

  res.json({
    dataStatus: 'AI_FORECAST',
    badge: dataBadge(),
    ...fairPriceInfo,
    demandForecast: demandForecast ? {
      expectedDemand: demandForecast.expected,
      trend: demandForecast.upper > demandForecast.expected ? 'up' : 'down',
    } : null,
  });
});

// ─── LOGISTICS ────────────────────────────────────────────────────────

export const calculateLogistics = asyncHandler(async (req, res) => {
  const { transactionId, listingId, requirementId, quantityKg } = req.query;

  let pickupLat = 17.385;
  let pickupLng = 78.487;
  let pickupLocation = 'Nalgonda';

  let deliveryLat = 17.4;
  let deliveryLng = 78.5;
  let deliveryLocation = 'Hyderabad';

  let qty = Number(quantityKg) || 100;
  let commodityName = 'Produce';
  let transaction = null;

  if (transactionId) {
    transaction = await Transaction.findById(transactionId)
      .populate('listing')
      .populate('requirement')
      .populate('farmer', 'name location')
      .populate('buyer', 'name location');

    if (!transaction) throw new AppError('Transaction not found', 404);

    commodityName = transaction.commodityName || 'Produce';
    qty = transaction.quantityKg;

    if (transaction.listing) {
      pickupLat = transaction.listing.lat || pickupLat;
      pickupLng = transaction.listing.lng || pickupLng;
      pickupLocation = transaction.listing.location || pickupLocation;
    } else if (transaction.farmer?.location) {
      pickupLocation = transaction.farmer.location;
    } else if (transaction.logistics?.pickupLocation) {
      pickupLocation = transaction.logistics.pickupLocation;
    }

    if (transaction.requirement) {
      deliveryLat = transaction.requirement.deliveryLat || deliveryLat;
      deliveryLng = transaction.requirement.deliveryLng || deliveryLng;
      deliveryLocation = transaction.requirement.deliveryLocation || deliveryLocation;
    } else if (transaction.buyer?.location) {
      deliveryLocation = transaction.buyer.location;
    } else if (transaction.logistics?.deliveryLocation) {
      deliveryLocation = transaction.logistics.deliveryLocation;
    }
  } else if (listingId) {
    const listing = await ProduceListing.findById(listingId);
    if (!listing) throw new AppError('Listing not found', 404);

    commodityName = listing.commodityName;
    pickupLat = listing.lat || pickupLat;
    pickupLng = listing.lng || pickupLng;
    pickupLocation = listing.location || pickupLocation;
    qty = Number(quantityKg) || listing.quantityKg;

    if (requirementId) {
      const reqDoc = await BuyerRequirement.findById(requirementId);
      if (reqDoc) {
        deliveryLat = reqDoc.deliveryLat || deliveryLat;
        deliveryLng = reqDoc.deliveryLng || deliveryLng;
        deliveryLocation = reqDoc.deliveryLocation || deliveryLocation;
      }
    }
  }

  const distanceKm = Number(haversineKm(pickupLat, pickupLng, deliveryLat, deliveryLng).toFixed(1));
  const transportCost = calcTransportCost(distanceKm, qty);
  const transportCostPerKg = qty > 0 ? Number((transportCost / qty).toFixed(2)) : 0;
  const etaMin = calcETA(distanceKm);

  // Route comparison (simulated)
  const routes = [
    {
      name: 'Route A — Direct Highway',
      distanceKm,
      transportCostInr: transportCost,
      etaMin,
      recommended: true,
      saving: 0,
    },
    {
      name: 'Route B — Express Corridor',
      distanceKm: Number((distanceKm * 1.15).toFixed(1)),
      transportCostInr: Number((transportCost * 1.08).toFixed(2)),
      etaMin: Math.round(etaMin * 0.85),
      recommended: false,
      saving: 0,
    },
    {
      name: 'Route C — Regional State Highway',
      distanceKm: Number((distanceKm * 0.92).toFixed(1)),
      transportCostInr: Number((transportCost * 0.88).toFixed(2)),
      etaMin: Math.round(etaMin * 1.25),
      recommended: false,
      saving: Number((transportCost - transportCost * 0.88).toFixed(2)),
    },
  ];

  // Mark cheapest as saving route
  const cheapest = routes.reduce((min, r) => (r.transportCostInr < min.transportCostInr ? r : min), routes[0]);
  routes.forEach((r) => {
    if (r !== cheapest && r !== routes[0]) {
      r.saving = Number((routes[0].transportCostInr - r.transportCostInr).toFixed(2));
    } else if (r === cheapest && r !== routes[0]) {
      r.saving = Number((routes[0].transportCostInr - r.transportCostInr).toFixed(2));
      r.recommended = true;
      routes[0].recommended = false;
    }
  });

  res.json({
    dataStatus: 'SIMULATED',
    badge: dataBadge(),
    logistics: {
      transactionId: transaction?._id,
      commodityName,
      pickup: { location: pickupLocation, lat: pickupLat, lng: pickupLng },
      delivery: { location: deliveryLocation, lat: deliveryLat, lng: deliveryLng },
      quantityKg: qty,
      distanceKm,
      transportCostInr: transportCost,
      transportCostPerKg,
      etaMin,
      routes,
      note: 'Route calculations use simulated distance estimates. A real routing API can be integrated for production.',
    },
  });
});

// ─── TRANSACTIONS ─────────────────────────────────────────────────────

export const createOffer = asyncHandler(async (req, res) => {
  const { listingId, requirementId, priceInr, quantityKg, message } = req.body;
  const listing = await ProduceListing.findById(listingId);
  if (!listing) throw new AppError('Listing not found', 404);

  const requirement = requirementId ? await BuyerRequirement.findById(requirementId) : null;
  const isSupplySide = req.user.role === 'farmer' || req.user.role === 'seller';

  const buyerId = isSupplySide ? (requirement?.buyer || req.body.buyerId) : req.user._id;
  const farmerId = isSupplySide ? req.user._id : listing.farmer;

  if (!buyerId) throw new AppError('Buyer could not be determined for this offer', 400);
  if (!farmerId) throw new AppError('Supplier could not be determined for this offer', 400);

  const available = listing.availableQuantityKg != null ? listing.availableQuantityKg : listing.quantityKg;
  const qty = Math.min(Number(quantityKg), available);
  if (qty <= 0) throw new AppError('Insufficient available quantity', 400);

  const offer = await Offer.create({
    listing: listingId,
    requirement: requirementId || undefined,
    buyer: buyerId,
    farmer: farmerId,
    createdBy: req.user._id,
    priceInr: Number(priceInr),
    quantityKg: qty,
    totalValueInr: Number((Number(priceInr) * qty).toFixed(2)),
    message: message || '',
    dataStatus: 'SIMULATED',
  });

  // Create transaction in offer_pending state
  const logistics = await computeLogisticsData(listing, req.body.deliveryLat, req.body.deliveryLng);
  const transportCostPerKg = logistics.transportCostPerKg;

  const transaction = await Transaction.create({
    listing: listingId,
    requirement: requirementId || undefined,
    offer: offer._id,
    farmer: farmerId,
    buyer: buyerId,
    commodity: listing.commodity,
    commodityName: listing.commodityName,
    quantityKg: qty,
    agreedPriceInr: Number(priceInr),
    totalValueInr: Number((Number(priceInr) * qty).toFixed(2)),
    transportCostInr: logistics.transportCostInr,
    farmerNetValueInr: Number(((Number(priceInr) - transportCostPerKg) * qty).toFixed(2)),
    buyerTotalCostInr: Number(((Number(priceInr) + transportCostPerKg) * qty).toFixed(2)),
    status: 'offer_pending',
    logistics: {
      distanceKm: logistics.distanceKm,
      estimatedTimeMin: logistics.etaMin,
      transportCostInr: logistics.transportCostInr,
      transportCostPerKg,
      pickupLocation: listing.location,
      deliveryLocation: logistics.deliveryLocation,
    },
    dataStatus: 'SIMULATED',
  });

  res.status(201).json({ dataStatus: 'SIMULATED', offer, transaction });
});

async function computeLogisticsData(listing, deliveryLat, deliveryLng) {
  const pickupLat = listing.lat || 17.385;
  const pickupLng = listing.lng || 78.487;
  const dLat = deliveryLat || 17.4;
  const dLng = deliveryLng || 78.5;
  const distanceKm = Number(haversineKm(pickupLat, pickupLng, dLat, dLng).toFixed(1));
  const qty = listing.quantityKg;
  const transportCost = calcTransportCost(distanceKm, qty);
  const transportCostPerKg = qty > 0 ? Number((transportCost / qty).toFixed(2)) : 0;
  const etaMin = calcETA(distanceKm);
  return { distanceKm, transportCostInr: transportCost, transportCostPerKg, etaMin, deliveryLocation: 'Buyer Location' };
}

export const acceptOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);

  const isSender = offer.createdBy && offer.createdBy.toString() === req.user._id.toString();
  const isFarmer = offer.farmer && offer.farmer.toString() === req.user._id.toString();
  const isBuyer = offer.buyer && offer.buyer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  let authorized = false;
  if (isAdmin) {
    authorized = true;
  } else if (offer.createdBy) {
    if (!isSender && (isFarmer || isBuyer)) {
      authorized = true;
    }
  } else {
    // Default fallback if createdBy is unset: recipient is farmer/seller
    if (isFarmer || isBuyer) {
      authorized = true;
    }
  }

  if (!authorized) throw new AppError('Not authorized to accept this offer', 403);
  if (offer.status !== 'pending') throw new AppError('Offer is no longer pending', 400);

  offer.status = 'accepted';
  await offer.save();

  // Update listing available quantity
  const listing = await ProduceListing.findById(offer.listing);
  if (listing) {
    listing.availableQuantityKg = Math.max(0, (listing.availableQuantityKg != null ? listing.availableQuantityKg : listing.quantityKg) - offer.quantityKg);
    if (listing.availableQuantityKg <= 0) listing.status = 'matched';
    await listing.save();
  }

  // Update transaction: find by offer._id first, or fallback to listing query
  let transaction = await Transaction.findOne({ offer: offer._id });
  if (!transaction) {
    transaction = await Transaction.findOne({ listing: offer.listing, status: 'offer_pending' });
  }
  if (transaction) {
    transaction.status = 'accepted';
    transaction.agreedPriceInr = offer.priceInr;
    transaction.totalValueInr = offer.totalValueInr;
    await transaction.save();
  }

  // Reserve inventory if supplier has inventory for this commodity
  const inventory = await Inventory.findOne({ seller: offer.farmer, commodity: listing?.commodity });
  if (inventory) {
    inventory.quantityKg = Math.max(0, inventory.quantityKg - offer.quantityKg);
    await inventory.save();
  }

  res.json({ dataStatus: 'SIMULATED', offer, transaction });
});

export const rejectOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);

  const isSender = offer.createdBy && offer.createdBy.toString() === req.user._id.toString();
  const isFarmer = offer.farmer && offer.farmer.toString() === req.user._id.toString();
  const isBuyer = offer.buyer && offer.buyer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  let authorized = false;
  if (isAdmin) {
    authorized = true;
  } else if (offer.createdBy) {
    if (!isSender && (isFarmer || isBuyer)) {
      authorized = true;
    }
  } else {
    if (isFarmer || isBuyer) {
      authorized = true;
    }
  }

  if (!authorized) throw new AppError('Not authorized to reject this offer', 403);
  if (offer.status !== 'pending') throw new AppError('Offer is no longer pending', 400);

  offer.status = 'rejected';
  await offer.save();

  // Update transaction: find by offer._id first, or fallback to listing query
  let transaction = await Transaction.findOne({ offer: offer._id });
  if (!transaction) {
    transaction = await Transaction.findOne({ listing: offer.listing, status: 'offer_pending' });
  }
  if (transaction) {
    transaction.status = 'rejected';
    await transaction.save();
  }

  res.json({ dataStatus: 'SIMULATED', offer, transaction });
});

export const getMyTransactions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'farmer' || req.user.role === 'seller') {
    filter.farmer = req.user._id;
  } else if (req.user.role === 'buyer') {
    filter.buyer = req.user._id;
  } else {
    // admin sees all
  }

  const transactions = await Transaction.find(filter)
    .populate('farmer', 'name location avatarInitials')
    .populate('buyer', 'name location avatarInitials')
    .populate('commodity', 'name slug')
    .populate('offer')
    .sort({ createdAt: -1 });

  res.json({ dataStatus: 'SIMULATED', badge: dataBadge(), transactions });
});

export const updateTransactionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) throw new AppError('Transaction not found', 404);

  const isFarmer = transaction.farmer && transaction.farmer.toString() === req.user._id.toString();
  const isBuyer = transaction.buyer && transaction.buyer.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isFarmer && !isBuyer && !isAdmin) {
    throw new AppError('Not authorized to update this transaction', 403);
  }

  const allowed = ['accepted', 'logistics_planned', 'in_transit', 'delivered', 'completed', 'rejected', 'cancelled'];
  if (!allowed.includes(status)) throw new AppError('Invalid status transition', 400);

  // If accepting or rejecting directly via transaction status update
  if (status === 'accepted' || status === 'rejected') {
    if (transaction.status !== 'offer_pending') {
      throw new AppError('Can only accept or reject when offer is pending', 400);
    }
    let offer = null;
    if (transaction.offer) {
      offer = await Offer.findById(transaction.offer);
    }
    const isSender = offer?.createdBy && offer.createdBy.toString() === req.user._id.toString();
    if (isSender && !isAdmin) {
      throw new AppError('Cannot accept or reject your own offer', 403);
    }
    if (offer) {
      offer.status = status;
      await offer.save();
    }
    if (status === 'accepted') {
      const listing = await ProduceListing.findById(transaction.listing);
      if (listing) {
        listing.availableQuantityKg = Math.max(0, (listing.availableQuantityKg != null ? listing.availableQuantityKg : listing.quantityKg) - transaction.quantityKg);
        if (listing.availableQuantityKg <= 0) listing.status = 'matched';
        await listing.save();
      }
    }
  }

  transaction.status = status;
  if (status === 'completed') {
    transaction.completedAt = new Date();
  }
  await transaction.save();

  res.json({ dataStatus: 'SIMULATED', transaction });
});

export const payTransaction = asyncHandler(async (req, res) => {
  const { paymentMethod, simulateFailure } = req.body;
  const transaction = await Transaction.findById(req.params.id)
    .populate('farmer', 'name location email avatarInitials')
    .populate('buyer', 'name location email avatarInitials')
    .populate('listing')
    .populate('requirement');

  if (!transaction) throw new AppError('Transaction not found', 404);

  const isBuyer =
    (transaction.buyer?._id && transaction.buyer._id.toString() === req.user._id.toString()) ||
    transaction.buyer?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isBuyer && !isAdmin) {
    throw new AppError('Only the buyer or admin can initiate payment for this transaction', 403);
  }

  if (transaction.paymentStatus === 'paid') {
    throw new AppError('This transaction has already been settled and paid', 400);
  }

  if (simulateFailure) {
    transaction.paymentStatus = 'failed';
    await transaction.save();
    return res.status(400).json({
      dataStatus: 'SIMULATED',
      error: 'Simulated payment failure: Demo bank gateway timeout or network error.',
      transaction,
    });
  }

  const paymentId = `SIM-PAY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  transaction.paymentStatus = 'paid';
  transaction.paymentMethod = paymentMethod || 'UPI';
  transaction.paymentId = paymentId;
  transaction.paidAt = new Date();
  transaction.status = 'completed';
  transaction.completedAt = new Date();
  await transaction.save();

  res.json({
    dataStatus: 'SIMULATED',
    message: 'Payment completed successfully (SIMULATED DEMO)',
    paymentId,
    transaction,
  });
});

// ─── TRADE OPPORTUNITY (combined endpoint) ────────────────────────────

export const getTradeOpportunities = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const opportunities = [];

  if (role === 'farmer' || role === 'seller' || role === 'admin') {
    // Find requirements matching farmer's/seller's inventory/listings (or all active listings if admin)
    const listFilter = role === 'admin' ? { status: 'active' } : { farmer: req.user._id, status: 'active' };
    const listings = await ProduceListing.find(listFilter);
    const requirements = await BuyerRequirement.find({ status: { $in: ['active', 'partially_fulfilled'] } })
      .populate('buyer', 'name location avatarInitials');

    for (const listing of listings) {
      for (const req of requirements) {
        const result = await computeMatchScore(listing, req);
        if (result.score >= 50) {
          const fairPriceInfo = await computeAIFairPrice(listing.commodity, listing.qualityGrade, listing.location, listing.quantityKg);
          const distance = haversineKm(listing.lat || 17.385, listing.lng || 78.487, req.deliveryLat || 17.385, req.deliveryLng || 78.487);
          const transportCost = calcTransportCost(distance, listing.quantityKg);
          const transportPerKg = Number((transportCost / listing.quantityKg).toFixed(2));

          opportunities.push({
            type: 'SELL',
            listing,
            requirement: req,
            matchScore: result.score,
            matchReasons: result.reasons,
            fairPrice: fairPriceInfo.fairPrice,
            fairPriceRange: fairPriceInfo.range,
            buyerOffer: req.maximumPriceInr,
            transportCostPerKg: transportPerKg,
            estimatedFarmerNet: Number((fairPriceInfo.fairPrice - transportPerKg).toFixed(2)),
            aiConfidence: fairPriceInfo.confidence,
            dealVerdict: result.score >= 75 ? 'FAIR_DEAL' : 'GOOD_FOR_FARMER',
            dataStatus: 'AI_FORECAST',
          });
        }
      }
    }
  }

  if (role === 'buyer' || role === 'admin') {
    // Find listings matching buyer's requirements (or all active requirements if admin)
    const reqFilter = role === 'admin' ? { status: 'active' } : { buyer: req.user._id, status: 'active' };
    const requirements = await BuyerRequirement.find(reqFilter);
    const listings = await ProduceListing.find({ status: 'active' })
      .populate('farmer', 'name location avatarInitials');

    for (const req of requirements) {
      const matched = [];
      for (const listing of listings) {
        const result = await computeMatchScore(listing, req);
        if (result.score >= 50) {
          matched.push({ listing, score: result.score, reasons: result.reasons });
        }
      }
      matched.sort((a, b) => b.score - a.score);
      const totalAvailable = matched.reduce((s, m) => s + (m.listing.availableQuantityKg || m.listing.quantityKg), 0);

      if (matched.length > 0) {
        const fairPriceInfo = await computeAIFairPrice(req.commodity, 'A', req.deliveryLocation, req.quantityKg);
        opportunities.push({
          type: 'BUY',
          requirement: req,
          matchedSuppliers: matched.slice(0, 5),
          totalAvailableKg: totalAvailable,
          fairPrice: fairPriceInfo.fairPrice,
          estimatedLogisticsPerKg: 1.7,
          dataStatus: 'AI_FORECAST',
        });
      }
    }
  }

  res.json({ dataStatus: 'AI_FORECAST', badge: dataBadge(), opportunities });
});
