import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { supabase } from './lib/db.js';
import { log } from './lib/utils.js';

// Route modules
import profileRouter from './routes/profile.js';
import companiesRouter from './routes/companies.js';
import eventsRouter from './routes/events.js';
import hindsightRecordsRouter from './routes/hindsightRecords.js';
import hindsightRouter from './routes/hindsight.js';
import memoryGraphRouter from './routes/memoryGraph.js';
import dreamRouter from './routes/dream.js';
import memosRouter from './routes/memos.js';
import memoRouter from './routes/memo.js';
import researchRouter from './routes/research.js';
import seedRouter from './routes/seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// CORS — allow local dev + production frontend
// ---------------------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Session ID & Cookie Middleware
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  let sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }
  req.sessionId = sessionId;
  // Set cookie with 30-day expiration
  res.cookie('sessionId', sessionId, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  // Also attach to response headers so client can inspect and store it if needed
  res.setHeader('X-Session-Id', sessionId);
  next();
});

// ---------------------------------------------------------------------------
// System Status & Health Check
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), supabase: !!supabase, sessionId: req.sessionId, hasCookie: !!req.cookies?.sessionId });
});

app.get('/api/config', (req, res) => {
  const hasApiKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  const hasSearch = !!(process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.trim().length > 0);
  const hasDatabase = !!supabase;
  log('Request /api/config', { hasApiKey, hasSearch, hasDatabase, sessionId: req.sessionId });
  res.json({ hasApiKey, hasSearch, hasDatabase, sessionId: req.sessionId });
});

// ---------------------------------------------------------------------------
// Mount Modular Routes
// ---------------------------------------------------------------------------
app.use('/api/profile', profileRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/hindsight-records', hindsightRecordsRouter);
app.use('/api/hindsight', hindsightRouter);
app.use('/api/memory-graph', memoryGraphRouter);
app.use('/api/memory/dream', dreamRouter);
app.use('/api/memos', memosRouter);
app.use('/api/memo', memoRouter);
app.use('/api/company-research', researchRouter);
app.use('/api/seed', seedRouter);

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`[Server] MarketMind AI Backend running on http://localhost:${PORT}`);
    console.log(`[Server] Groq API: ${process.env.GROQ_API_KEY ? 'Configured' : 'NOT SET'}`);
    console.log(`[Server] Tavily API: ${process.env.TAVILY_API_KEY ? 'Configured' : 'NOT SET'}`);
    console.log(`[Server] Supabase: ${supabase ? 'Connected' : 'NOT SET'}`);
    console.log(`[Server] Modular architecture loaded successfully.`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[Server Error] Port ${PORT} is already in use! The MarketMind AI backend is currently running in a background process or another terminal tab.`);
      console.error(`Tip: If you want to restart it in this terminal, run: pkill -f "node server.js" and try again.\n`);
      process.exit(1);
    } else {
      console.error('[Server Error]', err);
      process.exit(1);
    }
  });
}

export default app;
