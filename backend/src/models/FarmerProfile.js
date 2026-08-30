import mongoose from 'mongoose';

const farmerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    location: { type: String, required: true },
    landSizeAcres: { type: Number, default: 2 },
    soilType: { type: String, default: 'loam' },
    irrigation: { type: String, enum: ['none', 'drip', 'canal', 'borewell'], default: 'drip' },
    budgetInr: { type: Number, default: 80000 },
    season: { type: String, default: 'kharif' },
    preferredCrops: [{ type: String }],
  },
  { timestamps: true }
);

export const FarmerProfile = mongoose.model('FarmerProfile', farmerProfileSchema);
