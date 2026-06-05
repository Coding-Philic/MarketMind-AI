export interface MarketEvent {
  id: string;
  timestamp: string; // ISO string or relative time
  companyId: string;
  companyName: string;
  title: string;
  content: string;
  impactType: 'positive' | 'negative' | 'neutral';
  metricImpacted: 'revenue' | 'margin' | 'growth' | 'marketShare' | 'brand' | 'regulatory';
  valueChange: number; // e.g. +15 for 15% increase or -5
  rawSource: 'News' | 'SEC Filing' | 'Product Release' | 'Earnings Call' | 'Regulatory Body';
}

export interface HindsightRecord {
  id: string;
  companyId: string;
  companyName: string;
  expectationDescription: string;
  expectedTimeline: string;
  actualEventId: string;
  actualOutcomeDescription: string;
  deviationMetric: 'revenue' | 'timeline' | 'margin' | 'adoption' | 'execution';
  deviationValue: 'ahead' | 'on_track' | 'lagging' | 'cancelled' | 'exceeded_expectations' | 'missed_expectations';
  hindsightLesson: string;
  severity: 'minor' | 'moderate' | 'critical';
  timestamp: string;
}

export interface RevenueDataPoint {
  period: string; // e.g. "Q1 2024", "2024"
  revenue: number; // in Millions USD
  netMargin: number; // percentage, e.g. 24
}

export interface ProductPerformance {
  name: string;
  status: 'active' | 'sunset' | 'beta' | 'announced';
  marketAdoption: number; // 0 to 100
  hindsightDelta: number; // how much actual adoption deviated from prediction (-100 to 100)
}

export interface CompanyExpectation {
  id: string;
  description: string;
  targetTimeline: string;
  metricTarget: string;
}

export interface Company {
  id: string;
  name: string;
  ticker: string;
  description: string;
  sector: string;
  revenueData: RevenueDataPoint[];
  products: ProductPerformance[];
  expectations: CompanyExpectation[];
  alignmentScore: number; // 0 - 100: Expectation vs reality alignment
}

export interface MemoryNode {
  id: string;
  label: string;
  group: 'company' | 'product' | 'event' | 'hindsight_lesson' | 'sector';
  detail: string;
  importance: number; // 1 to 10 for size
  x?: number;
  y?: number;
}

export interface MemoryEdge {
  id: string;
  source: string; // node ID
  target: string; // node ID
  label: string;
  weight: number; // 1 to 5
  type: 'belongs_to' | 'triggers' | 'contradicts' | 'impacts' | 'resolves';
}

export interface AgentLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'success' | 'process';
}

export interface AgentState {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'analyzing' | 'consolidating' | 'writing';
  lastActive: string;
  currentTask: string;
  cpuUsage: number;
  memoryUsage: number;
  logs: AgentLog[];
}

export interface InvestmentMemo {
  id: string;
  companyId: string;
  companyName: string;
  ticker: string;
  title: string;
  timestamp: string;
  recommendation: 'BUY' | 'HOLD' | 'SELL' | 'UNDER_REVIEW';
  convictionScore: number; // 1 to 10
  keyThesis: string;
  hindsightInsights: string[];
  riskAnalysis: string;
  growthOutlook: string;
  fullMemo: string;
}
