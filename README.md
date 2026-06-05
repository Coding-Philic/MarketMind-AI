# MarketMind AI

MarketMind AI is a memory-first investment intelligence dashboard that simulates a multi-agent research workflow for company events, hindsight analysis, and strategic memo generation.

It combines a React + TypeScript frontend, an Express backend, and live AI routes that now support NVIDIA AI as the primary engine with Gemini as a fallback. The current setup is designed to show real backend-generated AI responses in the terminal while preserving the existing simulation and memory graph experience.

## What this project does

MarketMind AI is designed to demonstrate how an AI-assisted research stack can:

- ingest market events and company signals;
- run a four-agent reasoning cycle (monitor, analyst, consolidator, and revenue intelligence);
- store and visualize hindsight lessons in a memory-style ledger;
- generate investment memos and strategic notes;
- use live backend AI responses when an AI key is available;
- fall back to deterministic simulator logic only when no live AI key is available.

## Main features

- Dashboard for injecting market events and observing agent activity
- Memory graph view for visualizing company, product, and sector relationships
- Hindsight ledger for tracking expectation deviations and lessons learned
- Company evolution view for comparing forecasts and strategic shifts
- Intel memos for research brief generation and memo review
- NVIDIA-backed AI routes for live analysis and memo drafting, with Gemini fallback

## Project structure

- frontend/ — Vite + React + TypeScript UI
- backend/ — Express API that calls Gemini and exposes analysis routes
- scripts/ — supporting reference scripts
- docker-compose.yml — containerized startup for frontend and backend

## Tech stack

- Frontend: React 19, TypeScript, Vite, Lucide icons
- Backend: Express, CORS, dotenv
- AI integration: NVIDIA API via the backend (preferred), with Gemini fallback
- Container support: Docker + Docker Compose

## Prerequisites

Before you start, make sure you have:

- Node.js 18+ (the project is also aligned with Node 24 in Docker)
- npm
- Optional: Docker Desktop if you want to run the containerized setup
- A NVIDIA API key (preferred) or a Gemini API key if you want real AI analysis instead of fallback simulation

## Quick start

### 1) Install dependencies

From the project root:

```bash
npm run install-all
```

This runs:

- npm install
- npm install --prefix frontend
- npm install --prefix backend

### 2) Start the app in development mode

From the project root:

```bash
npm start
```

This starts:

- backend on http://localhost:3001
- frontend on http://localhost:3000

You can also run them separately:

```bash
npm --prefix backend start
npm --prefix frontend run dev
```

### 3) Configure the live AI key

Create or update backend/.env with one of the supported keys:

```env
GEMINI_API_KEY=your_gemini_key_here
NVIDIA_API_KEY=your_nvidia_key_here
```

The backend currently prefers NVIDIA when `NVIDIA_API_KEY` is available. If neither key is set, the app uses the simulator fallback path.

## Production build

To build the frontend for production:

```bash
npm run build
```

The build output is generated in frontend/dist.

## Docker startup

You can also run the full stack with Docker Compose:

```bash
docker compose up --build
```

This exposes:

- frontend at http://localhost:3000
- backend at http://localhost:3001

Set your AI key in your shell before running Docker:

```bash
export NVIDIA_API_KEY=your_nvidia_key_here
# or
export GEMINI_API_KEY=your_gemini_key_here

docker compose up --build
```

## How the app works

1. The frontend loads mock company, market event, and memory graph data.
2. You inject a market event from the dashboard.
3. The orchestrator runs the multi-agent pipeline:
   - Market Monitor Agent parses the event
   - Hindsight Analyst Agent compares the event to company expectations
   - Memory Consolidator Agent updates the graph and ledger
   - Revenue Intelligence Agent writes an investment memo
4. If an AI key is configured, the backend generates live analysis and memo content through the NVIDIA/Gemini engine path.
5. If no AI key is configured, the app falls back to deterministic local logic.

## Backend API overview

The backend exposes these routes:

- GET /api/config — checks whether a live AI key is configured on the backend
- POST /api/hindsight — returns a deviation label and hindsight lesson
- POST /api/memo — returns a recommendation, conviction score, and memo text

## Useful development commands

```bash
npm run install-all
npm start
npm run build
npm --prefix backend start
npm --prefix frontend run dev
```

## Terminal logging and button behavior

When you run the app with `npm start`, the terminal will now show:

- backend request logs for `/api/config`, `/api/hindsight`, and `/api/memo`
- live AI response text and parsed recommendations from the backend
- frontend button action logs for the main UI controls, such as:
  - Inject Market Event — runs a random preset market event
  - Inject Custom Event — sends your custom event into the analysis pipeline
  - Open tab — switches between Dashboard, Memory Network, Hindsight Ledger, Company Evolution, and Intel Memos

This gives you a terminal-visible trace of what each major action does and what AI output was returned.

## Additional project blueprint

For the full production vision and roadmap, see:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [.env.example](.env.example)

## Notes

- The current UI uses mock data and simulation logic for demonstration purposes.
- Real AI generation depends on NVIDIA or Gemini credentials being available to the backend.
- The build was verified with the current project scripts after the TypeScript fixes applied in the frontend.

## Next steps

If you want to extend this project, good next improvements are:

- wire real market data feeds instead of mock events;
- persist memory and memo state to a database;
- add authentication and user workspaces;
- improve the agent orchestration with real-time event streaming.

