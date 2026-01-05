import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import interviewRoutes from './routes/interviews';
import managerRoutes from './routes/manager';
import emailRoutes from './routes/email';
import challengeRoutes from './routes/challenges';
import topicsRoutes from './routes/topics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/topics', topicsRoutes);

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

