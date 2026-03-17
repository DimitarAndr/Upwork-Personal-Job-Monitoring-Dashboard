# AGENTS.md

## Database Decision Rule

- For any task that requires database decisions (schema design, migrations, indexes, query behavior, data quality, or integrity checks), use the PostgreSQL MCP first.
- Validate assumptions against live database state via MCP before finalizing recommendations.
- Prefer read-first verification (tables, columns, constraints, indexes, and representative sample data) before proposing schema or query changes.
- If PostgreSQL MCP is unavailable, explicitly state that limitation and fall back to repository sources (`Prisma schema`, migrations, and code), marking conclusions as best-effort.
- Do not run destructive SQL through MCP without explicit user approval.

## PostgreSQL MCP Access

- Run `npm run mcp:postgres:add` from the repo root to register the local PostgreSQL MCP server for this project.
- The helper script reads `POSTGRES_MCP_URL` from the root `.env`. If it is not set, it falls back to `DATABASE_URL`.
- The helper stores that connection in the Codex MCP config under the `postgres` server name, so future database checks do not need the full setup command again.
- Run `npm run mcp:postgres:status` to verify the MCP server is configured before doing database analysis.
