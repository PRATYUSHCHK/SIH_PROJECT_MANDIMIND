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
  SupplyPool,
  Shipment,
} from '../models/index.js';

import { mlClient } from '../services/mlClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dataBadge } from '../services/dataStatus.js';
import { AppError } from '../middleware/error.js';
import {
  calculateTradeViability,
  calculateLogisticsCost,
  evaluateSpoilageRisk,
  getCommodityProfile,
  haversineKm,
  findConsolidationOpportunities,
  calculateMultiStopLogisticsPlan,
} from '../services/tradeViabilityService.js';

// ─── Helpers ────────────────────────────────────────────────────────────

function calcTransportCost(distanceKm, quantityKg) {
  return calculateLogisticsCost({ distanceKm, quantityKg }).totalTransportCostInr;
}

function calcETA(distanceKm) {
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
  const avgArrival = arrivals.length ? Math.round(arrivals.reduce((s, a) => s + a.quantityKg) / arrivals.length) : 0;
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
    return { score: 0, reasons: ['✗ Commodity does not match'], checks, viability: null };
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

  // Location & Viability match (15 pts)
  const distance = haversineKm(listing.lat || 17.385, listing.lng || 78.487, requirement.deliveryLat || 17.385, requirement.deliveryLng || 78.487);
  if (distance < 50) {
    score += 15;
    checks.locationMatch = true;
    reasons.push(`✓ Local direct delivery (${distance} km)`);
  } else if (distance < 150) {
    score += 12;
    checks.locationMatch = true;
    reasons.push(`✓ Regional delivery (${distance} km)`);
  } else if (distance < 350) {
    score += 6;
    reasons.push(`~ Moderate transit distance (${distance} km)`);
  } else {
    reasons.push(`✗ Long distance transit (${distance} km)`);
  }

  // Quantity match (10 pts)
  const listingAvailable = listing.availableQuantityKg != null ? listing.availableQuantityKg : listing.quantityKg;
  if (listingAvailable >= requirement.quantityKg) {
    score += 10;
    checks.quantityMatch = true;
    reasons.push('✓ Single supplier full fulfillment');
  } else if (listingAvailable >= requirement.quantityKg * 0.5) {
    score += 6;
    reasons.push('~ Partial fulfillment available');
  } else {
    reasons.push('~ Supply pooling recommended for full requirement');
  }

  // Trade Viability & Spoilage Evaluation
  const viability = calculateTradeViability({
    listing,
    requirement,
    grossPriceInr: requirement.maximumPriceInr,
    quantityKg: Math.min(listingAvailable, requirement.quantityKg),
  });

  if (viability.spoilage.spoilageRiskScore === 'LOW') {
    reasons.push('✓ Low transit spoilage risk');
  } else if (viability.spoilage.spoilageRiskScore === 'HIGH') {
    reasons.push('⚠️ High transit spoilage risk under standard transport');
  }

  if (viability.isRecommended) {
    reasons.push(`✓ Estimated Net Realization: ₹${viability.netFarmerRealizationInr}/kg`);
  } else {
    reasons.push(`⚠️ Low Net Realization: ₹${viability.netFarmerRealizationInr}/kg after transport & spoilage`);
  }

  // Demand trend bonus (5 pts)
  try {
    const info = await getCommodityPriceInfo(listing.commodity);
    if (info && info.trend === 'up') {
      score += 5;
      checks.demandMatch = true;
      reasons.push('✓ Demand trend is increasing');
    }
  } catch {
    // ignore
  }

  return { score: Math.min(100, score), reasons, checks, viability };
}

// ─── PRODUCE LISTINGS ─────────────────────────────────────────────────

export const createListing = asyncHandler(async (req, res) => {
  const {
    commodity, commodityName, quantityKg, unit, qualityGrade,
    harvestDate, expectedPriceInr, minimumPriceInr, location,
    lat, lng, availableFrom, deliveryPreference, tradePreference, packagingType,
  } = req.body;

  const commodityDoc = commodity ? await Commodity.findById(commodity) : null;

  const listing = await ProduceListing.create({
    farmer: req.user._id,
    commodity: commodityDoc?._id || commodity,
    commodityName: commodityName || commodityDoc?.name || 'Unknown',
    quantityKg,
    unit: unit || 'kg',
    qualityGrade: qualityGrade || 'A',
    harvestDate: harvestDate || new Date(),
    expectedPriceInr,
    minimumPriceInr: minimumPriceInr || expectedPriceInr * 0.9,
    location: location || req.user.location,
    lat: lat || 17.0575,
    lng: lng || 79.2671,
    availableFrom: availableFrom || new Date(),
    deliveryPreference: deliveryPreference || 'both',
    tradePreference: tradePreference || 'any',
    packagingType: packagingType || 'standard_crate',
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
    requiredByDate, buyerType, allowPoolAggregation, requiredVehicleType,
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
    requiredByDate: requiredByDate || new Date(Date.now() + 3 * 86400000),
    buyerType: buyerType || 'retailer',
    allowPoolAggregation: allowPoolAggregation !== undefined ? allowPoolAggregation : true,
    requiredVehicleType: requiredVehicleType || 'any',
    dataStatus: 'SIMULATED',
  });

  // Auto-initialize a supply pool if the requirement is large (> 500kg) and allows pooling
  if (quantityKg >= 500 && (allowPoolAggregation !== false)) {
    await SupplyPool.create({
      buyerRequirement: requirement._id,
      commodity: requirement.commodity,
      commodityName: requirement.commodityName,
      qualityGrade: requirement.qualityGrade,
      targetQuantityKg: requirement.quantityKg,
      collectedQuantityKg: 0,
      targetPriceInr: requirement.maximumPriceInr,
      averageFarmerPriceInr: requirement.maximumPriceInr,
      destinationLocation: requirement.deliveryLocation,
      destinationLat: requirement.deliveryLat,
      destinationLng: requirement.deliveryLng,
      deliveryDeadline: requirement.requiredByDate,
      status: 'open',
      intermediaryReduction: {
        commercialLayersCount: 0,
        serviceProviders: ['Direct Transport', 'FPO Collection Hub'],
        estimatedSavingsPct: 21.0,
      },
      dataStatus: 'SIMULATED',
    });
  }

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

// ─── AI MATCHING & TRADE VIABILITY ────────────────────────────────────

export const runMatching = asyncHandler(async (req, res) => {
  const { listingId, requirementId } = req.query;

  let matches = [];
  let requirements = [];

  if (listingId) {
    const listing = await ProduceListing.findById(listingId);
    if (!listing) throw new AppError('Listing not found', 404);
    requirements = await BuyerRequirement.find({
      status: { $in: ['active', 'partially_fulfilled'] },
      $or: [
        { commodityName: new RegExp(listing.commodityName, 'i') },
        { commodity: listing.commodity },
      ],
    }).populate('buyer', 'name location avatarInitials');

    for (const r of requirements) {
      let match = await MarketplaceMatch.findOne({ listing: listing._id, requirement: r._id });
      const result = await computeMatchScore(listing, r);
      const fairPriceInfo = await computeAIFairPrice(listing.commodity, listing.qualityGrade, listing.location, listing.quantityKg);
      const v = result.viability || calculateTradeViability({ listing, requirement: r });

      const matchData = {
        listing: listing._id,
        requirement: r._id,
        matchScore: result.score,
        ...result.checks,
        matchReasons: result.reasons,
        aiFairPriceInr: fairPriceInfo.fairPrice,
        aiPriceRange: fairPriceInfo.range,
        dealVerdict: result.score >= 75 ? 'FAIR_DEAL' : result.score >= 50 ? 'GOOD_FOR_FARMER' : 'UNDERPRICED',
        demandTrend: fairPriceInfo.marketTrend,
        tradeViabilityScore: v.viabilityScore,
        netFarmerRealizationInr: v.netFarmerRealizationInr,
        transportCostPerKg: v.logistics.transportCostPerKg,
        distanceKm: v.distanceKm,
        estimatedTravelTimeMin: v.etaMinutes,
        packagingCostPerKg: v.priceWaterfall.packagingCostPerKg,
        handlingCostPerKg: v.priceWaterfall.handlingCostPerKg,
        spoilageRiskScore: v.spoilage.spoilageRiskScore,
        spoilageProbability: v.spoilage.spoilageProbability,
        expectedSpoilageLossInr: v.priceWaterfall.spoilageRiskLossPerKg,
        recommendedVehicleType: v.spoilage.recommendedVehicleType,
        isRecommended: v.isRecommended,
        warningReason: v.warningReason,
        advisoryPills: v.advisoryPills,
        priceWaterfall: v.priceWaterfall,
        intermediaryReduction: v.intermediaryReduction,
        dataStatus: 'AI_FORECAST',
      };

      if (match) {
        Object.assign(match, matchData);
        await match.save();
      } else {
        match = await MarketplaceMatch.create(matchData);
      }
      matches.push(match);
    }
  } else if (requirementId) {
    const requirement = await BuyerRequirement.findById(requirementId);
    if (!requirement) throw new AppError('Requirement not found', 404);
    requirements = [requirement];
    const listings = await ProduceListing.find({
      status: 'active',
      $or: [
        { commodityName: new RegExp(requirement.commodityName, 'i') },
        { commodity: requirement.commodity },
      ],
    }).populate('farmer', 'name location avatarInitials');

    for (const listing of listings) {
      let match = await MarketplaceMatch.findOne({ listing: listing._id, requirement: requirement._id });
      const result = await computeMatchScore(listing, requirement);
      const fairPriceInfo = await computeAIFairPrice(listing.commodity, listing.qualityGrade, listing.location, listing.quantityKg);
      const v = result.viability || calculateTradeViability({ listing, requirement });

      const matchData = {
        listing: listing._id,
        requirement: requirement._id,
        matchScore: result.score,
        ...result.checks,
        matchReasons: result.reasons,
        aiFairPriceInr: fairPriceInfo.fairPrice,
        aiPriceRange: fairPriceInfo.range,
        dealVerdict: result.score >= 75 ? 'FAIR_DEAL' : result.score >= 50 ? 'GOOD_FOR_FARMER' : 'UNDERPRICED',
        demandTrend: fairPriceInfo.marketTrend,
        tradeViabilityScore: v.viabilityScore,
        netFarmerRealizationInr: v.netFarmerRealizationInr,
        transportCostPerKg: v.logistics.transportCostPerKg,
        distanceKm: v.distanceKm,
        estimatedTravelTimeMin: v.etaMinutes,
        packagingCostPerKg: v.priceWaterfall.packagingCostPerKg,
        handlingCostPerKg: v.priceWaterfall.handlingCostPerKg,
        spoilageRiskScore: v.spoilage.spoilageRiskScore,
        spoilageProbability: v.spoilage.spoilageProbability,
        expectedSpoilageLossInr: v.priceWaterfall.spoilageRiskLossPerKg,
        recommendedVehicleType: v.spoilage.recommendedVehicleType,
        isRecommended: v.isRecommended,
        warningReason: v.warningReason,
        advisoryPills: v.advisoryPills,
        priceWaterfall: v.priceWaterfall,
        intermediaryReduction: v.intermediaryReduction,
        dataStatus: 'AI_FORECAST',
      };

      if (match) {
        Object.assign(match, matchData);
        await match.save();
      } else {
        match = await MarketplaceMatch.create(matchData);
      }
      matches.push(match);
    }
  } else {
    // Global matching
    const listings = await ProduceListing.find({ status: 'active' }).populate('farmer', 'name location avatarInitials');
    requirements = await BuyerRequirement.find({ status: { $in: ['active', 'partially_fulfilled'] } })
      .populate('buyer', 'name location avatarInitials');

    for (const listing of listings) {
      for (const reqDoc of requirements) {
        const result = await computeMatchScore(listing, reqDoc);
        if (result.score > 0) {
          const fairPriceInfo = await computeAIFairPrice(listing.commodity, listing.qualityGrade, listing.location, listing.quantityKg);
          const v = result.viability || calculateTradeViability({ listing, requirement: reqDoc });

          const matchData = {
            listing: listing._id,
            requirement: reqDoc._id,
            matchScore: result.score,
            ...result.checks,
            matchReasons: result.reasons,
            aiFairPriceInr: fairPriceInfo.fairPrice,
            aiPriceRange: fairPriceInfo.range,
            dealVerdict: result.score >= 75 ? 'FAIR_DEAL' : result.score >= 50 ? 'GOOD_FOR_FARMER' : 'UNDERPRICED',
            demandTrend: fairPriceInfo.marketTrend,
            tradeViabilityScore: v.viabilityScore,
            netFarmerRealizationInr: v.netFarmerRealizationInr,
            transportCostPerKg: v.logistics.transportCostPerKg,
            distanceKm: v.distanceKm,
            estimatedTravelTimeMin: v.etaMinutes,
            packagingCostPerKg: v.priceWaterfall.packagingCostPerKg,
            handlingCostPerKg: v.priceWaterfall.handlingCostPerKg,
            spoilageRiskScore: v.spoilage.spoilageRiskScore,
            spoilageProbability: v.spoilage.spoilageProbability,
            expectedSpoilageLossInr: v.priceWaterfall.spoilageRiskLossPerKg,
            recommendedVehicleType: v.spoilage.recommendedVehicleType,
            isRecommended: v.isRecommended,
            warningReason: v.warningReason,
            advisoryPills: v.advisoryPills,
            priceWaterfall: v.priceWaterfall,
            intermediaryReduction: v.intermediaryReduction,
            dataStatus: 'AI_FORECAST',
          };

          let match = await MarketplaceMatch.findOne({ listing: listing._id, requirement: reqDoc._id });
          if (match) {
            Object.assign(match, matchData);
            await match.save();
          } else {
            match = await MarketplaceMatch.create(matchData);
          }
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
    .populate({ path: 'requirement', populate: { path: 'buyer', select: 'name location avatarInitials buyerType' } })
    // Sort by Net Farmer Realization and Viability Score (NOT gross price alone)
    .sort({ isRecommended: -1, netFarmerRealizationInr: -1, matchScore: -1 });

  // Supply Pooling & Multi-Farmer Consolidation Analysis
  const multiFarmerResults = [];
  for (const r of requirements || []) {
    const reqDoc = await BuyerRequirement.findById(r._id || r);
    if (!reqDoc) continue;

    const matchedListings = matches
      .filter((m) => (m.requirement?._id || m.requirement).toString() === reqDoc._id.toString())
      .sort((a, b) => (b.netFarmerRealizationInr || 0) - (a.netFarmerRealizationInr || 0));

    let totalAvailable = 0;
    const selectedListings = [];
    for (const m of matchedListings) {
      const list = await ProduceListing.findById(m.listing?._id || m.listing);
      if (list && totalAvailable < reqDoc.quantityKg) {
        totalAvailable += (list.availableQuantityKg != null ? list.availableQuantityKg : list.quantityKg);
        selectedListings.push({ listing: list, match: m });
      }
    }

    if (totalAvailable >= reqDoc.quantityKg && matchedListings.length > 1) {
      const allActiveLists = selectedListings.map((s) => s.listing);
      const consolidationOpts = findConsolidationOpportunities(allActiveLists, reqDoc);

      multiFarmerResults.push({
        requirement: reqDoc,
        suppliers: selectedListings,
        totalSupplyKg: totalAvailable,
        consolidated: true,
        consolidationOptions: consolidationOpts,
      });
    }
  }

  // Fetch active supply pools
  const supplyPools = await SupplyPool.find({ status: { $in: ['open', 'target_reached'] } })
    .populate('buyerRequirement')
    .populate('contributors.farmer', 'name location')
    .sort({ createdAt: -1 });

  res.json({
    dataStatus: 'AI_FORECAST',
    badge: dataBadge(),
    matches,
    multiFarmerResults,
    supplyPools,
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

// ─── PRE-TRADE VIABILITY ANALYSIS ─────────────────────────────────────

export const getTradeAnalysis = asyncHandler(async (req, res) => {
  const { listingId, requirementId, grossPriceInr, quantityKg, vehicleType, ambientTempC } = req.body;

  const listing = listingId ? await ProduceListing.findById(listingId) : null;
  const requirement = requirementId ? await BuyerRequirement.findById(requirementId) : null;

  const viability = calculateTradeViability({
    listing,
    requirement,
    grossPriceInr: Number(grossPriceInr) || requirement?.maximumPriceInr || listing?.expectedPriceInr || 28,
    quantityKg: Number(quantityKg) || listing?.quantityKg || requirement?.quantityKg || 100,
    vehicleType: vehicleType || 'standard',
    ambientTempC: Number(ambientTempC) || 31,
  });

  res.json({
    dataStatus: 'AI_FORECAST',
    badge: dataBadge(),
    viability,
  });
});

// ─── SUPPLY POOLING APIS ──────────────────────────────────────────────

export const createSupplyPool = asyncHandler(async (req, res) => {
  const {
    buyerRequirementId,
    commodityId,
    commodityName,
    targetQuantityKg,
    targetPriceInr,
    destinationLocation,
    destinationLat,
    destinationLng,
    deliveryDeadline,
    notes,
  } = req.body;

  let buyerId = req.user._id;
  let buyerName = req.user.name;

  if (buyerRequirementId) {
    const requirement = await BuyerRequirement.findById(buyerRequirementId).populate('buyer', 'name location');
    if (requirement) {
      buyerId = requirement.buyer?._id || requirement.buyer;
      buyerName = requirement.buyer?.name || requirement.deliveryLocation || 'Verified Buyer';
    }
  }

  const poolCode = `SP-${Math.floor(100 + Math.random() * 900)}`;

  const pool = await SupplyPool.create({
    poolCode,
    buyerRequirement: buyerRequirementId,
    buyer: buyerId,
    buyerName,
    commodity: commodityId,
    commodityName,
    targetQuantityKg: Number(targetQuantityKg),
    collectedQuantityKg: 0,
    targetPriceInr: Number(targetPriceInr),
    averageFarmerPriceInr: Number(targetPriceInr),
    totalPoolValueInr: Number(targetQuantityKg) * Number(targetPriceInr),
    destinationLocation: destinationLocation || 'Hyderabad',
    destinationLat: destinationLat || 17.385,
    destinationLng: destinationLng || 78.487,
    deliveryDeadline,
    status: 'open',
    timeline: [
      {
        status: 'open',
        title: 'Supply Pool Created',
        description: `Coordinated aggregation open for ${targetQuantityKg} kg ${commodityName} at ₹${targetPriceInr}/kg.`,
      },
    ],
    notes: notes || '',
    fpoCoordinator: req.user._id,
    intermediaryReduction: {
      commercialLayersCount: 0,
      serviceProviders: ['Direct Transport Carrier', 'Aggregated Cluster Pickup'],
      estimatedSavingsPct: 22.0,
    },
    dataStatus: 'SIMULATED',
  });

  res.status(201).json({ dataStatus: 'SIMULATED', pool });
});

export const getSupplyPools = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.commodity) filter.commodityName = new RegExp(req.query.commodity, 'i');
  if (req.query.status) filter.status = req.query.status;

  const pools = await SupplyPool.find(filter)
    .populate('buyerRequirement')
    .populate('buyer', 'name location email avatarInitials')
    .populate('commodity', 'name slug perishability')
    .populate('contributors.farmer', 'name location avatarInitials')
    .populate('contributors.listing')
    .populate('poolTransaction')
    .populate('shipment')
    .populate('fpoCoordinator', 'name location')
    .sort({ createdAt: -1 });

  res.json({ dataStatus: 'SIMULATED', badge: dataBadge(), pools });
});

export const getSupplyPoolById = asyncHandler(async (req, res) => {
  const pool = await SupplyPool.findById(req.params.id)
    .populate('buyerRequirement')
    .populate('buyer', 'name location email avatarInitials')
    .populate('commodity', 'name slug perishability')
    .populate('contributors.farmer', 'name location avatarInitials')
    .populate('contributors.listing')
    .populate('poolTransaction')
    .populate('shipment');

  if (!pool) throw new AppError('Supply pool not found', 404);
  res.json({ dataStatus: 'SIMULATED', pool });
});

export const contributeToSupplyPool = asyncHandler(async (req, res) => {
  const { quantityKg, listingId, offeredPriceInr } = req.body;
  const pool = await SupplyPool.findById(req.params.id);
  if (!pool) throw new AppError('Supply pool not found', 404);

  if (pool.status !== 'open' && pool.status !== 'target_reached') {
    throw new AppError('Supply pool is no longer accepting contributions', 400);
  }

  const qty = Number(quantityKg);
  if (qty <= 0) throw new AppError('Contribution quantity must be greater than 0', 400);

  const price = Number(offeredPriceInr || pool.targetPriceInr);

  const listing = listingId ? await ProduceListing.findById(listingId) : null;
  if (listing) {
    const available = listing.availableQuantityKg != null ? listing.availableQuantityKg : listing.quantityKg;
    if (qty > available) {
      throw new AppError(`Contributed quantity (${qty}kg) exceeds available listing quantity (${available}kg)`, 400);
    }
    listing.availableQuantityKg = Math.max(0, available - qty);
    if (listing.availableQuantityKg === 0) listing.status = 'matched';
    await listing.save();
  }

  // Check if farmer already contributed - update if so, or append
  const existingIdx = pool.contributors.findIndex(
    (c) => c.farmer && c.farmer.toString() === req.user._id.toString()
  );

  if (existingIdx >= 0) {
    pool.contributors[existingIdx].quantityKg += qty;
    pool.contributors[existingIdx].offeredPriceInr = price;
    pool.contributors[existingIdx].agreedPriceInr = price;
    pool.contributors[existingIdx].grossAmountInr = pool.contributors[existingIdx].quantityKg * price;
  } else {
    pool.contributors.push({
      farmer: req.user._id,
      farmerName: req.user.name || 'Farmer',
      listing: listingId || undefined,
      quantityKg: qty,
      verifiedQuantityKg: qty,
      offeredPriceInr: price,
      agreedPriceInr: price,
      grossAmountInr: qty * price,
      qualityGrade: listing?.qualityGrade || 'A',
      location: listing?.location || req.user.location || 'Local Farm',
      lat: listing?.lat || 17.0575,
      lng: listing?.lng || 79.2671,
      pickupStatus: 'scheduled',
      settlementStatus: 'pending',
      status: 'committed',
    });
  }

  // Re-calculate totals
  pool.collectedQuantityKg = pool.contributors.reduce((s, c) => s + c.quantityKg, 0);
  const totalValue = pool.contributors.reduce((s, c) => s + c.quantityKg * c.offeredPriceInr, 0);
  pool.averageFarmerPriceInr = pool.collectedQuantityKg > 0 ? Number((totalValue / pool.collectedQuantityKg).toFixed(2)) : pool.targetPriceInr;
  pool.totalPoolValueInr = pool.collectedQuantityKg * pool.targetPriceInr;

  // Multi-stop logistics calculation
  const logisticsPlan = calculateMultiStopLogisticsPlan({
    contributors: pool.contributors,
    destination: {
      lat: pool.destinationLat || 17.385,
      lng: pool.destinationLng || 78.487,
      location: pool.destinationLocation,
      buyerName: pool.buyerName,
    },
    commodityName: pool.commodityName,
    preferredVehicleType: 'standard',
  });

  pool.consolidatedLogistics = {
    totalDistanceKm: logisticsPlan.distanceKm,
    estimatedTravelTimeMin: logisticsPlan.estimatedTravelTimeMin,
    totalTransportCostInr: logisticsPlan.totalTransportCostInr,
    transportCostPerKg: logisticsPlan.transportCostPerKg,
    individualTransportEstimateInr: logisticsPlan.individualTransportEstimateInr,
    consolidatedSavingsInr: logisticsPlan.consolidatedSavingsInr,
    routeWaypoints: logisticsPlan.routeWaypoints,
    vehicleType: logisticsPlan.vehicle.vehicleType,
    vehicleCapacityKg: logisticsPlan.vehicle.capacityKg,
    spoilageRisk: logisticsPlan.spoilageRisk.riskScore,
    spoilageAdvisory: logisticsPlan.spoilageRisk.advisoryNote,
  };

  // State Transition Check
  if (pool.collectedQuantityKg >= pool.targetQuantityKg) {
    pool.status = 'target_reached';
    const hasTargetReachedTimeline = pool.timeline.some((t) => t.status === 'target_reached');
    if (!hasTargetReachedTimeline) {
      pool.timeline.push({
        status: 'target_reached',
        title: 'Target Reached',
        description: `Target ${pool.targetQuantityKg} kg collected across ${pool.contributors.length} participating farmers. Awaiting buyer confirmation.`,
      });
    }
  }

  await pool.save();

  res.json({
    dataStatus: 'SIMULATED',
    message: pool.status === 'target_reached'
      ? 'Target reached! The required quantity has been collected and is ready for buyer confirmation.'
      : 'Contribution added to pool successfully.',
    pool,
  });
});

/**
 * Buyer confirms the pooled supply.
 * Idempotent: Creates parent Pool Transaction and Consolidated Shipment only if not already existing.
 */
export const confirmSupplyPool = asyncHandler(async (req, res) => {
  const pool = await SupplyPool.findById(req.params.id)
    .populate('buyerRequirement')
    .populate('buyer', 'name location email')
    .populate('contributors.farmer', 'name location email');

  if (!pool) throw new AppError('Supply pool not found', 404);

  // Validate state
  if (pool.status !== 'target_reached' && pool.status !== 'buyer_confirmation_pending' && pool.status !== 'open') {
    if (pool.status === 'buyer_confirmed' || pool.status === 'logistics_planned' || pool.status === 'in_transit' || pool.status === 'delivered' || pool.status === 'completed') {
      const existingTx = pool.poolTransaction ? await Transaction.findById(pool.poolTransaction) : null;
      const existingShipment = pool.shipment ? await Shipment.findById(pool.shipment) : null;
      return res.json({
        dataStatus: 'SIMULATED',
        message: 'Supply pool order already confirmed.',
        pool,
        transaction: existingTx,
        shipment: existingShipment,
      });
    }
    throw new AppError(`Cannot confirm pool with status: ${pool.status}`, 400);
  }

  if (pool.collectedQuantityKg < pool.targetQuantityKg && pool.status === 'open') {
    throw new AppError(`Cannot confirm pool before reaching target quantity (${pool.collectedQuantityKg}/${pool.targetQuantityKg} kg collected)`, 400);
  }

  // Authorization: buyer or admin
  const isBuyer = (pool.buyer?._id && pool.buyer._id.toString() === req.user._id.toString()) || pool.buyer?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isBuyer && !isAdmin) {
    throw new AppError('Only the buyer or admin can confirm this pooled order', 403);
  }

  // Calculate logistics plan
  const logisticsPlan = calculateMultiStopLogisticsPlan({
    contributors: pool.contributors,
    destination: {
      lat: pool.destinationLat || 17.385,
      lng: pool.destinationLng || 78.487,
      location: pool.destinationLocation,
      buyerName: pool.buyerName || pool.buyer?.name || 'Buyer',
    },
    commodityName: pool.commodityName,
    preferredVehicleType: pool.consolidatedLogistics?.vehicleType || 'standard',
  });

  // Idempotent Transaction Creation
  let transaction = null;
  if (pool.poolTransaction) {
    transaction = await Transaction.findById(pool.poolTransaction);
  }

  if (!transaction) {
    const orderNumber = `MM-POOL-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalOrderVal = pool.collectedQuantityKg * pool.targetPriceInr;
    const transportCost = logisticsPlan.totalTransportCostInr;
    const farmerNet = pool.contributors.reduce((s, c) => s + (c.grossAmountInr || (c.quantityKg * c.offeredPriceInr)), 0);

    const poolContributorsBreakdown = pool.contributors.map((c) => ({
      farmer: c.farmer?._id || c.farmer,
      farmerName: c.farmerName || c.farmer?.name || c.location,
      listing: c.listing,
      quantityKg: c.quantityKg,
      verifiedQuantityKg: c.quantityKg,
      agreedPriceInr: c.offeredPriceInr || pool.targetPriceInr,
      grossAmountInr: c.grossAmountInr || (c.quantityKg * (c.offeredPriceInr || pool.targetPriceInr)),
      pickupStatus: 'scheduled',
      settlementStatus: 'pending',
    }));

    transaction = await Transaction.create({
      orderNumber,
      isPoolOrder: true,
      tradeType: 'POOL_AGGREGATION',
      supplyPool: pool._id,
      requirement: pool.buyerRequirement?._id || pool.buyerRequirement,
      buyer: pool.buyer?._id || pool.buyer || req.user._id,
      farmer: pool.contributors[0]?.farmer?._id || pool.contributors[0]?.farmer || req.user._id,
      commodity: pool.commodity,
      commodityName: pool.commodityName,
      quantityKg: pool.collectedQuantityKg,
      agreedPriceInr: pool.targetPriceInr,
      totalValueInr: totalOrderVal,
      transportCostInr: transportCost,
      farmerNetValueInr: farmerNet,
      buyerTotalCostInr: totalOrderVal + transportCost,
      status: 'buyer_confirmed',
      poolContributors: poolContributorsBreakdown,
      logistics: {
        distanceKm: logisticsPlan.distanceKm,
        estimatedTimeMin: logisticsPlan.estimatedTravelTimeMin,
        transportCostInr: logisticsPlan.totalTransportCostInr,
        transportCostPerKg: logisticsPlan.transportCostPerKg,
        vehicleType: logisticsPlan.vehicle.vehicleType,
        spoilageRiskScore: logisticsPlan.spoilageRisk.riskScore,
        pickupLocation: 'Multi-Farmer Cluster',
        deliveryLocation: pool.destinationLocation,
        isConsolidated: true,
        consolidationWaypoints: logisticsPlan.routeWaypoints.map((w) => ({
          location: w.location,
          farmerName: w.name,
          qtyKg: w.pickupQtyKg || 0,
        })),
      },
      priceWaterfall: {
        buyerPricePerKg: pool.targetPriceInr,
        farmerRealizationPerKg: pool.averageFarmerPriceInr,
        logisticsCostPerKg: logisticsPlan.transportCostPerKg,
        packagingCostPerKg: 0.5,
        handlingCostPerKg: 0.3,
        platformServiceFeePerKg: 0,
      },
      paymentStatus: 'pending',
      dataStatus: 'SIMULATED',
    });
  }

  // Idempotent Shipment Creation
  let shipment = null;
  if (pool.shipment) {
    shipment = await Shipment.findById(pool.shipment);
  }

  if (!shipment) {
    const shipmentNumber = `SHIP-POOL-${Math.floor(1000 + Math.random() * 9000)}`;
    shipment = await Shipment.create({
      shipmentNumber,
      tradeType: 'POOL_AGGREGATION',
      supplyPool: pool._id,
      transaction: transaction._id,
      buyer: pool.buyer?._id || pool.buyer || req.user._id,
      commodity: pool.commodity,
      commodityName: pool.commodityName,
      totalQuantityKg: pool.collectedQuantityKg,
      vehicle: logisticsPlan.vehicle,
      pickupStops: logisticsPlan.pickupStops,
      destination: {
        buyerName: pool.buyerName || pool.buyer?.name || 'Buyer',
        location: pool.destinationLocation,
        lat: pool.destinationLat || 17.385,
        lng: pool.destinationLng || 78.487,
      },
      routeWaypoints: logisticsPlan.routeWaypoints,
      distanceKm: logisticsPlan.distanceKm,
      estimatedTravelTimeMin: logisticsPlan.estimatedTravelTimeMin,
      totalTransportCostInr: logisticsPlan.totalTransportCostInr,
      transportCostPerKg: logisticsPlan.transportCostPerKg,
      individualTransportEstimateInr: logisticsPlan.individualTransportEstimateInr,
      consolidatedSavingsInr: logisticsPlan.consolidatedSavingsInr,
      spoilageRisk: logisticsPlan.spoilageRisk,
      status: 'pickup_scheduled',
      timeline: [
        {
          status: 'planned',
          title: 'Order Confirmed by Buyer',
          description: `${pool.buyerName || 'Buyer'} confirmed the pooled supply of ${pool.collectedQuantityKg} kg ${pool.commodityName}.`,
          location: pool.destinationLocation,
        },
        {
          status: 'pickup_scheduled',
          title: 'Consolidated Vehicle Assigned',
          description: `${logisticsPlan.vehicle.modelName} assigned with ${logisticsPlan.pickupStops.length} pickup stops.`,
          location: 'Farm Pickup Cluster',
        },
      ],
      dataStatus: 'SIMULATED',
    });
  }

  // Update Pool & Transaction links
  pool.status = 'buyer_confirmed';
  pool.poolTransaction = transaction._id;
  pool.shipment = shipment._id;
  pool.confirmedAt = new Date();

  const hasConfirmedTimeline = pool.timeline.some((t) => t.status === 'buyer_confirmed');
  if (!hasConfirmedTimeline) {
    pool.timeline.push({
      status: 'buyer_confirmed',
      title: 'Buyer Confirmed Combined Order',
      description: `${pool.buyerName || 'Buyer'} confirmed the pooled order. Vehicle assigned for consolidated pickup.`,
    });
  }

  transaction.shipment = shipment._id;
  await transaction.save();
  await pool.save();

  res.json({
    dataStatus: 'SIMULATED',
    message: 'Combined Supply Pool order successfully confirmed and shipment scheduled.',
    pool,
    transaction,
    shipment,
  });
});

/**
 * Update multi-stop pickup status for an individual farmer.
 * Automatically advances to 'consolidated' when all farmer pickups are completed.
 */
export const updatePickupStopStatus = asyncHandler(async (req, res) => {
  const { stopIndex, status: newStatus } = req.body;
  const pool = await SupplyPool.findById(req.params.id);
  if (!pool) throw new AppError('Supply pool not found', 404);

  const shipment = pool.shipment ? await Shipment.findById(pool.shipment) : null;
  if (!shipment) throw new AppError('Linked shipment not found', 404);

  const idx = Number(stopIndex);
  if (idx < 0 || idx >= shipment.pickupStops.length) {
    throw new AppError('Invalid pickup stop index', 400);
  }

  const validStatuses = ['scheduled', 'pickup_in_progress', 'picked_up'];
  if (!validStatuses.includes(newStatus)) {
    throw new AppError('Invalid pickup status', 400);
  }

  // Update stop in shipment
  shipment.pickupStops[idx].status = newStatus;
  if (newStatus === 'picked_up') {
    shipment.pickupStops[idx].pickedUpAt = new Date();
  }

  // Update corresponding contributor in pool
  const farmerId = shipment.pickupStops[idx].farmer.toString();
  const contributor = pool.contributors.find((c) => c.farmer && c.farmer.toString() === farmerId);
  if (contributor) {
    contributor.pickupStatus = newStatus;
    if (newStatus === 'picked_up') {
      contributor.pickedUpAt = new Date();
    }
  }

  // Check if all stops are picked up
  const allPickedUp = shipment.pickupStops.every((s) => s.status === 'picked_up');
  const anyInProgress = shipment.pickupStops.some((s) => s.status === 'pickup_in_progress');

  if (allPickedUp) {
    shipment.status = 'consolidated';
    pool.status = 'consolidated';
    shipment.timeline.push({
      status: 'consolidated',
      title: 'Produce Consolidated',
      description: `All ${shipment.pickupStops.length} farmer pickups completed (${shipment.totalQuantityKg} kg). Vehicle is sealed and ready for dispatch.`,
      location: 'Consolidation Point',
    });
    pool.timeline.push({
      status: 'consolidated',
      title: 'Produce Consolidated',
      description: 'All farmer produce picked up and loaded into single consolidated vehicle.',
    });
  } else if (anyInProgress || newStatus === 'picked_up') {
    shipment.status = 'pickup_in_progress';
    pool.status = 'pickup_in_progress';
  }

  await shipment.save();
  await pool.save();

  // Also update transaction contributor statuses
  if (pool.poolTransaction) {
    const tx = await Transaction.findById(pool.poolTransaction);
    if (tx) {
      const txContributor = tx.poolContributors?.find((c) => c.farmer && c.farmer.toString() === farmerId);
      if (txContributor) {
        txContributor.pickupStatus = newStatus;
        if (allPickedUp) tx.status = 'consolidated';
        else if (anyInProgress || newStatus === 'picked_up') tx.status = 'pickup_in_progress';
        await tx.save();
      }
    }
  }

  res.json({
    dataStatus: 'SIMULATED',
    message: allPickedUp ? 'All farmer produce picked up! Shipment is now fully consolidated.' : `Pickup stop ${idx + 1} updated to ${newStatus}.`,
    pool,
    shipment,
  });
});

/**
 * Advance Supply Pool Shipment status along the progression lifecycle:
 * CONSOLIDATED -> IN_TRANSIT -> ARRIVING -> DELIVERED
 */
export const advancePoolShipmentStatus = asyncHandler(async (req, res) => {
  const { nextStatus } = req.body;
  const pool = await SupplyPool.findById(req.params.id);
  if (!pool) throw new AppError('Supply pool not found', 404);

  const shipment = pool.shipment ? await Shipment.findById(pool.shipment) : null;
  if (!shipment) throw new AppError('Linked shipment not found', 404);

  const allowedTransitions = {
    pickup_scheduled: ['pickup_in_progress'],
    pickup_in_progress: ['consolidated'],
    consolidated: ['in_transit'],
    in_transit: ['arriving', 'delivered'],
    arriving: ['delivered'],
    delivered: ['completed'],
  };

  const allowed = allowedTransitions[shipment.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(`Cannot advance shipment from ${shipment.status} to ${nextStatus}`, 400);
  }

  shipment.status = nextStatus;
  pool.status = nextStatus;

  let timelineTitle = 'Shipment Status Updated';
  let timelineDesc = `Shipment moved to ${nextStatus.replace('_', ' ')}.`;

  if (nextStatus === 'in_transit') {
    timelineTitle = 'Shipment In Transit';
    timelineDesc = `Consolidated vehicle departed for ${shipment.destination.buyerName} (${shipment.destination.location}).`;
  } else if (nextStatus === 'arriving') {
    timelineTitle = 'Shipment Arriving';
    timelineDesc = `Vehicle is within destination perimeter (${shipment.destination.location}).`;
  } else if (nextStatus === 'delivered') {
    timelineTitle = 'Shipment Delivered';
    timelineDesc = `Consolidated produce delivered to ${shipment.destination.buyerName}.`;
    shipment.deliveryConfirmedAt = new Date();
    pool.deliveredAt = new Date();
  }

  shipment.timeline.push({
    status: nextStatus,
    title: timelineTitle,
    description: timelineDesc,
    location: nextStatus === 'in_transit' ? 'Highway Corridor' : shipment.destination.location,
  });

  pool.timeline.push({
    status: nextStatus,
    title: timelineTitle,
    description: timelineDesc,
  });

  await shipment.save();
  await pool.save();

  if (pool.poolTransaction) {
    const tx = await Transaction.findById(pool.poolTransaction);
    if (tx) {
      tx.status = nextStatus;
      await tx.save();
    }
  }

  res.json({
    dataStatus: 'SIMULATED',
    message: `Shipment advanced to ${nextStatus.replace('_', ' ')}.`,
    pool,
    shipment,
  });
});

/**
 * Buyer confirms delivery of the pooled shipment.
 * Sets pool, shipment, and all contributor records to 'delivered' and settlement status to 'ready'.
 */
export const confirmPoolDelivery = asyncHandler(async (req, res) => {
  const pool = await SupplyPool.findById(req.params.id)
    .populate('buyer', 'name location')
    .populate('contributors.farmer', 'name location');

  if (!pool) throw new AppError('Supply pool not found', 404);

  const isBuyer = (pool.buyer?._id && pool.buyer._id.toString() === req.user._id.toString()) || pool.buyer?.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isBuyer && !isAdmin) {
    throw new AppError('Only the buyer or admin can confirm delivery receipt', 403);
  }

  const shipment = pool.shipment ? await Shipment.findById(pool.shipment) : null;
  const transaction = pool.poolTransaction ? await Transaction.findById(pool.poolTransaction) : null;

  const now = new Date();
  pool.status = 'delivered';
  pool.deliveredAt = now;

  // Mark all contributors verified and settlement ready
  pool.contributors.forEach((c) => {
    c.status = 'delivered';
    c.verifiedQuantityKg = c.quantityKg;
    c.settlementStatus = 'ready';
  });

  pool.timeline.push({
    status: 'delivered',
    title: 'Delivery Confirmed by Buyer',
    description: `${pool.buyerName || 'Buyer'} confirmed delivery of ${pool.collectedQuantityKg} kg ${pool.commodityName}. Farmer settlements ready for payout.`,
  });

  if (shipment) {
    shipment.status = 'delivered';
    shipment.deliveryConfirmedAt = now;
    shipment.timeline.push({
      status: 'delivered',
      title: 'Delivery Received & Verified',
      description: 'Quality and weight verified upon unloading.',
      location: pool.destinationLocation,
    });
    await shipment.save();
  }

  if (transaction) {
    transaction.status = 'delivered';
    if (transaction.poolContributors) {
      transaction.poolContributors.forEach((c) => {
        c.verifiedQuantityKg = c.quantityKg;
        c.settlementStatus = 'ready';
      });
    }
    await transaction.save();
  }

  await pool.save();

  res.json({
    dataStatus: 'SIMULATED',
    message: 'Delivery successfully confirmed! Farmer settlements are now ready for disbursement.',
    pool,
    shipment,
    transaction,
  });
});

/**
 * Execute simulated farmer settlement / payout for the Supply Pool.
 * Completes the pool, transaction, shipment, and calculates transparent farmer-wise payout.
 */
export const settlePoolPayment = asyncHandler(async (req, res) => {
  const { paymentMethod = 'UPI Multi-Party Disbursement' } = req.body;
  const pool = await SupplyPool.findById(req.params.id)
    .populate('buyer', 'name location email')
    .populate('contributors.farmer', 'name location email');

  if (!pool) throw new AppError('Supply pool not found', 404);

  const shipment = pool.shipment ? await Shipment.findById(pool.shipment) : null;
  const transaction = pool.poolTransaction ? await Transaction.findById(pool.poolTransaction) : null;

  const now = new Date();

  // Farmer-wise settlement calculation
  const settlements = pool.contributors.map((c) => {
    const verifiedQty = c.verifiedQuantityKg || c.quantityKg;
    const price = c.agreedPriceInr || c.offeredPriceInr || pool.targetPriceInr;
    const grossPayout = verifiedQty * price;
    const settleId = `SETTLE-MM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    c.settlementStatus = 'settled';
    c.status = 'completed';
    c.settledAt = now;

    return {
      farmerId: c.farmer?._id || c.farmer,
      farmerName: c.farmerName || c.farmer?.name || 'Farmer',
      location: c.location,
      verifiedQuantityKg: verifiedQty,
      agreedPriceInr: price,
      grossPayoutInr: grossPayout,
      settlementStatus: 'COMPLETED (SIMULATED)',
      settlementTxId: settleId,
      settledAt: now,
      note: 'Payment based on verified contribution and agreed price.',
    };
  });

  pool.status = 'completed';
  pool.completedAt = now;
  pool.timeline.push({
    status: 'completed',
    title: 'Farmer-Wise Settlement Completed',
    description: `All ${pool.contributors.length} farmers settled transparently based on verified delivered quantities.`,
  });

  if (shipment) {
    shipment.status = 'completed';
    await shipment.save();
  }

  if (transaction) {
    transaction.status = 'completed';
    transaction.paymentStatus = 'settled';
    transaction.paymentMethod = paymentMethod;
    transaction.paymentId = `POOL-PAY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    transaction.paidAt = now;
    transaction.completedAt = now;

    if (transaction.poolContributors) {
      transaction.poolContributors.forEach((c, idx) => {
        const s = settlements[idx];
        if (s) {
          c.settlementStatus = 'settled';
          c.settlementTxId = s.settlementTxId;
          c.settledAt = now;
        }
      });
    }
    await transaction.save();
  }

  await pool.save();

  res.json({
    dataStatus: 'SIMULATED',
    message: 'Supply Pool order and farmer-wise settlements completed successfully (SIMULATED PAYMENT).',
    pool,
    transaction,
    shipment,
    settlements,
  });
});

/**
 * Get Shipments (Direct Trade & Supply Pool)
 */
export const getShipments = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const filter = {};

  if (req.query.tradeType) filter.tradeType = req.query.tradeType;
  if (req.query.status) filter.status = req.query.status;

  if (role === 'buyer') {
    filter.buyer = req.user._id;
  } else if (role === 'farmer' || role === 'seller') {
    filter['pickupStops.farmer'] = req.user._id;
  }

  const shipments = await Shipment.find(filter)
    .populate('buyer', 'name location email avatarInitials')
    .populate('supplyPool')
    .populate('transaction')
    .populate('pickupStops.farmer', 'name location avatarInitials')
    .sort({ createdAt: -1 });

  res.json({ dataStatus: 'SIMULATED', badge: dataBadge(), shipments });
});

export const getShipmentById = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id)
    .populate('buyer', 'name location email avatarInitials')
    .populate('supplyPool')
    .populate('transaction')
    .populate('pickupStops.farmer', 'name location avatarInitials');

  if (!shipment) throw new AppError('Shipment not found', 404);
  res.json({ dataStatus: 'SIMULATED', shipment });
});

// ─── FAIR PRICE ───────────────────────────────────────────────────────

export const getFairPrice = asyncHandler(async (req, res) => {
  const { commodityId, qualityGrade, location, quantityKg } = req.query;
  const qty = Number(quantityKg) || 100;
  const fairPriceInfo = await computeAIFairPrice(commodityId, qualityGrade || 'A', location || 'Hyderabad', qty);

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
    // ignore
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
  const { transactionId, listingId, requirementId, quantityKg, vehicleType = 'standard', ambientTempC = 31 } = req.query;

  let pickupLat = 17.0575;
  let pickupLng = 79.2671;
  let pickupLocation = 'Nalgonda';

  let deliveryLat = 17.385;
  let deliveryLng = 78.487;
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
    }

    if (transaction.requirement) {
      deliveryLat = transaction.requirement.deliveryLat || deliveryLat;
      deliveryLng = transaction.requirement.deliveryLng || deliveryLng;
      deliveryLocation = transaction.requirement.deliveryLocation || deliveryLocation;
    } else if (transaction.buyer?.location) {
      deliveryLocation = transaction.buyer.location;
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

  const distanceKm = haversineKm(pickupLat, pickupLng, deliveryLat, deliveryLng);
  const logResult = calculateLogisticsCost({ distanceKm, quantityKg: qty, vehicleType });
  const spoilage = evaluateSpoilageRisk({
    commodityName,
    distanceKm,
    transitHours: logResult.etaHours,
    vehicleType,
    ambientTempC: Number(ambientTempC),
  });

  const routes = [
    {
      name: 'Route A — Direct Express Highway',
      distanceKm,
      transportCostInr: logResult.totalTransportCostInr,
      etaMin: logResult.etaMinutes,
      recommended: true,
      saving: 0,
      vehicleType,
    },
    {
      name: 'Route B — Regional State Highway (Low Toll)',
      distanceKm: Number((distanceKm * 1.12).toFixed(1)),
      transportCostInr: Number((logResult.totalTransportCostInr * 0.93).toFixed(2)),
      etaMin: Math.round(logResult.etaMinutes * 1.2),
      recommended: false,
      saving: Number((logResult.totalTransportCostInr * 0.07).toFixed(2)),
      vehicleType,
    },
    {
      name: 'Route C — Cold-Chain Priority Corridor',
      distanceKm: Number((distanceKm * 1.05).toFixed(1)),
      transportCostInr: Number((logResult.totalTransportCostInr * 1.25).toFixed(2)),
      etaMin: Math.round(logResult.etaMinutes * 0.9),
      recommended: vehicleType === 'refrigerated',
      saving: 0,
      vehicleType: 'refrigerated',
    },
  ];

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
      transportCostInr: logResult.totalTransportCostInr,
      transportCostPerKg: logResult.transportCostPerKg,
      etaMin: logResult.etaMinutes,
      vehicleType,
      spoilageRisk: spoilage,
      routes,
      note: 'Route calculations use simulated distance estimates. Real routing and telemetry adapters can be connected for production.',
    },
  });
});

// ─── TRANSACTIONS & OFFERS ───────────────────────────────────────────

export const createOffer = asyncHandler(async (req, res) => {
  const { listingId, requirementId, priceInr, quantityKg, message, vehicleType } = req.body;
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

  // Calculate full trade viability & logistics
  const viability = calculateTradeViability({
    listing,
    requirement,
    grossPriceInr: Number(priceInr),
    quantityKg: qty,
    vehicleType: vehicleType || 'standard',
  });

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
    transportCostInr: viability.logistics.totalTransportCostInr,
    farmerNetValueInr: Number((viability.netFarmerRealizationInr * qty).toFixed(2)),
    buyerTotalCostInr: Number((Number(priceInr) * qty).toFixed(2)),
    status: 'offer_pending',
    tradeType: 'DIRECT_TRADE',
    priceWaterfall: viability.priceWaterfall,
    logistics: {
      distanceKm: viability.distanceKm,
      estimatedTimeMin: viability.etaMinutes,
      transportCostInr: viability.logistics.totalTransportCostInr,
      transportCostPerKg: viability.logistics.transportCostPerKg,
      vehicleType: vehicleType || 'standard',
      spoilageRiskScore: viability.spoilage.spoilageRiskScore,
      expectedSpoilageLossInr: viability.priceWaterfall.spoilageRiskLossPerKg * qty,
      pickupLocation: listing.location,
      deliveryLocation: requirement?.deliveryLocation || req.user.location || 'Buyer Facility',
    },
    dataStatus: 'SIMULATED',
  });

  res.status(201).json({ dataStatus: 'SIMULATED', offer, transaction, viability });
});

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

  // Update transaction
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

  // Reserve inventory if supplier has inventory
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
  let filter = {};
  if (req.user.role === 'farmer' || req.user.role === 'seller') {
    filter = { $or: [{ farmer: req.user._id }, { 'poolContributors.farmer': req.user._id }] };
  } else if (req.user.role === 'buyer') {
    filter = { buyer: req.user._id };
  }

  const transactions = await Transaction.find(filter)
    .populate('farmer', 'name location avatarInitials')
    .populate('buyer', 'name location avatarInitials')
    .populate('commodity', 'name slug perishability')
    .populate('listing')
    .populate('requirement')
    .populate('offer')
    .populate('supplyPool')
    .populate('shipment')
    .populate('poolContributors.farmer', 'name location avatarInitials')
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

// ─── TRADE OPPORTUNITIES ──────────────────────────────────────────────

export const getTradeOpportunities = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const opportunities = [];

  if (role === 'farmer' || role === 'seller' || role === 'admin') {
    const listFilter = role === 'admin' ? { status: 'active' } : { farmer: req.user._id, status: 'active' };
    const listings = await ProduceListing.find(listFilter);
    const requirements = await BuyerRequirement.find({ status: { $in: ['active', 'partially_fulfilled'] } })
      .populate('buyer', 'name location avatarInitials buyerType');

    for (const listing of listings) {
      for (const reqDoc of requirements) {
        const result = await computeMatchScore(listing, reqDoc);
        if (result.score >= 40) {
          const fairPriceInfo = await computeAIFairPrice(listing.commodity, listing.qualityGrade, listing.location, listing.quantityKg);
          const viability = result.viability || calculateTradeViability({ listing, requirement: reqDoc });

          opportunities.push({
            type: 'SELL',
            listing,
            requirement: reqDoc,
            matchScore: result.score,
            matchReasons: result.reasons,
            fairPrice: fairPriceInfo.fairPrice,
            fairPriceRange: fairPriceInfo.range,
            buyerOffer: reqDoc.maximumPriceInr,
            transportCostPerKg: viability.logistics.transportCostPerKg,
            estimatedFarmerNet: viability.netFarmerRealizationInr,
            spoilageRiskScore: viability.spoilage.spoilageRiskScore,
            spoilagePercent: viability.spoilage.spoilagePercent,
            distanceKm: viability.distanceKm,
            tradeViabilityScore: viability.viabilityScore,
            isRecommended: viability.isRecommended,
            warningReason: viability.warningReason,
            advisoryPills: viability.advisoryPills,
            priceWaterfall: viability.priceWaterfall,
            intermediaryReduction: viability.intermediaryReduction,
            aiConfidence: fairPriceInfo.confidence,
            dealVerdict: result.score >= 75 ? 'FAIR_DEAL' : 'GOOD_FOR_FARMER',
            dataStatus: 'AI_FORECAST',
          });
        }
      }
    }

    // Sort opportunities by Net Farmer Realization and Viability
    opportunities.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0) || b.estimatedFarmerNet - a.estimatedFarmerNet);
  }

  if (role === 'buyer' || role === 'admin') {
    const reqFilter = role === 'admin' ? { status: 'active' } : { buyer: req.user._id, status: 'active' };
    const requirements = await BuyerRequirement.find(reqFilter);
    const listings = await ProduceListing.find({ status: 'active' })
      .populate('farmer', 'name location avatarInitials');

    for (const reqDoc of requirements) {
      const matched = [];
      for (const listing of listings) {
        const result = await computeMatchScore(listing, reqDoc);
        if (result.score >= 40) {
          const viability = result.viability || calculateTradeViability({ listing, requirement: reqDoc });
          matched.push({
            listing,
            score: result.score,
            reasons: result.reasons,
            netRealization: viability.netFarmerRealizationInr,
            transportCostPerKg: viability.logistics.transportCostPerKg,
            spoilageRisk: viability.spoilage.spoilageRiskScore,
            viabilityScore: viability.viabilityScore,
          });
        }
      }
      matched.sort((a, b) => b.score - a.score);
      const totalAvailable = matched.reduce((s, m) => s + (m.listing.availableQuantityKg || m.listing.quantityKg), 0);

      if (matched.length > 0) {
        const fairPriceInfo = await computeAIFairPrice(reqDoc.commodity, 'A', reqDoc.deliveryLocation, reqDoc.quantityKg);
        opportunities.push({
          type: 'BUY',
          requirement: reqDoc,
          matchedSuppliers: matched.slice(0, 5),
          totalAvailableKg: totalAvailable,
          fairPrice: fairPriceInfo.fairPrice,
          estimatedLogisticsPerKg: matched[0]?.transportCostPerKg || 1.8,
          dataStatus: 'AI_FORECAST',
        });
      }
    }
  }

  res.json({ dataStatus: 'AI_FORECAST', badge: dataBadge(), opportunities });
});
