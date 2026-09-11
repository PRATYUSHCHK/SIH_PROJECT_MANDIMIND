import mongoose from 'mongoose';

const pickupStopSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmerName: { type: String, required: true },
    location: { type: String, required: true },
    lat: { type: Number, default: 17.0575 },
    lng: { type: Number, default: 79.2671 },
    pickupQtyKg: { type: Number, required: true, min: 1 },
    sequence: { type: Number, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'pickup_in_progress', 'picked_up'],
      default: 'scheduled',
    },
    scheduledTime: { type: Date },
    pickedUpAt: { type: Date },
    notes: { type: String, default: '' },
  },
  { _id: true }
);

const timelineEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    location: { type: String, default: '' },
  },
  { _id: true }
);

const shipmentSchema = new mongoose.Schema(
  {
    shipmentNumber: { type: String, required: true, unique: true },
    tradeType: {
      type: String,
      enum: ['DIRECT_TRADE', 'POOL_AGGREGATION'],
      default: 'POOL_AGGREGATION',
    },
    supplyPool: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplyPool' },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    commodityName: { type: String, required: true },
    totalQuantityKg: { type: Number, required: true, min: 1 },
    vehicle: {
      vehicleType: {
        type: String,
        enum: ['standard', 'refrigerated', 'ventilated'],
        default: 'standard',
      },
      modelName: { type: String, default: 'Standard Cargo Truck' },
      capacityKg: { type: Number, default: 1200 },
      currentLoadKg: { type: Number, default: 1000 },
      driverName: { type: String, default: 'Ramesh Kumar (Transporter)' },
      contactPhone: { type: String, default: '+91 98765 43210' },
      registrationNumber: { type: String, default: 'TS 08 UB 4521' },
    },
    pickupStops: [pickupStopSchema],
    destination: {
      buyerName: { type: String, required: true },
      location: { type: String, required: true },
      lat: { type: Number, default: 17.385 },
      lng: { type: Number, default: 78.487 },
    },
    routeWaypoints: [
      {
        name: String,
        location: String,
        lat: Number,
        lng: Number,
        type: { type: String, enum: ['pickup', 'transit', 'destination'], default: 'pickup' },
      },
    ],
    distanceKm: { type: Number, default: 0 },
    estimatedTravelTimeMin: { type: Number, default: 0 },
    totalTransportCostInr: { type: Number, default: 0 },
    transportCostPerKg: { type: Number, default: 0 },
    individualTransportEstimateInr: { type: Number, default: 0 },
    consolidatedSavingsInr: { type: Number, default: 0 },
    spoilageRisk: {
      riskScore: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
      spoilagePercent: { type: Number, default: 0.8 },
      expectedLossInr: { type: Number, default: 0 },
      advisoryNote: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: [
        'planned',
        'pickup_scheduled',
        'pickup_in_progress',
        'consolidated',
        'in_transit',
        'arriving',
        'delivered',
        'completed',
        'cancelled',
      ],
      default: 'pickup_scheduled',
    },
    timeline: [timelineEventSchema],
    deliveryConfirmedAt: { type: Date },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

shipmentSchema.index({ supplyPool: 1 });
shipmentSchema.index({ transaction: 1 });
shipmentSchema.index({ buyer: 1, status: 1 });

export const Shipment = mongoose.model('Shipment', shipmentSchema);
