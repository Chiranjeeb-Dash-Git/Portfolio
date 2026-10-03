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
    CREATE TABLE IF NOT EXISTS portfolio_media (
      id text PRIMARY KEY,
      media_type text NOT NULL,
      data_url text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  return sql;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^cert-[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid certificate media id' }, { status: 400 });
    }

    const sql = await ensureTable();
    const rows = await sql`
      SELECT media_type, data_url FROM portfolio_media WHERE id = ${id} LIMIT 1
    `;
    const media = rows[0] as { media_type: string; data_url: string } | undefined;
    if (!media) return NextResponse.json({ error: 'Certificate media not found' }, { status: 404 });

    const match = media.data_url.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return NextResponse.json({ error: 'Certificate media is invalid' }, { status: 500 });
    return new NextResponse(Buffer.from(match[2], 'base64'), {
      headers: {
        'Content-Type': match[1],
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  } catch (error) {
    console.error('Certificate media load failed', error);
    return NextResponse.json({ error: 'Certificate media is unavailable' }, { status: 503 });
  }
}
