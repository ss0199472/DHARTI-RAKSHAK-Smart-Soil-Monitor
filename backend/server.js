/**
 * ============================================================================
 * DHARTI RAKSHAK - EXPRESS SERVER ENTRYPOINT
 * ============================================================================
 * Production-ready server for Render cloud deployment.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/config.js';
import apiRoutes from './routes/api.js';

const app = express();

// 1. Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS Handling
const allowedOrigins = config.corsOrigin === '*' 
  ? '*' 
  : config.corsOrigin.split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Request Body Parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Rate Limiter (60 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests to Dharti Rakshak AI backend. Please try again in a minute."
  }
});
app.use('/api/', limiter);

// 5. Mount API Routes
app.use('/', apiRoutes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    name: "Dharti Rakshak AI Backend Service",
    description: "Technology for Protecting the Earth - Agronomy AI & Chatbot Engine",
    version: config.defaultProjectMetadata.version,
    endpoints: {
      health: "/health",
      soilLatest: "/api/soil/latest",
      recommendationLatest: "/api/recommendation/latest",
      generateRecommendation: "POST /api/recommendation/generate",
      chat: "POST /api/chat",
      projectInfo: "/api/project-info"
    },
    documentation: "See backend/README.md for Render deployment guide."
  });
});

// 6. 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.method} ${req.originalUrl}' not found.`
  });
});

// 7. Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: "Internal server error occurred.",
    message: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// 8. Start Server
app.listen(config.port, () => {
  console.log(`========================================================`);
  console.log(`🌱 DHARTI RAKSHAK AI BACKEND SERVICE RUNNING`);
  console.log(`🚀 Port: ${config.port} | Mode: ${config.nodeEnv}`);
  console.log(`📡 Firebase URL: ${config.firebaseDatabaseUrl}`);
  console.log(`🤖 Groq Model: ${config.groqModel}`);
  console.log(`========================================================`);
});
