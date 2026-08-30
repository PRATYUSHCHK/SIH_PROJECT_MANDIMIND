import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commodity: { type: mongoose.Schema.Types.ObjectId, ref: 'Commodity', required: true },
    quantityKg: { type: Number, required: true },
    ageDays: { type: Number, default: 1 },
    storageCondition: { type: String, default: 'ambient' },
    unitCostInr: { type: Number, required: true },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

export const Inventory = mongoose.model('Inventory', inventorySchema);
