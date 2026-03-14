# Proposal Intelligence + Portfolio Planner

Internal product to collect freelance leads, analyze trends in stacks/skills, and turn those insights into portfolio decisions.

## Foundations in this repo

- `apps/web`: Next.js internal UI
- `apps/api`: NestJS API
- `apps/api/prisma`: Prisma schema (PostgreSQL)
- `docs/BUILD_STEPS.md`: execution checklist from v0.1 to v1
- `n8n/`: email-intake payload examples and n8n wiring notes

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env:
   ```bash
   cp .env.example .env
   ```
   Also create `apps/api/.env` with the same `DATABASE_URL` value (Prisma CLI resolves env from the API workspace).

3. Start PostgreSQL:
   ```bash
   npm run db:up
   ```
4. Run Prisma migration (after API deps are installed):
   ```bash
   npm run prisma:migrate --workspace apps/api -- --name init
   ```
5. Start services in separate terminals:
   ```bash
   npm run dev:api
   npm run dev:web
   ```
   Or run the full local stack with one command:
   ```bash
   npm run dev
   ```
6. Verify health endpoint:
   - `GET http://localhost:4000/api/health`

## Local n8n

1. Set `N8N_ENCRYPTION_KEY` in root `.env`.
2. Start local n8n:
   ```bash
   npm run n8n:up
   ```
3. Open `http://localhost:5678`.
4. Import [`n8n/yahoo-upwork-alerts.workflow.json`](./n8n/yahoo-upwork-alerts.workflow.json).
5. Create an IMAP credential for Yahoo in the n8n UI and paste the Yahoo app password there.

## n8n intake setup

- Set `INTAKE_WEBHOOK_KEY` in both root `.env` and `apps/api/.env`.
- Use the guide in [`n8n/README.md`](./n8n/README.md) to wire Yahoo IMAP -> transform -> `POST /api/intake/email`.

## Reuse existing PostgreSQL (no Docker needed)

If you already have PostgreSQL running, skip `npm run db:up` and set `DATABASE_URL` in `.env` to your existing instance.

Example:

```bash
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/proposal_intel?schema=public
```

Then run:

```bash
npm run prisma:status --workspace apps/api
npm run prisma:migrate --workspace apps/api -- --name init
```

If `prisma:status` returns migration status (instead of connection errors), DB connectivity is valid.

## Optional: Codex PostgreSQL MCP

You can connect Codex to Postgres through MCP without hardcoding the connection string in the command:

```bash
export POSTGRES_MCP_URL='postgresql://postgres:your_password@localhost:5432/proposal_intel?schema=public'
codex mcp add postgres -- sh -lc 'npx -y @modelcontextprotocol/server-postgres "$POSTGRES_MCP_URL"'
codex mcp list
codex mcp get postgres
```

To remove it:

```bash
codex mcp remove postgres
```

## First implementation target

Build `v0.1` around three capabilities:

- manual lead intake
- Yahoo email intake via n8n webhook
- lead review + tagging + basic insights

Use [`docs/BUILD_STEPS.md`](docs/BUILD_STEPS.md) as the canonical build checklist.
