import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Market Events CRUD
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data, error } = await db.from('market_events').select('*').order('timestamp', { ascending: false }).limit(100);
    if (error) throw error;
    const mapped = (data || []).map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      companyId: e.company_id,
      companyName: e.company_name,
      title: e.title,
      content: e.content,
      impactType: e.impact_type,
      metricImpacted: e.metric_impacted,
      valueChange: e.value_change,
      rawSource: e.raw_source
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
    const event = req.body;
    const { error } = await db.from('market_events').upsert({
      id: event.id,
      company_id: event.companyId,
      company_name: event.companyName,
      title: event.title,
      content: event.content,
      impact_type: event.impactType,
      metric_impacted: event.metricImpacted,
      value_change: event.valueChange,
      raw_source: event.rawSource,
      timestamp: event.timestamp === 'Just now' ? new Date().toISOString() : event.timestamp
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
