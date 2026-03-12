# Proposal Intelligence + Portfolio Planner

Internal product to collect freelance leads, analyze trends in stacks/skills, and turn those insights into portfolio decisions.

## Foundations in this repo

- `apps/web`: Next.js internal UI
- `apps/api`: NestJS API
- `apps/api/prisma`: Prisma schema (PostgreSQL)
- `docs/BUILD_STEPS.md`: execution checklist from v0.1 to v1
- `n8n/`: email-intake payload examples

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
6. Verify health endpoint:
   - `GET http://localhost:4000/api/health`

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

You can connect Codex to Postgres through MCP:

```bash
codex mcp add postgres -- npx -y @modelcontextprotocol/server-postgres 'postgresql://postgres:postgres@localhost:5432/proposal_intel?schema=public'
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
