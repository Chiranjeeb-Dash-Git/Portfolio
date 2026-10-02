# Deploying the portfolio

The portfolio uses Neon Postgres as its durable source of truth. Certificate images and PDFs are stored in the `portfolio_state` row and are returned by `/api/portfolio`, so visitors do not need direct database access.

## Vercel

1. Import `Chiranjeeb-Dash-Git/Portfolio` into Vercel.
2. In **Project Settings → Environment Variables**, add `DATABASE_URL` for **Production** (and Preview if needed). Use the Neon pooled connection string and keep it secret.
3. Deploy from the `main` branch.
4. Open the generated Vercel URL. The site loads the saved portfolio from Neon on every page load.

The repository already passes `npm run build`; Vercel detects Next.js automatically, so no custom build command is required.

## Local verification

Copy `.env.example` to `.env.local`, set `DATABASE_URL`, then run:

```bash
npm install
npm run build
npm run start
```

The API should respond at `/api/portfolio`. Upload a certificate, wait for the modal to show `Saved permanently ✓`, refresh, and verify it is still visible.
