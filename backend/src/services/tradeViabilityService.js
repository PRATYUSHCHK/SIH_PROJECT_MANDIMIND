/**
 * Centralized Trade Viability, Perishability, Spoilage Risk, and Logistics Optimization Service
 * MandiMind Agricultural Intelligence & Direct Trade Coordination Engine
 */

export const COMMODITY_PROFILES = {
  tomato: {
    slug: 'tomato',
    name: 'Tomato',
    perishability: 'HIGH',
    perishabilityLevel: 3, // 1: LOW, 2: MEDIUM, 3: HIGH, 4: VERY HIGH
    maxSafeTransitHoursStandard: 12,
    maxSafeTransitHoursRefrigerated: 48,
    optimalTempC: { min: 12, max: 18 },
    criticalTempC: 32,
    baseDecayRatePerHour: 0.008,
    standardPackagingCostPerKg: 0.8,
    handlingCostPerKg: 0.4,
    recommendedVehicle: 'ventilated',
    maxViableRadiusKm: 350,
  },
  spinach: {
    slug: 'spinach',
    name: 'Spinach',
    perishability: 'VERY HIGH',
    perishabilityLevel: 4,
    maxSafeTransitHoursStandard: 6,
    maxSafeTransitHoursRefrigerated: 24,
    optimalTempC: { min: 4, max: 10 },
    criticalTempC: 28,
    baseDecayRatePerHour: 0.02,
    standardPackagingCostPerKg: 1.2,
    handlingCostPerKg: 0.5,
    recommendedVehicle: 'refrigerated',
    maxViableRadiusKm: 150,
  },
  chilli: {
    slug: 'chilli',
    name: 'Chilli',
    perishability: 'MEDIUM',
    perishabilityLevel: 2,
    maxSafeTransitHoursStandard: 24,
    maxSafeTransitHoursRefrigerated: 72,
    optimalTempC: { min: 10, max: 16 },
    criticalTempC: 35,
    baseDecayRatePerHour: 0.004,
    standardPackagingCostPerKg: 0.6,
    handlingCostPerKg: 0.3,
    recommendedVehicle: 'standard',
    maxViableRadiusKm: 600,
  },
  onion: {
    slug: 'onion',
    name: 'Onion',
    perishability: 'MEDIUM',
    perishabilityLevel: 2,
    maxSafeTransitHoursStandard: 48,
    maxSafeTransitHoursRefrigerated: 120,
    optimalTempC: { min: 15, max: 25 },
    criticalTempC: 38,
    baseDecayRatePerHour: 0.002,
    standardPackagingCostPerKg: 0.4,
    handlingCostPerKg: 0.3,
    recommendedVehicle: 'standard',
    maxViableRadiusKm: 800,
  },
  potato: {
    slug: 'potato',
    name: 'Potato',
    perishability: 'LOW',
    perishabilityLevel: 1,
    maxSafeTransitHoursStandard: 72,
    maxSafeTransitHoursRefrigerated: 168,
    optimalTempC: { min: 12, max: 22 },
    criticalTempC: 40,
    baseDecayRatePerHour: 0.001,
    standardPackagingCostPerKg: 0.3,
    handlingCostPerKg: 0.25,
    recommendedVehicle: 'standard',
    maxViableRadiusKm: 1200,
  },
};

const DEFAULT_PROFILE = {
  slug: 'default',
  name: 'Produce',
  perishability: 'MEDIUM',
  perishabilityLevel: 2,
  maxSafeTransitHoursStandard: 18,
  maxSafeTransitHoursRefrigerated: 48,
  optimalTempC: { min: 12, max: 22 },
  criticalTempC: 32,
  baseDecayRatePerHour: 0.005,
  standardPackagingCostPerKg: 0.5,
  handlingCostPerKg: 0.35,
  recommendedVehicle: 'standard',
  maxViableRadiusKm: 400,
};

export function getCommodityProfile(commoditySlugOrName) {
  if (!commoditySlugOrName) return DEFAULT_PROFILE;
  const key = String(commoditySlugOrName).toLowerCase().trim();
  return COMMODITY_PROFILES[key] || Object.values(COMMODITY_PROFILES).find((p) => p.name.toLowerCase() === key) || DEFAULT_PROFILE;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c * 1.18).toFixed(1)); // 1.18 road curvature factor
}

export function calculateLogisticsCost({ distanceKm, quantityKg, vehicleType = 'standard' }) {
  const qty = Math.max(1, Number(quantityKg) || 100);
  const dist = Math.max(1, Number(distanceKm) || 10);

  let baseRatePerKm = 12; // Standard base ₹12/km
  let handlingPerKg = 0.6; // Handling rate

  if (vehicleType === 'refrigerated') {
    baseRatePerKm = 18; // Cold chain base ₹18/km
    handlingPerKg = 1.0;
  } else if (vehicleType === 'ventilated') {
    baseRatePerKm = 14;
    handlingPerKg = 0.75;
  }

  // Multi-tier economy of scale for transport
  const volumeDiscount = qty >= 1000 ? 0.85 : qty >= 500 ? 0.92 : 1.0;
  const totalTransportCost = Number(((dist * baseRatePerKm + qty * handlingPerKg) * volumeDiscount).toFixed(2));
  const transportCostPerKg = Number((totalTransportCost / qty).toFixed(2));
  const etaMinutes = Math.round((dist / (vehicleType === 'refrigerated' ? 45 : 40)) * 60);

  return {
    distanceKm: dist,
    totalTransportCostInr: totalTransportCost,
    transportCostPerKg,
    etaMinutes,
    etaHours: Number((etaMinutes / 60).toFixed(1)),
    vehicleType,
  };
}

export function evaluateSpoilageRisk({
  commodityName,
  distanceKm,
  transitHours,
  vehicleType = 'standard',
  ambientTempC = 31,
  harvestAgeDays = 1,
}) {
  const profile = getCommodityProfile(commodityName);
  const hours = Number(transitHours) || (distanceKm / 40);
  const isRefrigerated = vehicleType === 'refrigerated';

  const maxSafeHours = isRefrigerated
    ? profile.maxSafeTransitHoursRefrigerated
    : profile.maxSafeTransitHoursStandard;

  // Temperature acceleration penalty
  const effectiveTemp = isRefrigerated ? Math.min(ambientTempC, 10) : ambientTempC;
  const tempExcess = Math.max(0, effectiveTemp - profile.optimalTempC.max);
  const tempMultiplier = 1 + (tempExcess * 0.04);

  // Harvest age penalty (freshness decay)
  const ageMultiplier = 1 + (Math.max(0, harvestAgeDays - 1) * 0.25);

  // Base spoilage probability calculation
  const transitRatio = hours / maxSafeHours;
  let prob = profile.baseDecayRatePerHour * hours * tempMultiplier * ageMultiplier;

  if (!isRefrigerated && hours > profile.maxSafeTransitHoursStandard) {
    prob += (hours - profile.maxSafeTransitHoursStandard) * 0.035;
  }

  prob = Math.min(0.85, Math.max(0.02, Number(prob.toFixed(3))));

  let riskScore = 'LOW';
  if (prob > 0.20 || transitRatio > 1.2) {
    riskScore = 'HIGH';
  } else if (prob > 0.09 || transitRatio > 0.8) {
    riskScore = 'MEDIUM';
  }

  return {
    spoilageRiskScore: riskScore,
    spoilageProbability: prob,
    spoilagePercent: Number((prob * 100).toFixed(1)),
    maxSafeTransitHours: maxSafeHours,
    isExceedingSafeTransit: hours > maxSafeHours,
    recommendedVehicleType: profile.recommendedVehicle,
    perishability: profile.perishability,
  };
}

export function calculateTradeViability({
  listing,
  requirement,
  grossPriceInr,
  quantityKg,
  vehicleType = 'standard',
  ambientTempC = 31,
}) {
  const qty = Number(quantityKg) || Number(listing?.availableQuantityKg || listing?.quantityKg || requirement?.quantityKg || 100);
  const grossPrice = Number(grossPriceInr || requirement?.maximumPriceInr || listing?.expectedPriceInr || 28);
  const commodityName = listing?.commodityName || requirement?.commodityName || 'Produce';
  const profile = getCommodityProfile(commodityName);

  const pickupLat = listing?.lat || 17.0575;
  const pickupLng = listing?.lng || 79.2671;
  const deliveryLat = requirement?.deliveryLat || 17.385;
  const deliveryLng = requirement?.deliveryLng || 78.487;

  const distanceKm = haversineKm(pickupLat, pickupLng, deliveryLat, deliveryLng);
  const logistics = calculateLogisticsCost({ distanceKm, quantityKg: qty, vehicleType });
  const harvestAgeDays = listing?.harvestDate ? Math.max(1, Math.round((new Date() - new Date(listing.harvestDate)) / (86400000))) : 1;

  const spoilage = evaluateSpoilageRisk({
    commodityName,
    distanceKm,
    transitHours: logistics.etaHours,
    vehicleType,
    ambientTempC,
    harvestAgeDays,
  });

  const packagingCostPerKg = profile.standardPackagingCostPerKg;
  const handlingCostPerKg = profile.handlingCostPerKg;
  const expectedSpoilageLossPerKg = Number((grossPrice * spoilage.spoilageProbability).toFixed(2));
  const platformServiceFeePerKg = 0.50; // Transparent MandiMind coordination fee ₹0.50/kg

  // Core NET FARMER REALIZATION Formula
  const netFarmerRealizationInr = Number(
    (grossPrice - logistics.transportCostPerKg - packagingCostPerKg - handlingCostPerKg - expectedSpoilageLossPerKg - platformServiceFeePerKg).toFixed(2)
  );

  // Price Waterfall
  const priceWaterfall = {
    buyerPricePerKg: grossPrice,
    farmerRealizationPerKg: Math.max(0, netFarmerRealizationInr),
    logisticsCostPerKg: logistics.transportCostPerKg,
    packagingCostPerKg,
    handlingCostPerKg,
    spoilageRiskLossPerKg: expectedSpoilageLossPerKg,
    platformServiceFeePerKg,
    totalOrderValueInr: Number((grossPrice * qty).toFixed(2)),
    totalFarmerNetInr: Number((Math.max(0, netFarmerRealizationInr) * qty).toFixed(2)),
    totalLogisticsInr: logistics.totalTransportCostInr,
  };

  // Viability Score Computation (0-100)
  let viabilityScore = 50;

  // Price margin contribution (+/- 30 pts)
  const marginPct = (netFarmerRealizationInr / grossPrice) * 100;
  if (marginPct >= 80) viabilityScore += 30;
  else if (marginPct >= 70) viabilityScore += 20;
  else if (marginPct >= 55) viabilityScore += 10;
  else if (marginPct >= 40) viabilityScore -= 10;
  else viabilityScore -= 30;

  // Distance & Logistics contribution (+/- 15 pts)
  if (distanceKm <= profile.maxViableRadiusKm * 0.4) viabilityScore += 15;
  else if (distanceKm <= profile.maxViableRadiusKm) viabilityScore += 5;
  else viabilityScore -= 15;

  // Spoilage penalty (+/- 15 pts)
  if (spoilage.spoilageRiskScore === 'LOW') viabilityScore += 15;
  else if (spoilage.spoilageRiskScore === 'MEDIUM') viabilityScore += 0;
  else viabilityScore -= 20;

  viabilityScore = Math.max(10, Math.min(98, Math.round(viabilityScore)));

  // "DO NOT SELL" / "TRADE NOT RECOMMENDED" Advisory Logic
  let isRecommended = true;
  let warningReason = '';
  const advisoryPills = [];

  if (spoilage.spoilageRiskScore === 'HIGH' && vehicleType === 'standard' && profile.perishabilityLevel >= 3) {
    isRecommended = false;
    warningReason = `High spoilage risk (${spoilage.spoilagePercent}%) over ${distanceKm} km. Temperature-controlled transport or closer buyer recommended.`;
    advisoryPills.push('⚠️ Elevated Spoilage Risk');
  } else if (netFarmerRealizationInr < grossPrice * 0.55) {
    isRecommended = false;
    warningReason = `High logistics (₹${logistics.transportCostPerKg}/kg) and costs reduce net farmer realization to ₹${netFarmerRealizationInr}/kg (${Math.round(marginPct)}% of buyer price).`;
    advisoryPills.push('⚠️ Low Net Realization');
  } else if (distanceKm > profile.maxViableRadiusKm && vehicleType === 'standard') {
    isRecommended = false;
    warningReason = `Distance of ${distanceKm} km exceeds recommended transit radius of ${profile.maxViableRadiusKm} km for ${commodityName}.`;
    advisoryPills.push('⚠️ Exceeds Optimal Radius');
  } else {
    advisoryPills.push('✓ High Economic Viability');
    if (distanceKm < 100) advisoryPills.push('✓ Local Direct Delivery');
    if (spoilage.spoilageRiskScore === 'LOW') advisoryPills.push('✓ Low Spoilage Risk');
  }

  // Intermediary Reduction Calculation
  const traditionalLayers = ['Commission Agent (6%)', 'Wholesaler (10%)', 'Sub-distributor (8%)', 'Local Retailer (12%)'];
  const intermediaryReduction = {
    commercialLayersSaved: 3,
    traditionalEstimatedMarkupPct: 24.5,
    channelType: 'DIRECT_TRADE',
    traditionalEstimatedFinalPrice: Number((grossPrice * 1.25).toFixed(2)),
    consumerEstimatedSavingsPct: 18.5,
    note: 'Estimated/illustrative channel comparison against traditional multi-tier trading layers.',
  };

  return {
    viabilityScore,
    isRecommended,
    warningReason,
    advisoryPills,
    netFarmerRealizationInr,
    grossPriceInr: grossPrice,
    distanceKm,
    etaMinutes: logistics.etaMinutes,
    etaHours: logistics.etaHours,
    logistics,
    spoilage,
    priceWaterfall,
    intermediaryReduction,
    profile,
    dataStatus: 'AI_FORECAST',
  };
}

export function findConsolidationOpportunities(listings, targetRequirement) {
  if (!listings || listings.length <= 1) return [];
  const reqLat = targetRequirement.deliveryLat || 17.385;
  const reqLng = targetRequirement.deliveryLng || 78.487;

  // Filter listings with same commodity and within 60km cluster
  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < listings.length; i++) {
    if (visited.has(listings[i]._id.toString())) continue;
    const l1 = listings[i];
    const group = [l1];
    visited.add(l1._id.toString());

    for (let j = i + 1; j < listings.length; j++) {
      const l2 = listings[j];
      if (visited.has(l2._id.toString())) continue;
      if (l1.commodityName.toLowerCase() === l2.commodityName.toLowerCase()) {
        const clusterDist = haversineKm(l1.lat || 17.05, l1.lng || 79.26, l2.lat || 17.05, l2.lng || 79.26);
        if (clusterDist <= 75) {
          group.push(l2);
          visited.add(l2._id.toString());
        }
      }
    }

    if (group.length > 1) {
      const totalClusterQty = group.reduce((sum, item) => sum + (item.availableQuantityKg || item.quantityKg), 0);
      const avgLat = group.reduce((s, g) => s + (g.lat || 17.05), 0) / group.length;
      const avgLng = group.reduce((s, g) => s + (g.lng || 79.26), 0) / group.length;
      const sharedDistKm = haversineKm(avgLat, avgLng, reqLat, reqLng);

      const individualCostTotal = group.reduce((s, g) => {
        const dist = haversineKm(g.lat || 17.05, g.lng || 79.26, reqLat, reqLng);
        return s + calculateLogisticsCost({ distanceKm: dist, quantityKg: g.availableQuantityKg || g.quantityKg }).totalTransportCostInr;
      }, 0);

      const consolidatedCost = calculateLogisticsCost({ distanceKm: sharedDistKm + 25, quantityKg: totalClusterQty }).totalTransportCostInr;
      const savingsInr = Math.max(0, Number((individualCostTotal - consolidatedCost).toFixed(2)));
      const savingsPct = individualCostTotal > 0 ? Number(((savingsInr / individualCostTotal) * 100).toFixed(1)) : 0;

      clusters.push({
        commodityName: l1.commodityName,
        participatingFarmersCount: group.length,
        totalQuantityKg: totalClusterQty,
        farmers: group.map((g, idx) => ({
          farmerId: g.farmer?._id || g.farmer,
          farmerName: g.farmer?.name || `Farmer ${idx + 1}`,
          location: g.location,
          quantityKg: g.availableQuantityKg || g.quantityKg,
          lat: g.lat,
          lng: g.lng,
        })),
        sharedDistanceKm: sharedDistKm,
        consolidatedTransportCostInr: consolidatedCost,
        individualCostTotalInr: individualCostTotal,
        estimatedSavingsInr: savingsInr,
        estimatedSavingsPct: savingsPct,
        recommendation: `Consolidate ${group.length} farmer pickups into 1 optimized truck. Saves ₹${savingsInr} (${savingsPct}% transport cost).`,
      });
    }
  }

  return clusters;
}

/**
 * Calculates a comprehensive multi-stop consolidated logistics plan for a Supply Pool.
 */
export function calculateMultiStopLogisticsPlan({
  contributors = [],
  destination = { lat: 17.385, lng: 78.487, location: 'Hyderabad', buyerName: 'Buyer' },
  commodityName = 'Potato',
  preferredVehicleType = 'standard',
  ambientTempC = 30,
}) {
  if (!contributors || contributors.length === 0) {
    return {
      distanceKm: 0,
      totalTransportCostInr: 0,
      transportCostPerKg: 0,
      estimatedTravelTimeMin: 0,
      individualTransportEstimateInr: 0,
      consolidatedSavingsInr: 0,
      pickupStops: [],
      routeWaypoints: [],
      vehicleType: preferredVehicleType,
      spoilageRisk: { riskScore: 'LOW', spoilagePercent: 0.5, expectedLossInr: 0, advisoryNote: '' },
    };
  }

  const profile = getCommodityProfile(commodityName);
  const totalQty = contributors.reduce((s, c) => s + (Number(c.quantityKg) || 0), 0);

  // Vehicle recommendation based on commodity perishability and quantity
  let recommendedVehicle = preferredVehicleType;
  if (profile.perishabilityLevel >= 3 && preferredVehicleType === 'standard') {
    recommendedVehicle = profile.recommendedVehicle || 'ventilated';
  }

  let capacity = 1200;
  let modelName = 'Standard Cargo Truck (1.2 Ton)';
  if (totalQty > 1000 && totalQty <= 2500) {
    capacity = 3000;
    modelName = 'Medium Commercial Vehicle (3 Ton)';
  } else if (totalQty > 2500) {
    capacity = 5000;
    modelName = 'Heavy Cargo Carrier (5 Ton)';
  }

  if (recommendedVehicle === 'refrigerated') {
    modelName = `Cold-Chain Reefer (${capacity / 1000} Ton)`;
  } else if (recommendedVehicle === 'ventilated') {
    modelName = `Ventilated Agrilink Van (${capacity / 1000} Ton)`;
  }

  // Nearest neighbor route sequencing starting from farthest farmer or geographic cluster
  const stops = contributors.map((c, idx) => ({
    farmer: c.farmer?._id || c.farmer,
    farmerName: c.farmerName || c.farmer?.name || c.location || `Farmer ${idx + 1}`,
    location: c.location || 'Farm Location',
    lat: Number(c.lat) || 17.0575,
    lng: Number(c.lng) || 79.2671,
    pickupQtyKg: Number(c.quantityKg) || 100,
    offeredPriceInr: Number(c.offeredPriceInr) || 28,
    status: c.pickupStatus || 'scheduled',
    scheduledTime: new Date(Date.now() + (idx + 1) * 3600 * 1000),
  }));

  // Simple sequencing: sort by distance from destination descending (farthest first)
  stops.sort((a, b) => {
    const distA = haversineKm(a.lat, a.lng, destination.lat, destination.lng);
    const distB = haversineKm(b.lat, b.lng, destination.lat, destination.lng);
    return distB - distA;
  });

  // Reassign sequence numbers
  const sequencedStops = stops.map((s, idx) => ({
    ...s,
    sequence: idx + 1,
  }));

  // Calculate route legs
  let totalDistance = 0;
  const routeWaypoints = [];

  for (let i = 0; i < sequencedStops.length; i++) {
    const current = sequencedStops[i];
    routeWaypoints.push({
      name: `Pickup: ${current.farmerName}`,
      location: current.location,
      lat: current.lat,
      lng: current.lng,
      pickupQtyKg: current.pickupQtyKg,
      type: 'pickup',
    });

    if (i < sequencedStops.length - 1) {
      const next = sequencedStops[i + 1];
      const legDist = haversineKm(current.lat, current.lng, next.lat, next.lng);
      totalDistance += legDist;
    }
  }

  // Last leg: last pickup to destination
  const lastStop = sequencedStops[sequencedStops.length - 1];
  const finalLegDist = haversineKm(lastStop.lat, lastStop.lng, destination.lat, destination.lng);
  totalDistance += finalLegDist;
  totalDistance = Math.max(15, Number(totalDistance.toFixed(1)));

  routeWaypoints.push({
    name: `Destination: ${destination.buyerName || 'Buyer Location'}`,
    location: destination.location || 'Destination',
    lat: destination.lat,
    lng: destination.lng,
    type: 'destination',
  });

  // Calculate individual shipping costs (if each farmer hired their own mini-van/vehicle)
  const individualTransportEstimate = sequencedStops.reduce((sum, s) => {
    const dist = haversineKm(s.lat, s.lng, destination.lat, destination.lng);
    const cost = calculateLogisticsCost({
      distanceKm: dist,
      quantityKg: s.pickupQtyKg,
      vehicleType: recommendedVehicle,
    }).totalTransportCostInr;
    return sum + cost;
  }, 0);

  // Consolidated logistics calculation
  const consolidatedLogistics = calculateLogisticsCost({
    distanceKm: totalDistance,
    quantityKg: totalQty,
    vehicleType: recommendedVehicle,
  });

  // Dwell time: 25 mins per pickup stop
  const dwellTimeMin = (sequencedStops.length - 1) * 25;
  const totalTravelTimeMin = consolidatedLogistics.etaMinutes + dwellTimeMin;
  const totalTravelHours = Number((totalTravelTimeMin / 60).toFixed(1));

  const totalCost = consolidatedLogistics.totalTransportCostInr;
  const costPerKg = Number((totalCost / Math.max(1, totalQty)).toFixed(2));
  const savingsInr = Math.max(0, Number((individualTransportEstimate - totalCost).toFixed(2)));

  // Spoilage risk analysis with multi-stop transit
  const spoilage = evaluateSpoilageRisk({
    commodityName,
    distanceKm: totalDistance,
    transitTimeHours: totalTravelHours,
    vehicleType: recommendedVehicle,
    ambientTempC,
    quantityKg: totalQty,
  });

  let spoilageAdvisory = '';
  if (profile.perishabilityLevel >= 3 && sequencedStops.length > 1) {
    spoilageAdvisory = `Because this crop is ${profile.perishability.toLowerCase()} perishability and the shipment has ${sequencedStops.length} pickup stops, delivery should be planned carefully to reduce spoilage risk.`;
  } else if (recommendedVehicle === 'refrigerated') {
    spoilageAdvisory = 'Refrigerated cold-chain transport can reduce spoilage risk during multi-stop consolidation.';
  } else {
    spoilageAdvisory = 'Produce transit time is within optimal freshness threshold for consolidated transport.';
  }

  return {
    distanceKm: totalDistance,
    estimatedTravelTimeMin: totalTravelTimeMin,
    estimatedTravelHours: totalTravelHours,
    totalTransportCostInr: totalCost,
    transportCostPerKg: costPerKg,
    individualTransportEstimateInr: Number(individualTransportEstimate.toFixed(2)),
    consolidatedSavingsInr: savingsInr,
    vehicle: {
      vehicleType: recommendedVehicle,
      modelName,
      capacityKg: capacity,
      currentLoadKg: totalQty,
      driverName: 'Ramesh Kumar (Transporter)',
      contactPhone: '+91 98765 43210',
      registrationNumber: 'TS 08 UB 4521',
    },
    pickupStops: sequencedStops,
    routeWaypoints,
    spoilageRisk: {
      riskScore: spoilage.spoilageRiskScore,
      spoilagePercent: spoilage.spoilagePercent,
      expectedLossInr: Number(((spoilage.spoilagePercent / 100) * totalQty * (profile.typicalPriceInr || 28)).toFixed(2)),
      advisoryNote: spoilageAdvisory,
    },
  };
}
