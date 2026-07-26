-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- User Profiles (Personalization)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  location TEXT,
  investment_style TEXT,
  preferred_industries JSONB DEFAULT '[]',
  market_cap_preference JSONB DEFAULT '[]',
  risk_tolerance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile" ON user_profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());


-- Companies table
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  alignment_score INTEGER DEFAULT 50,
  past_incidents JSONB DEFAULT '[]',
  current_incidents JSONB DEFAULT '[]',
  dependencies TEXT,
  growth_outlook TEXT,
  risk_factors TEXT,
  geopolitical_risks TEXT,
  competitor_dependencies TEXT,
  key_insights JSONB DEFAULT '[]',
  search_sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue data (one-to-many with companies)
CREATE TABLE company_revenue_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  revenue NUMERIC NOT NULL,
  net_margin NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products (one-to-many with companies)
CREATE TABLE company_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target_timeline TEXT,
  metric_target TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hindsight records
CREATE TABLE hindsight_records (
  id TEXT PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  node_group TEXT NOT NULL,
  detail TEXT,
  importance INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory graph edges
CREATE TABLE memory_edges (
  id TEXT PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own companies" ON companies FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE company_revenue_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own revenue data" ON company_revenue_data FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE company_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own products" ON company_products FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE company_expectations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own expectations" ON company_expectations FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE hindsight_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own hindsight records" ON hindsight_records FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE market_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own market events" ON market_events FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE memory_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own memory nodes" ON memory_nodes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE memory_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own memory edges" ON memory_edges FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE investment_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own investment memos" ON investment_memos FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Document Embeddings for RAG
CREATE TABLE document_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(384),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own embeddings" ON document_embeddings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Function to search embeddings via vector similarity
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  auth_user_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    document_embeddings.id,
    document_embeddings.content,
    document_embeddings.metadata,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
    AND document_embeddings.user_id = auth_user_id
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;
