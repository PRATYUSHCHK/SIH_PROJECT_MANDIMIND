import mongoose from 'mongoose';

const produceListingSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    commodityName: { type: String, required: true },
    quantityKg: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'kg' },
    qualityGrade: { type: String, enum: ['A', 'B', 'C', 'Organic'], default: 'A' },
    harvestDate: { type: Date, required: true },
    expectedPriceInr: { type: Number, required: true, min: 0 },
    minimumPriceInr: { type: Number, required: true, min: 0 },
    location: { type: String, required: true },
    lat: { type: Number, default: 17.385 },
    lng: { type: Number, default: 78.4867 },
    availableFrom: { type: Date, default: Date.now },
    deliveryPreference: { type: String, enum: ['pickup', 'delivery', 'both'], default: 'both' },
    tradePreference: { type: String, enum: ['direct', 'pool', 'any'], default: 'any' },
    packagingType: { type: String, enum: ['standard_crate', 'gunny_bag', 'ventilated_box', 'refrigerated_box'], default: 'standard_crate' },
    status: { type: String, enum: ['active', 'matched', 'sold', 'expired'], default: 'active' },
    availableQuantityKg: { type: Number, required: true },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

produceListingSchema.index({ commodity: 1, status: 1, location: 1 });
produceListingSchema.index({ farmer: 1, status: 1 });

export const ProduceListing = mongoose.model('ProduceListing', produceListingSchema);
