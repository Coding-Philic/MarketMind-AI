# Hosting MarketMind AI for Free

This guide will walk you through hosting the entire MarketMind AI application completely for free using Supabase (Database), Render (Backend), and Vercel (Frontend).

---

## 1. Database (Supabase) - Free Tier
Supabase provides a generous free tier for PostgreSQL and real-time subscriptions.

1. Go to [Supabase](https://supabase.com/) and sign up.
2. Click **"New Project"**.
3. Name it `marketmind-ai`, choose a strong password, and select a region close to you.
4. Once the project is provisioned, go to the **SQL Editor** (left sidebar).
5. Paste the entire SQL schema provided in the implementation plan and click **Run**.
6. Go to **Settings > API** (gear icon on the bottom left).
   - Copy the **Project URL**.
   - Copy the **`anon` public** key.
   - Copy the **`service_role` secret** key.
   - *Keep these handy, you will need them for the backend and frontend.*

---

## 2. Web Search API (Tavily) - Free Tier
Tavily provides 1,000 free searches per month.

1. Go to [Tavily](https://tavily.com/) and sign up.
2. Go to your dashboard and copy your API key (starts with `tvly-`).

---

## 3. Backend (Render) - Free Tier
Render allows you to host Node.js applications for free (with spin-down on inactivity).

1. Push your complete `MarketMind-AI` project to a **GitHub repository**.
2. Go to [Render](https://render.com/) and sign up with GitHub.
3. Click **"New"** > **"Web Service"**.
4. Choose **"Build and deploy from a Git repository"** and select your GitHub repository.
5. In the settings, configure the following:
   - **Name**: `marketmind-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
6. Click **Advanced > Environment Variables** and add:
   - `GROQ_API_KEY`: Your Groq API key (`gsk_...`)
   - `TAVILY_API_KEY`: Your Tavily API key
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase `service_role` secret key
   - `PORT`: `3001`
7. Click **Create Web Service**. Wait for the deployment to finish and copy the assigned URL (e.g., `https://marketmind-backend.onrender.com`).

---

## 4. Frontend (Vercel) - Free Tier
Vercel is the best place to host Vite/React apps for free.

1. Go to [Vercel](https://vercel.com/) and sign up with GitHub.
2. Click **"Add New"** > **"Project"**.
3. Import your `MarketMind-AI` GitHub repository.
4. In the configuration section:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Select `frontend`
5. Open **Environment Variables** and add:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://marketmind-backend.onrender.com`)
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase `anon` public key
6. Click **Deploy**.
7. Once deployed, Vercel will give you a public URL (e.g., `https://marketmind-ai.vercel.app`).

---

## 5. Final Configuration (CORS)

To ensure your frontend can talk to your backend securely:

1. Go back to your **Render dashboard** for the backend service.
2. Go to **Environment Variables**.
3. Add a new variable:
   - `FRONTEND_URL`: Your Vercel URL (e.g., `https://marketmind-ai.vercel.app`)
4. Save and trigger a manual deploy on Render if it doesn't restart automatically.

---

## Summary of Environment Variables

**Backend (Render):**
- `GROQ_API_KEY`
- `TAVILY_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `FRONTEND_URL`
- `PORT` = `3001`

**Frontend (Vercel):**
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Congratulations! Your fully dynamic MarketMind AI is now hosted in the cloud for free.
