import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Unified query function.
 *
 * Dev mode: raw SQL via pg Pool → local PostgreSQL.
 * Prod mode: raw SQL via pg Pool → Supabase's PostgreSQL (SSL required),
 *            or Supabase client for managed features (Auth, Realtime).
 *
 * Route files always import `query` from this module and use raw SQL,
 * so swapping the backend requires no route changes.
 */
const pool = new pg.Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.DATABASE_URL.includes('localhost') ||
          process.env.DATABASE_URL.includes('127.0.0.1')
            ? false
            : { rejectUnauthorized: false },
      }
    : {
        // Local PostgreSQL
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'smartgarden',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      }
);

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

/**
 * Execute a query with optional parameters.
 */
export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`[DB] Slow query (${duration}ms):`, text.slice(0, 80));
  }
  return result;
}

/**
 * Supabase client — available for managed features in production
 * (Auth, Realtime subscriptions, Storage, etc.)
 * Returns null in dev mode to avoid accidental prod usage.
 */
export const supabase = isProd
  ? createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  : null;

export default pool;
