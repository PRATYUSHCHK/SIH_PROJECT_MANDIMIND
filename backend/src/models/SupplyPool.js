import mongoose from 'mongoose';

const contributorSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceListing' },
    quantityKg: { type: Number, required: true, min: 1 },
    offeredPriceInr: { type: Number, required: true, min: 0 },
    qualityGrade: { type: String, enum: ['A', 'B', 'C', 'Organic'], default: 'A' },
    location: { type: String, default: '' },
    lat: { type: Number, default: 17.385 },
    lng: { type: Number, default: 78.487 },
    status: {
      type: String,
      enum: ['committed', 'allocated', 'in_transit', 'delivered', 'withdrawn'],
      default: 'committed',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const supplyPoolSchema = new mongoose.Schema(
  {
    buyerRequirement: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerRequirement', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    commodityName: { type: String, required: true },
    qualityGrade: { type: String, enum: ['A', 'B', 'C', 'Any'], default: 'Any' },
    targetQuantityKg: { type: Number, required: true, min: 1 },
    collectedQuantityKg: { type: Number, default: 0, min: 0 },
    targetPriceInr: { type: Number, required: true, min: 0 },
    averageFarmerPriceInr: { type: Number, default: 0 },
    destinationLocation: { type: String, required: true },
    destinationLat: { type: Number, default: 17.385 },
    destinationLng: { type: Number, default: 78.487 },
    deliveryDeadline: { type: Date },
    status: {
      type: String,
      enum: ['open', 'target_reached', 'contracted', 'in_logistics', 'completed', 'cancelled'],
      default: 'open',
    },
    contributors: [contributorSchema],
    fpoCoordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    consolidatedLogistics: {
      totalDistanceKm: { type: Number, default: 0 },
      estimatedTravelTimeMin: { type: Number, default: 0 },
      totalTransportCostInr: { type: Number, default: 0 },
      transportCostPerKg: { type: Number, default: 0 },
      routeWaypoints: [
        {
          farmerName: String,
          location: String,
          lat: Number,
          lng: Number,
          pickupQtyKg: Number,
          sequence: Number,
        },
      ],
      vehicleType: {
        type: String,
        enum: ['standard', 'refrigerated', 'ventilated'],
        default: 'standard',
      },
      spoilageRisk: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'LOW',
      },
    },
    intermediaryReduction: {
      commercialLayersCount: { type: Number, default: 0 },
      serviceProviders: [{ type: String }],
      estimatedSavingsPct: { type: Number, default: 18.5 },
    },
    notes: { type: String, default: '' },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

supplyPoolSchema.index({ commodity: 1, status: 1 });
supplyPoolSchema.index({ buyerRequirement: 1 });

export const SupplyPool = mongoose.model('SupplyPool', supplyPoolSchema);
