import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Hindsight Records CRUD (/api/hindsight-records)
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data, error } = await db.from('hindsight_records').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map(h => ({
      id: h.id,
      companyId: h.company_id,
      companyName: h.company_name,
      expectationDescription: h.expectation_description,
      expectedTimeline: h.expected_timeline,
      actualEventId: h.actual_event_id,
      actualOutcomeDescription: h.actual_outcome_description,
      deviationMetric: h.deviation_metric,
      deviationValue: h.deviation_value,
      hindsightLesson: h.hindsight_lesson,
      severity: h.severity,
      timestamp: h.timestamp
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
    const record = req.body;
    const { error } = await db.from('hindsight_records').upsert({
      id: record.id,
      company_id: record.companyId,
      company_name: record.companyName,
      expectation_description: record.expectationDescription,
      expected_timeline: record.expectedTimeline,
      actual_event_id: record.actualEventId,
      actual_outcome_description: record.actualOutcomeDescription,
      deviation_metric: record.deviationMetric,
      deviation_value: record.deviationValue,
      hindsight_lesson: record.hindsightLesson,
      severity: record.severity,
      timestamp: record.timestamp || new Date().toISOString()
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
