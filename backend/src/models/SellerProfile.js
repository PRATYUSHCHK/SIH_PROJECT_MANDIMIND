import mongoose from 'mongoose';

const sellerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true },
    homeMarket: { type: String, default: 'Kothapet, Hyderabad' },
    budgetInr: { type: Number, default: 50000 },
    storageCapacityKg: { type: Number, default: 4000 },
    products: [{ type: String }],
  },
  { timestamps: true }
);

export const SellerProfile = mongoose.model('SellerProfile', sellerProfileSchema);
