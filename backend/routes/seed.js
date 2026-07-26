import express from 'express';
import { supabase } from '../lib/db.js';
import { log } from '../lib/utils.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Seed — populate Supabase with initial data if tables are empty (/api/seed)
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  try {
    const { data: existing } = await supabase.from('companies').select('id').limit(1);
    if (existing && existing.length > 0) {
      return res.json({ message: 'Database already seeded.', seeded: false });
    }

    const seedData = req.body;
    if (!seedData || !seedData.companies) {
      return res.status(400).json({ error: 'Seed data with companies array is required.' });
    }

    for (const company of seedData.companies) {
      await supabase.from('companies').upsert({
        id: company.id,
        name: company.name,
        ticker: company.ticker,
        description: company.description,
        sector: company.sector,
        alignment_score: company.alignmentScore
      });

      if (company.revenueData?.length > 0) {
        await supabase.from('company_revenue_data').insert(
          company.revenueData.map(r => ({
            company_id: company.id, period: r.period, revenue: r.revenue, net_margin: r.netMargin
          }))
        );
      }
      if (company.products?.length > 0) {
        await supabase.from('company_products').insert(
          company.products.map(p => ({
            company_id: company.id, name: p.name, status: p.status,
            market_adoption: p.marketAdoption, hindsight_delta: p.hindsightDelta
          }))
        );
      }
      if (company.expectations?.length > 0) {
        await supabase.from('company_expectations').insert(
          company.expectations.map(e => ({
            id: e.id, company_id: company.id, description: e.description,
            target_timeline: e.targetTimeline, metric_target: e.metricTarget
          }))
        );
      }
    }

    if (seedData.hindsightLedger?.length > 0) {
      await supabase.from('hindsight_records').insert(
        seedData.hindsightLedger.map(h => ({
          id: h.id, company_id: h.companyId, company_name: h.companyName,
          expectation_description: h.expectationDescription, expected_timeline: h.expectedTimeline,
          actual_event_id: h.actualEventId, actual_outcome_description: h.actualOutcomeDescription,
          deviation_metric: h.deviationMetric, deviation_value: h.deviationValue,
          hindsight_lesson: h.hindsightLesson, severity: h.severity, timestamp: h.timestamp
        }))
      );
    }

    if (seedData.marketEvents?.length > 0) {
      await supabase.from('market_events').insert(
        seedData.marketEvents.map(e => ({
          id: e.id, company_id: e.companyId, company_name: e.companyName,
          title: e.title, content: e.content, impact_type: e.impactType,
          metric_impacted: e.metricImpacted, value_change: e.valueChange,
          raw_source: e.rawSource, timestamp: new Date().toISOString()
        }))
      );
    }

    if (seedData.memoryNodes?.length > 0) {
      await supabase.from('memory_nodes').insert(
        seedData.memoryNodes.map(n => ({
          id: n.id, label: n.label, node_group: n.group,
          detail: n.detail, importance: n.importance
        }))
      );
    }

    if (seedData.memoryEdges?.length > 0) {
      await supabase.from('memory_edges').insert(
        seedData.memoryEdges.map(e => ({
          id: e.id, source: e.source, target: e.target,
          label: e.label, weight: e.weight, edge_type: e.type
        }))
      );
    }

    if (seedData.memos?.length > 0) {
      await supabase.from('investment_memos').insert(
        seedData.memos.map(m => ({
          id: m.id, company_id: m.companyId, company_name: m.companyName,
          ticker: m.ticker, title: m.title, recommendation: m.recommendation,
          conviction_score: m.convictionScore, key_thesis: m.keyThesis,
          hindsight_insights: m.hindsightInsights, risk_analysis: m.riskAnalysis,
          growth_outlook: m.growthOutlook, full_memo: m.fullMemo,
          timestamp: m.timestamp
        }))
      );
    }

    log('Seed Complete', { companies: seedData.companies?.length || 0 });
    res.json({ message: 'Database seeded successfully.', seeded: true });
  } catch (error) {
    console.error('[Seed Error]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
