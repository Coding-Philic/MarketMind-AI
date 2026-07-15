-- Companies table
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  alignment_score INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue data (one-to-many with companies)
CREATE TABLE company_revenue_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  revenue NUMERIC NOT NULL,
  net_margin NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (one-to-many with companies)
CREATE TABLE company_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  market_adoption INTEGER DEFAULT 0,
  hindsight_delta INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expectations (one-to-many with companies)
CREATE TABLE company_expectations (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target_timeline TEXT,
  metric_target TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hindsight records
CREATE TABLE hindsight_records (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  expectation_description TEXT,
  expected_timeline TEXT,
  actual_event_id TEXT,
  actual_outcome_description TEXT,
  deviation_metric TEXT,
  deviation_value TEXT,
  hindsight_lesson TEXT,
  severity TEXT DEFAULT 'moderate',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Market events
CREATE TABLE market_events (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  impact_type TEXT DEFAULT 'neutral',
  metric_impacted TEXT,
  value_change INTEGER DEFAULT 0,
  raw_source TEXT DEFAULT 'News',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Memory graph nodes
CREATE TABLE memory_nodes (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  node_group TEXT NOT NULL,
  detail TEXT,
  importance INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory graph edges
CREATE TABLE memory_edges (
  id TEXT PRIMARY KEY,
  source TEXT REFERENCES memory_nodes(id) ON DELETE CASCADE,
  target TEXT REFERENCES memory_nodes(id) ON DELETE CASCADE,
  label TEXT,
  weight INTEGER DEFAULT 3,
  edge_type TEXT DEFAULT 'impacts',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investment memos
CREATE TABLE investment_memos (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  title TEXT NOT NULL,
  recommendation TEXT DEFAULT 'HOLD',
  conviction_score INTEGER DEFAULT 5,
  key_thesis TEXT,
  hindsight_insights JSONB DEFAULT '[]',
  risk_analysis TEXT,
  growth_outlook TEXT,
  full_memo TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE hindsight_records;
ALTER PUBLICATION supabase_realtime ADD TABLE market_events;
ALTER PUBLICATION supabase_realtime ADD TABLE memory_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE memory_edges;
ALTER PUBLICATION supabase_realtime ADD TABLE investment_memos;

-- Row Level Security (permissive for now — no auth)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON companies FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE company_revenue_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON company_revenue_data FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE company_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON company_products FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE company_expectations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON company_expectations FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE hindsight_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON hindsight_records FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE market_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON market_events FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE memory_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON memory_nodes FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE memory_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON memory_edges FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE investment_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON investment_memos FOR ALL USING (true) WITH CHECK (true);
