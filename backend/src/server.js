const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/worker-productivity';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/workers', require('./routes/workerRoutes'));
app.use('/api/workstations', require('./routes/workstationRoutes'));
app.use('/api/metrics', require('./routes/metricsRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI-Powered Worker Productivity Dashboard API',
    version: '1.0.0',
    endpoints: {
      workers: '/api/workers',
      workstations: '/api/workstations',
      events: '/api/events',
      metrics: '/api/metrics'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
