import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Investment Memos CRUD (/api/memos)
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data, error } = await db.from('investment_memos').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map(m => ({
      id: m.id,
      companyId: m.company_id,
      companyName: m.company_name,
      ticker: m.ticker,
      title: m.title,
      timestamp: m.timestamp,
      recommendation: m.recommendation,
      convictionScore: m.conviction_score,
      keyThesis: m.key_thesis,
      hindsightInsights: m.hindsight_insights || [],
      riskAnalysis: m.risk_analysis,
      growthOutlook: m.growth_outlook,
      fullMemo: m.full_memo
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const memo = req.body;
    const { error } = await db.from('investment_memos').upsert({
      id: memo.id,
      company_id: memo.companyId,
      company_name: memo.companyName,
      ticker: memo.ticker,
      title: memo.title,
      recommendation: memo.recommendation,
      conviction_score: memo.convictionScore,
      key_thesis: memo.keyThesis,
      hindsight_insights: memo.hindsightInsights || [],
      risk_analysis: memo.riskAnalysis,
      growth_outlook: memo.growthOutlook,
      full_memo: memo.fullMemo,
      timestamp: memo.timestamp || new Date().toISOString()
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
