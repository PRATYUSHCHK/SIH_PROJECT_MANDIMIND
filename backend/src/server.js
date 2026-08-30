import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { connectDb } from './config/db.js';
import { seed } from './seed/seed.js';
import { authRouter } from './routes/auth.js';
import { apiRouter } from './routes/api.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/error.js';
import { sourceCatalog } from './services/adapters/index.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    product: 'MandiMind',
    dataMode: config.dataMode,
    sources: sourceCatalog(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);
app.use(errorHandler);

await connectDb();
await seed();

app.listen(config.port, () => {
  console.log(`[mandimind] API on :${config.port}`);
});
