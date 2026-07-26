import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// User Profile (Personalization)
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  if (!req.userId) {
    return res.json({
      id: 'guest',
      email: 'guest@marketmind.local',
      investment_style: 'Balanced',
      preferred_industries: ['Artificial Intelligence', 'Semiconductors', 'Technology'],
      risk_tolerance: 'Moderate'
    });
  }
  try {
    const { data: profile, error } = await db.from('user_profiles').select('*').eq('id', req.userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(profile || null);
  } catch (error) {
    console.error('[API] /api/profile GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  if (!req.userId) {
    return res.json({
      id: 'guest',
      email: 'guest@marketmind.local',
      investment_style: req.body.investmentStyle || 'Balanced',
      preferred_industries: req.body.preferredIndustries || ['Artificial Intelligence', 'Semiconductors'],
      risk_tolerance: req.body.riskTolerance || 'Moderate'
    });
  }
  try {
    const updates = {
      id: req.userId,
      email: req.body.email,
      phone_number: req.body.phoneNumber,
      location: req.body.location,
      investment_style: req.body.investmentStyle,
      preferred_industries: req.body.preferredIndustries || [],
      market_cap_preference: req.body.marketCapPreference || [],
      risk_tolerance: req.body.riskTolerance,
      updated_at: new Date().toISOString()
    };

    const { data: profile, error } = await db.from('user_profiles').upsert(updates).select().single();
    if (error) throw error;
    res.json(profile);
  } catch (error) {
    console.error('[API] /api/profile POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
