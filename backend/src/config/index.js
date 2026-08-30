import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mandimind',
  jwtSecret: process.env.JWT_SECRET || 'mandimind-demo-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  dataMode: process.env.DATA_MODE || 'simulated',
};
