import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceListing' },
    requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerRequirement' },
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    commodityName: { type: String, required: true },
    quantityKg: { type: Number, required: true, min: 1 },
    agreedPriceInr: { type: Number, required: true, min: 0 },
    totalValueInr: { type: Number, required: true, min: 0 },
    transportCostInr: { type: Number, default: 0, min: 0 },
    farmerNetValueInr: { type: Number, required: true },
    buyerTotalCostInr: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'listed',
        'matched',
        'offer_pending',
        'accepted',
        'logistics_planned',
        'in_transit',
        'delivered',
        'completed',
        'rejected',
        'cancelled',
      ],
      default: 'listed',
    },
    logistics: {
      distanceKm: { type: Number, default: 0 },
      estimatedTimeMin: { type: Number, default: 0 },
      transportCostInr: { type: Number, default: 0 },
      transportCostPerKg: { type: Number, default: 0 },
      routeRecommended: { type: String, default: '' },
      pickupLocation: { type: String, default: '' },
      deliveryLocation: { type: String, default: '' },
    },
    matchScore: { type: Number, default: 0 },
    matchReasons: [{ type: String }],
    aiConfidence: { type: Number, default: 0 },
    completedAt: { type: Date },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

transactionSchema.index({ farmer: 1, status: 1 });
transactionSchema.index({ buyer: 1, status: 1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
