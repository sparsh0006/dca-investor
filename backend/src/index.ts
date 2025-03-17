import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dcaRoutes from './routes/dca';
import { logger } from './utils/logger';
import dcaWalletRoutes from './routes/DcaWalletRoutes';
import cors from 'cors'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dca-service';

app.use(express.json());
app.use(cors())

// app.use('/api/dca', dcaRoutes);
app.use('/api/dca', dcaWalletRoutes);

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }); 