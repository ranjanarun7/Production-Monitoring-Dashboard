const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// CORS Configuration - Dynamic to handle Vercel URL changes
const corsOptions = {
  origin: function (origin, callback) {
    const allowedPatterns = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      /vercel\.app$/,  // Allow any vercel.app subdomain
      /onrender\.com$/ // Allow any onrender.com subdomain
    ];
    
    // Allow requests with no origin (like curl, mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedPatterns.some(pattern => {
      if (typeof pattern === 'string') return origin === pattern;
      return pattern.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Middleware
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
app.use('/api/events', require('./src/routes/eventRoutes'));
app.use('/api/workers', require('./src/routes/workerRoutes'));
app.use('/api/workstations', require('./src/routes/workstationRoutes'));
app.use('/api/metrics', require('./src/routes/metricsRoutes'));

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
