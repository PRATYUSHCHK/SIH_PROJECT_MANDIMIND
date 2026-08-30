import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  for (let i = 0; i < 20; i++) {
    try {
      await mongoose.connect(config.mongoUri);
      console.log('[mandimind] MongoDB connected');
      return;
    } catch (err) {
      console.log(`[mandimind] Mongo waiting (${i + 1}/20)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Could not connect to MongoDB');
}
