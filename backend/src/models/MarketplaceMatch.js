import mongoose from 'mongoose';

const marketplaceMatchSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceListing', required: true },
    requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerRequirement', required: true },
    matchScore: { type: Number, required: true, min: 0, max: 100 },
    commodityMatch: { type: Boolean, default: false },
    qualityMatch: { type: Boolean, default: false },
    priceMatch: { type: Boolean, default: false },
    locationMatch: { type: Boolean, default: false },
    quantityMatch: { type: Boolean, default: false },
    demandMatch: { type: Boolean, default: false },
    matchReasons: [{ type: String }],
    aiFairPriceInr: { type: Number },
    aiPriceRange: { lower: Number, upper: Number },
    dealVerdict: { type: String, enum: ['FAIR_DEAL', 'GOOD_FOR_FARMER', 'GOOD_FOR_BUYER', 'OVERPRICED', 'UNDERPRICED'] },
    demandTrend: { type: String },
    
    // Trade Viability & Economics
    tradeViabilityScore: { type: Number, default: 80, min: 0, max: 100 },
    netFarmerRealizationInr: { type: Number, default: 0 },
    transportCostPerKg: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 },
    estimatedTravelTimeMin: { type: Number, default: 0 },
    packagingCostPerKg: { type: Number, default: 0 },
    handlingCostPerKg: { type: Number, default: 0 },
    
    // Spoilage Risk
    spoilageRiskScore: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    spoilageProbability: { type: Number, default: 0.05 },
    expectedSpoilageLossInr: { type: Number, default: 0 },
    recommendedVehicleType: { type: String, default: 'standard' },
    
    // Trade Advisory / Warnings
    isRecommended: { type: Boolean, default: true },
    warningReason: { type: String, default: '' },
    advisoryPills: [{ type: String }],
    
    // Price Waterfall breakdown
    priceWaterfall: {
      buyerPricePerKg: { type: Number, default: 0 },
      farmerRealizationPerKg: { type: Number, default: 0 },
      logisticsCostPerKg: { type: Number, default: 0 },
      packagingCostPerKg: { type: Number, default: 0 },
      handlingCostPerKg: { type: Number, default: 0 },
      spoilageRiskLossPerKg: { type: Number, default: 0 },
      platformServiceFeePerKg: { type: Number, default: 0 },
    },

    // Intermediary Reduction Analysis
    intermediaryReduction: {
      commercialLayersSaved: { type: Number, default: 3 },
      traditionalEstimatedMarkupPct: { type: Number, default: 22 },
      channelType: { type: String, default: 'DIRECT_TRADE' },
    },

    status: { type: String, enum: ['new', 'viewed', 'offered', 'expired'], default: 'new' },
    dataStatus: { type: String, default: 'AI_FORECAST' },
  },
  { timestamps: true }
);

marketplaceMatchSchema.index({ listing: 1, requirement: 1 }, { unique: true });

export const MarketplaceMatch = mongoose.model('MarketplaceMatch', marketplaceMatchSchema);
