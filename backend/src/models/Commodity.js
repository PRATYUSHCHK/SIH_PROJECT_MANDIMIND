import mongoose from 'mongoose';

const commoditySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    unit: { type: String, default: 'kg' },
    perishability: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    shelfLifeDays: { type: Number, default: 7 },
    typicalPriceInr: { type: Number, required: true },
    waterNeed: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    seasonality: [{ type: String }],
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

export const Commodity = mongoose.model('Commodity', commoditySchema);
