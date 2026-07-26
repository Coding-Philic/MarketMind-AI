import { getAuthClient } from '../lib/db.js';

/**
 * requireAuth middleware — attaches `req.db` (Supabase client for the request)
 * and `req.userId` to every route that uses it.
 * If Supabase is not configured, the request passes through (routes handle their own 503).
 * If the DB is available but the user is not authenticated, returns 401.
 */
export async function requireAuth(req, res, next) {
  const db = getAuthClient(req);
  if (!db) {
    // No DB configured — pass through, individual routes will return 503 as appropriate
    req.db = null;
    req.userId = null;
    return next();
  }

  req.db = db;

  try {
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized — please log in.' });
    }
    req.userId = user.id;
    next();
  } catch (err) {
    console.error('[Auth Middleware]', err.message);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}

/**
 * optionalAuth middleware — attaches `req.db` and `req.userId` but never
 * blocks the request. Use this for routes that work both authenticated and
 * unauthenticated (e.g., AI-only routes that don't require DB).
 */
export function optionalAuth(req, res, next) {
  req.db = getAuthClient(req);
  req.userId = null; // Will be populated lazily if needed
  next();
}
