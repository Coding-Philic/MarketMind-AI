import 'dotenv/config.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
export let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Server] Supabase client initialized.');
} else {
  console.warn('[Server] Supabase credentials not configured — database features disabled.');
}

/**
 * Returns a Supabase client scoped to the authenticated user's JWT token.
 * Falls back to the service-role client when no auth headers are present.
 */
export function getAuthClient(req) {
  const token = req.headers.authorization?.split(' ')[1];
  const anonKey = req.headers['x-supabase-anon-key'];
  if (!token || !anonKey || !supabaseUrl) return supabase;
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}
