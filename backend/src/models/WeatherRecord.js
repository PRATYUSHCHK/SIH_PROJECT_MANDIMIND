import mongoose from 'mongoose';

const weatherRecordSchema = new mongoose.Schema(
  {
    market: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', required: true },
    date: { type: Date, required: true },
    temperatureC: { type: Number, required: true },
    rainfallMm: { type: Number, required: true },
    humidityPct: { type: Number, required: true },
    dataStatus: { type: String, default: 'SIMULATED' },
  },
  { timestamps: true }
);

weatherRecordSchema.index({ market: 1, date: 1 });

export const WeatherRecord = mongoose.model('WeatherRecord', weatherRecordSchema);
