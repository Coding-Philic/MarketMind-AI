import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/db.js';
import { queryGroq, generateEmbedding } from '../lib/ai.js';
import { log } from '../lib/utils.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Dreaming Memory (3-Phase Background Consolidation) — /api/memory/dream
// ---------------------------------------------------------------------------
router.post('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  const userId = req.userId;
  if (!db) return res.status(503).json({ error: 'Database not configured' });

  try {
    log('Dreaming Memory', { phase: 'starting', userId });

    // -------------------------------------------------------------------
    // Fetch context: recent events + existing memory nodes
    // -------------------------------------------------------------------
    const [eventsRes, nodesRes] = await Promise.all([
      db.from('market_events').select('*').order('timestamp', { ascending: false }).limit(15),
      db.from('memory_nodes').select('*').order('importance', { ascending: false }).limit(30)
    ]);

    const recentEvents = eventsRes.data || [];
    const existingNodes = nodesRes.data || [];

    if (recentEvents.length === 0) {
      return res.json({ message: 'No recent events to consolidate. Add some market events first.', nodesAdded: 0, nodesUpdated: 0, edgesAdded: 0 });
    }

    const eventsText = recentEvents.map(e => `[${e.company_name}]: ${e.title} — ${e.content}`).join('\n');
    const existingNodesText = existingNodes.map(n => `[${n.id}] ${n.label} (${n.node_group}): ${n.detail?.substring(0, 120)}`).join('\n');

    let totalNodesAdded = 0;
    let totalNodesUpdated = 0;
    let totalEdgesAdded = 0;
    let dreamSummary = '';

    // ===================================================================
    // PHASE 1: Event Ingestion — Create new episodic memory nodes
    // ===================================================================
    log('Dreaming Memory', { phase: 'Phase 1 — Event Ingestion' });
    const phase1Prompt = `You are the long-term memory core of MarketMind AI, an investment intelligence platform.
You are in DREAMING MODE — performing background memory consolidation while the system is idle.

Review the following recent market events and synthesize them into 1-3 key long-term Episodic Memory nodes that capture the most important themes, patterns, and market lessons.

RECENT MARKET EVENTS:
${eventsText}

CRITICAL LANGUAGE REQUIREMENT:
Write all memory labels and details in completely professional yet clear, accessible, and easy-to-understand language. Explain each memory as if you are a professional market strategist briefing someone who has never studied finance. Every memory should feel insightful and practical — something a regular person can read and immediately understand why it matters.

Respond ONLY with valid JSON, no markdown, no code fences:
{
  "newNodes": [
    {"id": "theme-[short-unique-id]", "label": "Brief Theme Title (5 words max)", "group": "theme", "detail": "2-3 sentence clear explanation of what this market theme means and why it matters to investors", "importance": 7}
  ],
  "newEdges": [
    {"id": "edge-[unique-id]", "source": "theme-[node-id]", "target": "existing-node-id", "label": "impacts", "weight": 5}
  ]
}`;

    const phase1Text = await queryGroq(phase1Prompt, { model: 'openai/gpt-oss-120b', maxTokens: 1200, temperature: 0.3 });
    let phase1 = { newNodes: [], newEdges: [] };
    try {
      phase1 = JSON.parse(phase1Text.match(/\{[\s\S]*\}/)?.[0] || phase1Text);
    } catch (e) { log('Dreaming Phase 1 Parse Error', e.message); }

    const savedNodeIds = new Set(existingNodes.map(n => n.id));
    if (phase1.newNodes?.length > 0) {
      const nodeRows = phase1.newNodes.map(n => ({
        id: n.id, user_id: userId, label: n.label, node_group: n.group || 'theme', detail: n.detail, importance: n.importance ?? 7
      }));
      const nodeResult = await db.from('memory_nodes').upsert(nodeRows);
      if (!nodeResult.error) {
        phase1.newNodes.forEach(n => savedNodeIds.add(n.id));
        totalNodesAdded += phase1.newNodes.length;
      } else {
        log('Dreaming Phase 1 Node Save Warning', nodeResult.error.message);
      }
    }

    if (phase1.newEdges?.length > 0) {
      const validEdges = phase1.newEdges.filter(e => savedNodeIds.has(e.source) && savedNodeIds.has(e.target));
      const skippedEdges = phase1.newEdges.length - validEdges.length;
      if (skippedEdges > 0) log('Dreaming Phase 1 Skipped Edges', { skipped: skippedEdges, reason: 'source or target node not found' });
      if (validEdges.length > 0) {
        const edgeResult = await db.from('memory_edges').upsert(validEdges.map(e => ({
          id: e.id, user_id: userId, source: e.source, target: e.target, label: e.label || 'impacts', weight: e.weight ?? 5, edge_type: 'impacts'
        })));
        if (!edgeResult.error) totalEdgesAdded += validEdges.length;
        else log('Dreaming Phase 1 Edge Save Warning', edgeResult.error.message);
      }
    }
    log('Dreaming Memory', { phase: 'Phase 1 Complete', nodesAdded: totalNodesAdded });

    // ===================================================================
    // PHASE 2: Memory Re-Evaluation — Review & refine existing memories
    // ===================================================================
    log('Dreaming Memory', { phase: 'Phase 2 — Memory Re-Evaluation' });
    if (existingNodes.length > 0) {
      const phase2Prompt = `You are the long-term memory core of MarketMind AI in DREAMING MODE.
Your task: Re-evaluate and refine existing memory nodes in light of recent market events.

EXISTING MEMORY NODES (to re-evaluate):
${existingNodesText}

RECENT EVENTS (new context to consider):
${eventsText}

For each memory node that is significantly impacted by the recent events, provide an updated detail and adjusted importance score.
Only include nodes that genuinely need updating — do not fabricate changes.

CRITICAL LANGUAGE REQUIREMENT:
Write all updated details in clear, professional, and easy-to-understand language that anyone can read without stock market expertise.

Respond ONLY with valid JSON, no markdown:
{
  "updatedNodes": [
    {"id": "existing-node-id", "detail": "Updated clear explanation reflecting new context", "importance": 8}
  ],
  "dreamSummary": "A 2-3 sentence plain-language summary of what the dreaming cycle learned and what it updated in memory."
}`;

      const phase2Text = await queryGroq(phase2Prompt, { model: 'openai/gpt-oss-120b', maxTokens: 1200, temperature: 0.2 });
      let phase2 = { updatedNodes: [], dreamSummary: '' };
      try {
        phase2 = JSON.parse(phase2Text.match(/\{[\s\S]*\}/)?.[0] || phase2Text);
      } catch (e) { log('Dreaming Phase 2 Parse Error', e.message); }

      dreamSummary = phase2.dreamSummary || '';

      if (phase2.updatedNodes?.length > 0) {
        for (const updated of phase2.updatedNodes) {
          if (!updated.id) continue;
          const updateResult = await db.from('memory_nodes')
            .update({ detail: updated.detail, importance: updated.importance })
            .eq('id', updated.id)
            .eq('user_id', userId);
          if (!updateResult.error) totalNodesUpdated++;
        }
      }
      log('Dreaming Memory', { phase: 'Phase 2 Complete', nodesUpdated: totalNodesUpdated });
    }

    // ===================================================================
    // PHASE 3: Cross-Company Thematic Linking
    // ===================================================================
    log('Dreaming Memory', { phase: 'Phase 3 — Cross-Company Thematic Linking' });
    const uniqueCompanies = [...new Set(recentEvents.map(e => e.company_name))];
    if (uniqueCompanies.length > 1) {
      const phase3Prompt = `You are the long-term memory core of MarketMind AI in DREAMING MODE.
Your task: Identify meaningful cross-company relationships revealed by recent market events.

COMPANIES WITH RECENT EVENTS: ${uniqueCompanies.join(', ')}

RECENT EVENTS:
${eventsText}

EXISTING MEMORY NODES (use these IDs for cross-links):
${existingNodesText}

Identify 1-3 meaningful cross-company edges (relationships) that these events reveal.
Only create edges between node IDs that exist in the existing memory nodes list above.
Do NOT invent new node IDs.

CRITICAL LANGUAGE REQUIREMENT:
Edge labels must be short (2-4 words) and clear to understand without financial expertise.

Respond ONLY with valid JSON, no markdown:
{
  "crossEdges": [
    {"id": "cross-[unique-id]", "source": "existing-node-id", "target": "existing-node-id", "label": "short relationship label", "weight": 5}
  ]
}`;

      const phase3Text = await queryGroq(phase3Prompt, { model: 'openai/gpt-oss-120b', maxTokens: 600, temperature: 0.2 });
      let phase3 = { crossEdges: [] };
      try {
        phase3 = JSON.parse(phase3Text.match(/\{[\s\S]*\}/)?.[0] || phase3Text);
      } catch (e) { log('Dreaming Phase 3 Parse Error', e.message); }

      if (phase3.crossEdges?.length > 0) {
        const validCrossEdges = phase3.crossEdges.filter(e => savedNodeIds.has(e.source) && savedNodeIds.has(e.target));
        const skipped = phase3.crossEdges.length - validCrossEdges.length;
        if (skipped > 0) log('Dreaming Phase 3 Skipped Cross Edges', { skipped, reason: 'node IDs not in memory graph' });
        if (validCrossEdges.length > 0) {
          const crossEdgeResult = await db.from('memory_edges').upsert(validCrossEdges.map(e => ({
            id: e.id, user_id: userId, source: e.source, target: e.target, label: e.label || 'related_to', weight: e.weight ?? 4, edge_type: 'cross_company'
          })));
          if (!crossEdgeResult.error) totalEdgesAdded += validCrossEdges.length;
          else log('Dreaming Phase 3 Edge Save Warning', crossEdgeResult.error.message);
        }
      }
      log('Dreaming Memory', { phase: 'Phase 3 Complete' });
    }

    // ===================================================================
    // Embed all new nodes for RAG retrieval
    // ===================================================================
    if (phase1.newNodes?.length > 0) {
      const embeddingsToInsert = [];
      for (const node of phase1.newNodes) {
        try {
          const vector = await generateEmbedding(node.detail);
          embeddingsToInsert.push({
            user_id: userId,
            content: `Dreaming Memory [${node.label}]: ${node.detail}`,
            metadata: { source: 'dreaming-memory', type: 'theme', phase: 1 },
            embedding: vector
          });
        } catch (embErr) { log('Dreaming Embedding Error', embErr.message); }
      }
      if (embeddingsToInsert.length > 0) {
        await db.from('document_embeddings').insert(embeddingsToInsert);
      }
    }

    log('Dreaming Memory Complete', { nodesAdded: totalNodesAdded, nodesUpdated: totalNodesUpdated, edgesAdded: totalEdgesAdded });
    res.json({
      success: true,
      message: 'Dreaming memory cycle completed (3 phases)',
      nodesAdded: totalNodesAdded,
      nodesUpdated: totalNodesUpdated,
      edgesAdded: totalEdgesAdded,
      dreamSummary: dreamSummary || 'The dreaming memory cycle completed successfully — new patterns have been consolidated into long-term memory.'
    });
  } catch (err) {
    console.error('[Dreaming Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
