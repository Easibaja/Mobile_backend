import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './presentation/routes/health';
import authRouter from './presentation/routes/auth';
import { errorHandler } from './shared/middleware/errorHandler';
import { logger } from './shared/middleware/logger';
import favoritesRouter from './presentation/routes/favorites';
import { setupSwagger } from './presentation/docs/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(logger);
setupSwagger(app);

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/favorites', favoritesRouter);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  const err = new Error('Route not found');
  (err as any).status = 404;
  next(err);
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});