import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { supabase } from '../lib/db.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Companies CRUD
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data: companies, error } = await db.from('companies').select('*').order('created_at', { ascending: true });
    if (error) throw error;

    const enriched = await Promise.all(companies.map(async (c) => {
      const [revRes, prodRes, expRes] = await Promise.all([
        db.from('company_revenue_data').select('*').eq('company_id', c.id).order('period', { ascending: true }),
        db.from('company_products').select('*').eq('company_id', c.id),
        db.from('company_expectations').select('*').eq('company_id', c.id)
      ]);
      
      return {
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        description: c.description,
        sector: c.sector,
        alignmentScore: c.alignment_score,
        pastIncidents: c.past_incidents || [],
        currentIncidents: c.current_incidents || [],
        dependencies: c.dependencies || '',
        growthOutlook: c.growth_outlook || '',
        riskFactors: c.risk_factors || '',
        geopoliticalRisks: c.geopolitical_risks || '',
        competitorDependencies: c.competitor_dependencies || '',
        keyInsights: c.key_insights || [],
        searchSources: c.search_sources || [],
        revenueData: (revRes.data || []).map(r => ({
          period: r.period,
          revenue: Number(r.revenue),
          netMargin: Number(r.net_margin)
        })),
        products: (prodRes.data || []).map(p => ({
          name: p.name,
          status: p.status,
          marketAdoption: p.market_adoption,
          hindsightDelta: p.hindsight_delta,
          revenueShare: p.revenue_share,
          rating: p.rating,
          reviewCount: p.review_count,
          category: p.category
        })),
        expectations: (expRes.data || []).map(e => ({
          id: e.id,
          description: e.description,
          targetTimeline: e.target_timeline,
          metricTarget: e.metric_target
        }))
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', optionalAuth, async (req, res) => {
  const db = supabase || req.db;
  if (!db) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { company, revenueData, products, expectations } = req.body;
    if (!company || !company.id || !company.name) {
      return res.status(400).json({ error: 'company object with id and name is required' });
    }
    company.ticker = company.ticker || company.name.slice(0, 4).toUpperCase();

    const { error: compError } = await db.from('companies').upsert({
      id: company.id,
      name: company.name,
      ticker: company.ticker,
      description: company.description || '',
      sector: company.sector || 'Unknown',
      alignment_score: company.alignmentScore ?? 50
    });
    if (compError) throw compError;

    if (revenueData && revenueData.length > 0) {
      const rows = revenueData.map(r => ({
        company_id: company.id,
        period: r.period,
        revenue: r.revenue,
        net_margin: r.netMargin
      }));
      const { error } = await db.from('company_revenue_data').upsert(rows);
      if (error) throw error;
    }

    if (products && products.length > 0) {
      const rows = products.map(p => ({
        company_id: company.id,
        name: p.name,
        status: p.status || 'active',
        market_adoption: p.marketAdoption ?? 0,
        hindsight_delta: p.hindsightDelta ?? 0,
        revenue_share: p.revenueShare ?? 0,
        rating: p.rating ?? 4.0,
        review_count: p.reviewCount ?? 50,
        category: p.category || `${company.sector || 'Core Industry'} (${(p.status || 'active').toUpperCase()})`
      }));
      const { error } = await db.from('company_products').upsert(rows);
      if (error) throw error;
    }

    if (expectations && expectations.length > 0) {
      const rows = expectations.map(e => ({
        id: e.id,
        company_id: company.id,
        description: e.description,
        target_timeline: e.targetTimeline,
        metric_target: e.metricTarget
      }));
      const { error } = await db.from('company_expectations').upsert(rows);
      if (error) throw error;
    }

    res.json({ success: true, companyId: company.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
