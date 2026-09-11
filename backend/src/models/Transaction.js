import mongoose from 'mongoose';

const poolContributorTransactionSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmerName: { type: String, default: '' },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceListing' },
    quantityKg: { type: Number, required: true },
    verifiedQuantityKg: { type: Number, default: 0 },
    agreedPriceInr: { type: Number, required: true },
    grossAmountInr: { type: Number, required: true },
    pickupStatus: {
      type: String,
      enum: ['scheduled', 'in_progress', 'picked_up'],
      default: 'scheduled',
    },
    settlementStatus: {
      type: String,
      enum: ['pending', 'ready', 'settled'],
      default: 'pending',
    },
    settlementTxId: { type: String, default: '' },
    settledAt: { type: Date },
  },
  { _id: true }
);

const transactionSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, default: '' },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceListing' },
    requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerRequirement' },
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for direct trade, primary farmer
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    commodityName: { type: String, required: true },
    quantityKg: { type: Number, required: true, min: 1 },
    agreedPriceInr: { type: Number, required: true, min: 0 },
    totalValueInr: { type: Number, required: true, min: 0 },
    transportCostInr: { type: Number, default: 0, min: 0 },
    farmerNetValueInr: { type: Number, default: 0 },
    buyerTotalCostInr: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        'listed',
        'matched',
        'offer_pending',
        'accepted',
        'buyer_confirmed',
        'logistics_planned',
        'pickup_scheduled',
        'pickup_in_progress',
        'consolidated',
        'in_transit',
        'arriving',
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
      vehicleType: { type: String, enum: ['standard', 'refrigerated', 'ventilated'], default: 'standard' },
      spoilageRiskScore: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
      expectedSpoilageLossInr: { type: Number, default: 0 },
      routeRecommended: { type: String, default: '' },
      pickupLocation: { type: String, default: '' },
      deliveryLocation: { type: String, default: '' },
      isConsolidated: { type: Boolean, default: false },
      consolidationWaypoints: [{ location: String, farmerName: String, qtyKg: Number }],
    },
    isPoolOrder: { type: Boolean, default: false },
    supplyPool: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplyPool' },
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
    poolContributors: [poolContributorTransactionSchema],
    tradeType: {
      type: String,
      enum: ['DIRECT_TRADE', 'POOL_AGGREGATION', 'EXTERNAL_MARKET'],
      default: 'DIRECT_TRADE',
    },
    priceWaterfall: {
      buyerPricePerKg: { type: Number, default: 0 },
      farmerRealizationPerKg: { type: Number, default: 0 },
      logisticsCostPerKg: { type: Number, default: 0 },
      packagingCostPerKg: { type: Number, default: 0 },
      handlingCostPerKg: { type: Number, default: 0 },
      spoilageRiskLossPerKg: { type: Number, default: 0 },
      platformServiceFeePerKg: { type: Number, default: 0 },
    },
    matchScore: { type: Number, default: 0 },
    matchReasons: [{ type: String }],
    aiConfidence: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'settled', 'failed'],
      default: 'pending',
    },
    paymentMethod: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    paidAt: { type: Date },
    completedAt: { type: Date },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

transactionSchema.index({ farmer: 1, status: 1 });
transactionSchema.index({ buyer: 1, status: 1 });
transactionSchema.index({ supplyPool: 1 });
transactionSchema.index({ 'poolContributors.farmer': 1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
