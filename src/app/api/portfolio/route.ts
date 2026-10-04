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

type CertificateState = {
  mediaId?: string;
  mediaType?: string;
  mediaRemoved?: boolean;
  [key: string]: unknown;
};

type PortfolioState = {
  certs?: CertificateState[];
  [key: string]: unknown;
};

function certificateKey(certificate: CertificateState) {
  return `${String(certificate.name || '').trim()}::${String(certificate.credentialId || '').trim()}`;
}

async function repairCertificateMedia(sql: any, state: PortfolioState) {
  if (!Array.isArray(state.certs)) return state;

  const mediaRows = await sql`
    SELECT id, media_type FROM portfolio_media ORDER BY updated_at DESC
  ` as Array<{ id: string; media_type: string }>;
  const used = new Set(
    state.certs
      .map((certificate) => certificate.mediaId)
      .filter((mediaId): mediaId is string => Boolean(mediaId)),
  );

  return {
    ...state,
    certs: state.certs.map((certificate, index) => {
      if (certificate.mediaId || certificate.mediaRemoved) return certificate;
      const prefix = `cert-${index}-`;
      const recovered = mediaRows.find((row) => row.id.startsWith(prefix) && !used.has(row.id));
      if (!recovered) return certificate;
      used.add(recovered.id);
      return {
        ...certificate,
        mediaId: recovered.id,
        mediaType: recovered.media_type,
        img: '',
      };
    }),
  };
}

function mergeCertificateMedia(incoming: PortfolioState, previous: PortfolioState | null) {
  if (!Array.isArray(incoming.certs) || !Array.isArray(previous?.certs)) return incoming;
  const previousByKey = new Map(
    previous.certs
      .filter((certificate) => certificate.mediaId)
      .map((certificate) => [certificateKey(certificate), certificate]),
  );

  return {
    ...incoming,
    certs: incoming.certs.map((certificate) => {
      if (certificate.mediaId || certificate.mediaRemoved) return certificate;
      const previousCertificate = previousByKey.get(certificateKey(certificate));
      if (!previousCertificate?.mediaId) return certificate;
      return {
        ...certificate,
        mediaId: previousCertificate.mediaId,
        mediaType: previousCertificate.mediaType,
        img: '',
      };
    }),
  };
}

export async function GET() {
  try {
    const sql = await ensureTable();
    const rows = await sql`SELECT state, updated_at FROM portfolio_state WHERE id = 'default' LIMIT 1`;
    const state = rows[0]?.state ? await repairCertificateMedia(sql, rows[0].state as PortfolioState) : null;
    return NextResponse.json({
      state,
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
    const previousRows = await sql`SELECT state FROM portfolio_state WHERE id = 'default' LIMIT 1`;
    const previousState = previousRows[0]?.state
      ? await repairCertificateMedia(sql, previousRows[0].state as PortfolioState)
      : null;
    const nextState = mergeCertificateMedia(body as PortfolioState, previousState);
    await sql`
      INSERT INTO portfolio_state (id, state, updated_at)
      VALUES ('default', ${JSON.stringify(nextState)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE
      SET state = EXCLUDED.state, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Portfolio save failed', error);
    return NextResponse.json({ error: 'Portfolio persistence is unavailable' }, { status: 503 });
  }
}
