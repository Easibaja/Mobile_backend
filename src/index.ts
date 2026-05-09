import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './presentation/routes/health';
import authRouter from './presentation/routes/auth';
import { errorHandler } from './shared/middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
