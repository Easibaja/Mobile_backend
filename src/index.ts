import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './shared/middleware/errorHandler';
import healthRouter from './presentation/routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', healthRouter);

app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
