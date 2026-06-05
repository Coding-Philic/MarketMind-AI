# MarketMind AI — Architecture Blueprint

This document captures the production-grade vision for MarketMind AI while preserving the current MVP implementation.

## 1. Current MVP State

The existing project already provides:

- React + TypeScript frontend
- Express backend
- Gemini-backed analysis routes
- Multi-agent simulation flow
- Memory graph visualization
- Hindsight ledger and memo generation

This is the current working foundation for the autonomous financial intelligence platform.

## 2. Target Architecture Vision

### Core Layers

1. Frontend Layer
   - React + TypeScript dashboard
   - Company intelligence and memo views
   - Memory graph explorer
   - Agent activity and event simulation console

2. Application Layer
   - Express backend for current MVP
   - Future FastAPI / Python service for advanced orchestration
   - Agent orchestration, planning, and memory retrieval

3. Intelligence Layer
   - Gemini as the primary reasoning model
   - Optional model swapping through configuration
   - Reflection, validation, and explanation generation

4. Memory Layer
   - Episodic memory for event history
   - Semantic memory for company and sector concepts
   - Procedural memory for successful reasoning workflows
   - Working memory for active tasks
   - Investor memory for preferences and watchlists

5. Knowledge Graph Layer
   - Neo4j for causal chains, event correlations, and long-range relationships
   - Graph traversal for explanation and similarity analysis

6. Data Layer
   - PostgreSQL for structured metadata
   - Qdrant for vector retrieval
   - Redis for queueing and transient cache
   - MinIO for object storage

## 3. Agent Architecture

### Agent 0 — Chief Intelligence Agent

Responsible for orchestration, task decomposition, memory retrieval, and output validation.

### Agent 1 — Market Observer Agent

Collects and structures market events, news, and company signals.

### Agent 2 — Memory Agent

Stores and retrieves historical experiences, previous lessons, and investor context.

### Agent 3 — Revenue Intelligence Agent

Explains why revenue moved, which products contributed, and how the current event affects outlook.

### Agent 4 — Strategic Impact Agent

Analyzes tariffs, inflation, geopolitics, rate changes, and supply chain disruption effects.

### Agent 5 — Investor Profiling Agent

Learns user interests, watchlists, and reading behavior for personalized intelligence.

### Agent 6 — Investor Briefing Agent

Generates investor-facing summaries, reports, and strategic briefings.

### Agent 7 — Knowledge Graph Agent

Builds causal graph relationships and traces cross-event influence.

### Agent 8 — Reflection & Critique Agent

Ensures reasoning quality, detects hallucinations, and improves outputs.

## 4. Reasoning Flow

Observe
→ Understand
→ Retrieve Memory
→ Retrieve Graph Context
→ Generate Hypotheses
→ Critique Hypotheses
→ Validate Evidence
→ Generate Insight
→ Store Learning
→ Improve Future Reasoning

## 5. Memory Design

- Episodic memory: earnings events, announcements, and reactions
- Semantic memory: company fundamentals, product lines, and industry concepts
- Procedural memory: previously successful workflows and reasoning strategies
- Working memory: current task context
- Investor memory: watchlists, preferences, and reading behavior

## 6. Knowledge Graph Design

Example causal chain:

War
→ Oil Price Increase
→ Transportation Cost Increase
→ Inflation
→ Reduced Consumer Spending
→ Revenue Pressure

This graph should support:

- causal explanation
- historical similarity lookup
- relationship traversal
- event correlation

## 7. Deployment Design

The current MVP runs locally with:

- frontend
- backend

The production target uses:

- frontend
- backend
- postgres
- redis
- qdrant
- neo4j
- minio
- celery-worker
- celery-beat
- prometheus
- grafana
- loki

## 8. Security & Governance

Target controls include:

- JWT authentication
- RBAC access control
- secret management via environment variables
- audit logging
- rate limiting
- encryption in transit and at rest

## 9. Roadmap Summary

Phase 1 — Current MVP
- existing dashboard, agents, and memory graph

Phase 2 — Production Intelligence Layer
- real data ingestion, memory persistence, and graph storage

Phase 3 — Autonomous Research Platform
- advanced planning, retrieval, and multi-agent reasoning

Phase 4 — Enterprise SaaS Layer
- multi-tenant workspaces, usage limits, monitoring, and governance
