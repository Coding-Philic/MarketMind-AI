import 'dotenv/config.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
export let supabase = null;

function wrapBuilder(builder, client, table, methodHistory = []) {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (prop === 'then') {
        return async (onFulfilled, onRejected) => {
          try {
            let res = await target.then();
            if (res && res.error && (res.error.code === 'PGRST303' || (typeof res.error.message === 'string' && res.error.message.includes('JWT issued at future')))) {
              console.warn(`[Server DB Retry] Clock skew detected (PGRST303: JWT issued at future). Waiting 1.5s and automatically retrying query on table "${table}"...`);
              await new Promise(r => setTimeout(r, 1500));
              let retryBuilder = client._originalFrom(table);
              for (const { method, args } of methodHistory) {
                if (typeof retryBuilder[method] === 'function') {
                  retryBuilder = retryBuilder[method](...args);
                }
              }
              res = await retryBuilder;
            }
            return onFulfilled ? onFulfilled(res) : res;
          } catch (err) {
            return onRejected ? onRejected(err) : Promise.reject(err);
          }
        };
      }
      const val = target[prop];
      if (typeof val === 'function') {
        return (...args) => {
          const nextBuilder = val.apply(target, args);
          if (nextBuilder && typeof nextBuilder === 'object' && 'then' in nextBuilder) {
            return wrapBuilder(nextBuilder, client, table, [...methodHistory, { method: prop, args }]);
          }
          return nextBuilder;
        };
      }
      return val;
    }
  });
}

function wrapClientWithRetry(client) {
  if (!client || client._isRetryWrapped) return client;

  client._originalFrom = client.from.bind(client);
  client.from = (table) => {
    const builder = client._originalFrom(table);
    return wrapBuilder(builder, client, table);
  };

  if (client.auth && typeof client.auth.getUser === 'function') {
    const originalGetUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = async (...args) => {
      let res = await originalGetUser(...args);
      if (res && res.error && (res.error.code === 'PGRST303' || (typeof res.error.message === 'string' && res.error.message.includes('JWT issued at future')))) {
        console.warn('[Server Auth Retry] Clock skew detected in getUser (PGRST303). Waiting 1.5s and retrying...');
        await new Promise(r => setTimeout(r, 1500));
        res = await originalGetUser(...args);
      }
      return res;
    };
  }

  client._isRetryWrapped = true;
  return client;
}

if (supabaseUrl && supabaseKey) {
  supabase = wrapClientWithRetry(createClient(supabaseUrl, supabaseKey));
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
  return wrapClientWithRetry(createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  }));
}
