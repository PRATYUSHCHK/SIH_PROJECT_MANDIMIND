import mongoose from 'mongoose';

const buyerRequirementSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    commodityName: { type: String, required: true },
    quantityKg: { type: Number, required: true, min: 1 },
    qualityGrade: { type: String, enum: ['A', 'B', 'C', 'Any'], default: 'Any' },
    maximumPriceInr: { type: Number, required: true, min: 0 },
    deliveryLocation: { type: String, required: true },
    deliveryLat: { type: Number, default: 17.385 },
    deliveryLng: { type: Number, default: 78.4867 },
    requiredByDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'partially_fulfilled', 'fulfilled', 'expired'], default: 'active' },
    fulfilledQuantityKg: { type: Number, default: 0 },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

buyerRequirementSchema.index({ commodity: 1, status: 1 });
buyerRequirementSchema.index({ buyer: 1, status: 1 });

export const BuyerRequirement = mongoose.model('BuyerRequirement', buyerRequirementSchema);
