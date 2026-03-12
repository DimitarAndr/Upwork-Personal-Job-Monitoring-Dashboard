# AGENTS.md

## Database Decision Rule

- For any task that requires database decisions (schema design, migrations, indexes, query behavior, data quality, or integrity checks), use the PostgreSQL MCP first.
- Validate assumptions against live database state via MCP before finalizing recommendations.
- Prefer read-first verification (tables, columns, constraints, indexes, and representative sample data) before proposing schema or query changes.
- If PostgreSQL MCP is unavailable, explicitly state that limitation and fall back to repository sources (`Prisma schema`, migrations, and code), marking conclusions as best-effort.
- Do not run destructive SQL through MCP without explicit user approval.

