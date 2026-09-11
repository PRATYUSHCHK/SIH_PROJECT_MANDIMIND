import mongoose from 'mongoose';

const contributorSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmerName: { type: String, default: '' },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceListing' },
    quantityKg: { type: Number, required: true, min: 1 },
    verifiedQuantityKg: { type: Number, default: 0 },
    offeredPriceInr: { type: Number, required: true, min: 0 },
    agreedPriceInr: { type: Number, default: 0 },
    grossAmountInr: { type: Number, default: 0 },
    qualityGrade: { type: String, enum: ['A', 'B', 'C', 'Organic', 'Any'], default: 'A' },
    location: { type: String, default: '' },
    lat: { type: Number, default: 17.0575 },
    lng: { type: Number, default: 79.2671 },
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
    status: {
      type: String,
      enum: ['committed', 'allocated', 'in_transit', 'delivered', 'completed', 'withdrawn'],
      default: 'committed',
    },
    joinedAt: { type: Date, default: Date.now },
    pickedUpAt: { type: Date },
    settledAt: { type: Date },
  },
  { _id: true }
);

const supplyPoolSchema = new mongoose.Schema(
  {
    poolCode: { type: String, default: '' },
    buyerRequirement: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerRequirement', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerName: { type: String, default: '' },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    commodityName: { type: String, required: true },
    qualityGrade: { type: String, enum: ['A', 'B', 'C', 'Organic', 'Any'], default: 'Any' },
    targetQuantityKg: { type: Number, required: true, min: 1 },
    collectedQuantityKg: { type: Number, default: 0, min: 0 },
    targetPriceInr: { type: Number, required: true, min: 0 },
    averageFarmerPriceInr: { type: Number, default: 0 },
    totalPoolValueInr: { type: Number, default: 0 },
    destinationLocation: { type: String, required: true },
    destinationLat: { type: Number, default: 17.385 },
    destinationLng: { type: Number, default: 78.487 },
    deliveryDeadline: { type: Date },
    status: {
      type: String,
      enum: [
        'open',
        'target_reached',
        'buyer_confirmation_pending',
        'buyer_confirmed',
        'logistics_planned',
        'pickup_scheduled',
        'pickup_in_progress',
        'consolidated',
        'in_transit',
        'arriving',
        'delivered',
        'completed',
        'cancelled',
      ],
      default: 'open',
    },
    contributors: [contributorSchema],
    poolTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
    fpoCoordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    consolidatedLogistics: {
      totalDistanceKm: { type: Number, default: 0 },
      estimatedTravelTimeMin: { type: Number, default: 0 },
      totalTransportCostInr: { type: Number, default: 0 },
      transportCostPerKg: { type: Number, default: 0 },
      individualTransportEstimateInr: { type: Number, default: 0 },
      consolidatedSavingsInr: { type: Number, default: 0 },
      routeWaypoints: [
        {
          farmerName: String,
          farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          location: String,
          lat: Number,
          lng: Number,
          pickupQtyKg: Number,
          sequence: Number,
          status: { type: String, default: 'scheduled' },
        },
      ],
      vehicleType: {
        type: String,
        enum: ['standard', 'refrigerated', 'ventilated'],
        default: 'standard',
      },
      vehicleCapacityKg: { type: Number, default: 1200 },
      spoilageRisk: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'LOW',
      },
      spoilageAdvisory: { type: String, default: '' },
    },
    intermediaryReduction: {
      commercialLayersCount: { type: Number, default: 0 },
      serviceProviders: [{ type: String }],
      estimatedSavingsPct: { type: Number, default: 18.5 },
    },
    timeline: [
      {
        status: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    confirmedAt: { type: Date },
    deliveredAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String, default: '' },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

supplyPoolSchema.index({ commodity: 1, status: 1 });
supplyPoolSchema.index({ buyerRequirement: 1 });
supplyPoolSchema.index({ buyer: 1 });
supplyPoolSchema.index({ 'contributors.farmer': 1 });

export const SupplyPool = mongoose.model('SupplyPool', supplyPoolSchema);
