/**
 * Unified backend API client for MarketMind AI.
 * All requests route through the Express backend, which handles Groq AI, Tavily, and Supabase.
 */

import type {
  Company, HindsightRecord, MarketEvent,
  MemoryNode, MemoryEdge, InvestmentMemo
} from '../types';
import { supabase } from './supabase';

function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || '';
}

async function apiFetch<T>(path: string, options: RequestInit = {}, retries = 1): Promise<T> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${path}`;

  let token = '';
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || '';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Supabase-Anon-Key'] = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || errData.error || `API Error: ${response.status}`;
    
    // Workaround for Supabase Auth clock skew (JWT issued at future)
    if (retries > 0 && typeof errMsg === 'string' && errMsg.includes('JWT issued at future')) {
      console.warn('Clock skew detected with Supabase Auth token, retrying in 1.5s...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return apiFetch<T>(path, options, retries - 1);
    }
    
    throw new Error(errMsg);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface ConfigResponse {
  hasApiKey: boolean;
  hasSearch: boolean;
  hasDatabase: boolean;
}

export async function checkBackendConfig(): Promise<ConfigResponse> {
  try {
    return await apiFetch<ConfigResponse>('/api/config');
  } catch {
    return { hasApiKey: false, hasSearch: false, hasDatabase: false };
  }
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function fetchCompanies(): Promise<Company[]> {
  return apiFetch<Company[]>('/api/companies');
}

export async function saveCompany(data: {
  company: Partial<Company>;
  revenueData?: Company['revenueData'];
  products?: Company['products'];
  expectations?: Company['expectations'];
}): Promise<{ success: boolean; companyId: string }> {
  return apiFetch('/api/companies', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// ---------------------------------------------------------------------------
// Market Events
// ---------------------------------------------------------------------------

export async function fetchEvents(): Promise<MarketEvent[]> {
  return apiFetch<MarketEvent[]>('/api/events');
}

export async function saveEvent(event: MarketEvent): Promise<{ success: boolean }> {
  return apiFetch('/api/events', {
    method: 'POST',
    body: JSON.stringify(event)
  });
}

// ---------------------------------------------------------------------------
// Hindsight Records
// ---------------------------------------------------------------------------

export async function fetchHindsightRecords(): Promise<HindsightRecord[]> {
  return apiFetch<HindsightRecord[]>('/api/hindsight-records');
}

export async function saveHindsightRecord(record: HindsightRecord): Promise<{ success: boolean }> {
  return apiFetch('/api/hindsight-records', {
    method: 'POST',
    body: JSON.stringify(record)
  });
}

// ---------------------------------------------------------------------------
// Memory Graph
// ---------------------------------------------------------------------------

export async function fetchMemoryGraph(): Promise<{ nodes: MemoryNode[]; edges: MemoryEdge[] }> {
  return apiFetch('/api/memory-graph');
}

export async function saveMemoryNodes(nodes: MemoryNode[]): Promise<{ success: boolean }> {
  return apiFetch('/api/memory-graph/nodes', {
    method: 'POST',
    body: JSON.stringify(nodes)
  });
}

export async function saveMemoryEdges(edges: MemoryEdge[]): Promise<{ success: boolean }> {
  return apiFetch('/api/memory-graph/edges', {
    method: 'POST',
    body: JSON.stringify(edges)
  });
}

// ---------------------------------------------------------------------------
// Investment Memos
// ---------------------------------------------------------------------------

export async function fetchMemos(): Promise<InvestmentMemo[]> {
  return apiFetch<InvestmentMemo[]>('/api/memos');
}

export async function saveMemo(memo: InvestmentMemo): Promise<{ success: boolean }> {
  return apiFetch('/api/memos', {
    method: 'POST',
    body: JSON.stringify(memo)
  });
}

// ---------------------------------------------------------------------------
// User Profile (Personalization)
// ---------------------------------------------------------------------------

export async function fetchUserProfile(): Promise<UserProfile | null> {
  return apiFetch<UserProfile | null>('/api/profile').catch(() => null);
}

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/profile', {
    method: 'POST',
    body: JSON.stringify(profile)
  });
}

// ---------------------------------------------------------------------------
// AI — Hindsight Analysis
// ---------------------------------------------------------------------------

interface HindsightAIResponse {
  lesson: string;
  deviationValue: 'ahead' | 'on_track' | 'lagging' | 'cancelled' | 'exceeded_expectations' | 'missed_expectations';
}

export async function generateLiveHindsight(
  companyName: string,
  expectation: string,
  outcome: string,
  userProfile?: UserProfile | null
): Promise<HindsightAIResponse> {
  return apiFetch<HindsightAIResponse>('/api/hindsight', {
    method: 'POST',
    body: JSON.stringify({ companyName, expectation, outcome, userProfile })
  });
}

// ---------------------------------------------------------------------------
// AI — Investment Memo
// ---------------------------------------------------------------------------

interface MemoAIResponse {
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'UNDER_REVIEW';
  convictionScore: number;
  fullMemo: string;
}

export async function generateLiveMemo(
  companyName: string,
  ticker: string,
  eventTitle: string,
  eventContent: string,
  lessons: string[],
  companyInfo?: string,
  userProfile?: UserProfile | null
): Promise<MemoAIResponse> {
  return apiFetch<MemoAIResponse>('/api/memo', {
    method: 'POST',
    body: JSON.stringify({ companyName, ticker, eventTitle, eventContent, lessons, companyInfo, userProfile })
  });
}

// ---------------------------------------------------------------------------
// Company Research (NEW — AI + Tavily web search)
// ---------------------------------------------------------------------------

export interface CompanyResearchResult {
  success: boolean;
  company: Company & {
    geopoliticalRisks?: string;
    competitorDependencies?: string;
    keyInsights?: string[];
  };
  searchSources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export async function researchCompany(query: string, userProfile?: UserProfile | null): Promise<CompanyResearchResult> {
  return apiFetch<CompanyResearchResult>('/api/company-research', {
    method: 'POST',
    body: JSON.stringify({ query, userProfile })
  });
}

// ---------------------------------------------------------------------------
// Seed — populate Supabase with initial data
// ---------------------------------------------------------------------------

export async function seedDatabase(seedData: {
  companies: Company[];
  hindsightLedger: HindsightRecord[];
  marketEvents: MarketEvent[];
  memoryNodes: MemoryNode[];
  memoryEdges: MemoryEdge[];
  memos: InvestmentMemo[];
}): Promise<{ message: string; seeded: boolean }> {
  return apiFetch('/api/seed', {
    method: 'POST',
    body: JSON.stringify(seedData)
  });
}
