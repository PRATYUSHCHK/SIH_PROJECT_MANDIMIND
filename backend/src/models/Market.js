import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    qualityScore: { type: Number, default: 0.8 },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

export const Market = mongoose.model('Market', marketSchema);
