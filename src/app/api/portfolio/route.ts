import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  return neon(connectionString);
}

async function ensureTable() {
  const sql = getDatabase();
  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_state (
      id text PRIMARY KEY,
      state jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  return sql;
}

export async function GET() {
  try {
    const sql = await ensureTable();
    const rows = await sql`SELECT state, updated_at FROM portfolio_state WHERE id = 'default' LIMIT 1`;
    return NextResponse.json({
      state: rows[0]?.state ?? null,
      updatedAt: rows[0]?.updated_at ?? null,
    });
  } catch (error) {
    console.error('Portfolio load failed', error);
    return NextResponse.json({ error: 'Portfolio persistence is unavailable' }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid portfolio state' }, { status: 400 });
    }

    const sql = await ensureTable();
    await sql`
      INSERT INTO portfolio_state (id, state, updated_at)
      VALUES ('default', ${JSON.stringify(body)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE
      SET state = EXCLUDED.state, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Portfolio save failed', error);
    return NextResponse.json({ error: 'Portfolio persistence is unavailable' }, { status: 503 });
  }
}
