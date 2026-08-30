import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    market: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', required: true },
    date: { type: Date, required: true },
    quantityKg: { type: Number, required: true },
    priceInr: { type: Number, required: true },
    transportCostInr: { type: Number, default: 0 },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

export const Purchase = mongoose.model('Purchase', purchaseSchema);
