import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Memory Graph CRUD (/api/memory-graph)
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const [nodesRes, edgesRes] = await Promise.all([
      db.from('memory_nodes').select('*').order('created_at'),
      db.from('memory_edges').select('*').order('created_at')
    ]);
    if (nodesRes.error) throw nodesRes.error;
    if (edgesRes.error) throw edgesRes.error;

    const nodes = (nodesRes.data || []).map(n => ({
      id: n.id,
      label: n.label,
      group: n.node_group,
      detail: n.detail,
      importance: n.importance
    }));
    const edges = (edgesRes.data || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      weight: e.weight,
      type: e.edge_type
    }));
    res.json({ nodes, edges });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/nodes', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const nodes = Array.isArray(req.body) ? req.body : [req.body];
    const rows = nodes.map(n => ({
      id: n.id,
      label: n.label,
      node_group: n.group,
      detail: n.detail,
      importance: n.importance ?? 5
    }));
    const { error } = await db.from('memory_nodes').upsert(rows);
    if (error) throw error;
    res.json({ success: true, count: rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/edges', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const edges = Array.isArray(req.body) ? req.body : [req.body];
    const rows = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      weight: e.weight ?? 3,
      edge_type: e.type || 'impacts'
    }));
    const { error } = await db.from('memory_edges').upsert(rows);
    if (error) throw error;
    res.json({ success: true, count: rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
