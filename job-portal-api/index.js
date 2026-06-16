const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const candidateRoutes = require('./routes/candidates');
const companyRoutes = require('./routes/companies');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const messageRoutes = require('./routes/messages');
const shortlistRoutes = require('./routes/shortlists');

const app = express();
app.enable('trust proxy');
const PORT = process.env.PORT || 3000;

// Standard Middlewares
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3001',
    'https://fsl-job-search-project.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());

// Swagger API Documentation
app.get('/swagger.json', (req, res) => {
  const doc = JSON.parse(JSON.stringify(swaggerDocument));
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  doc.servers = [
    {
      url: `${protocol}://${req.get('host')}`,
      description: 'Current Environment Server'
    }
  ];
  res.json(doc);
});

const swaggerOptions = {
  swaggerOptions: {
    url: '/swagger.json'
  }
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, swaggerOptions));

// Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/shortlists', shortlistRoutes);

// Simple Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Job Portal API is running smoothly.' });
});

// Database Debug/Diagnostics Endpoint
app.get('/debug-db', async (req, res) => {
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    hasPassword: !!process.env.DB_PASSWORD,
    hasJwtSecret: !!process.env.JWT_SECRET
  };
  
  try {
    const pool = require('./db');
    await pool.query('SELECT 1');
    return res.json({ success: true, dbConfig, connection: 'Successful' });
  } catch (err) {
    return res.status(500).json({ success: false, dbConfig, error: err.message, stack: err.stack });
  }
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

// Server Initialization
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
