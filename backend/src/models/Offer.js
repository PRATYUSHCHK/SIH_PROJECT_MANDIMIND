import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'ProduceListing', required: true },
    requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerRequirement' },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priceInr: { type: Number, required: true, min: 0 },
    quantityKg: { type: Number, required: true, min: 1 },
    totalValueInr: { type: Number, required: true },
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'expired', 'cancelled'], default: 'pending' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

offerSchema.index({ listing: 1, status: 1 });
offerSchema.index({ buyer: 1, status: 1 });
offerSchema.index({ farmer: 1, status: 1 });

export const Offer = mongoose.model('Offer', offerSchema);
