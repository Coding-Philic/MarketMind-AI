/**
 * Supabase Realtime client for MarketMind AI.
 * Provides live data synchronization across browser tabs and users.
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create the client if credentials are available
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isRealtimeEnabled = !!supabase;

type RealtimeCallback = (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void;

/**
 * Subscribe to realtime changes on a Supabase table.
 * Returns an unsubscribe function.
 */
export function subscribeToTable(
  tableName: string,
  callback: RealtimeCallback
): (() => void) {
  if (!supabase) {
    console.warn('[Realtime] Supabase not configured — skipping subscription for', tableName);
    return () => {};
  }

  const channel: RealtimeChannel = supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: (payload.new || {}) as Record<string, unknown>,
          old: (payload.old || {}) as Record<string, unknown>
        });
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

/**
 * Subscribe to multiple tables at once. Returns a single unsubscribe function.
 */
export function subscribeToTables(
  tables: Array<{ table: string; callback: RealtimeCallback }>
): (() => void) {
  const unsubscribers = tables.map(({ table, callback }) =>
    subscribeToTable(table, callback)
  );
  return () => unsubscribers.forEach(unsub => unsub());
}
