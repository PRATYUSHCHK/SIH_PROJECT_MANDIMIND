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
    status: { type: String, enum: ['new', 'viewed', 'offered', 'expired'], default: 'new' },
    dataStatus: { type: String, default: 'AI_FORECAST' },
  },
  { timestamps: true }
);

marketplaceMatchSchema.index({ listing: 1, requirement: 1 }, { unique: true });

export const MarketplaceMatch = mongoose.model('MarketplaceMatch', marketplaceMatchSchema);
