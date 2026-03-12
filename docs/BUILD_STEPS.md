# Build Steps (v0.1 -> v1)

Mark each item as done in this file while implementing.

## Phase 0: Repository foundation

- [x] Create monorepo structure (`apps/web`, `apps/api`, `packages/shared`)
- [x] Add root workspace scripts and baseline config
- [x] Add `.env.example` and README
- [x] Add initial Prisma schema for leads and taxonomy

## Phase 1: Data + API baseline

- [ ] Run PostgreSQL locally (Docker or local install)
- [ ] Run `prisma migrate dev` for the initial schema
- [ ] Add Prisma service + module in NestJS
- [ ] Implement `POST /api/leads` (manual intake)
- [ ] Implement `GET /api/leads` with pagination + status filter
- [ ] Implement `GET /api/leads/:id`
- [ ] Implement `PATCH /api/leads/:id` for status/notes

## Phase 2: Taxonomy + review workflow

- [ ] Implement taxonomy endpoints (`terms`, `lead-terms`)
- [ ] Seed starter taxonomy terms (project type, stack, skill, domain, engagement type)
- [ ] Add lead tagging (manual first)
- [ ] Add review fields (`fitScore`, `portfolioGapNotes`)

## Phase 3: Web MVP

- [ ] Build dashboard page (counts + trend cards)
- [ ] Build leads inbox page (table + filters)
- [ ] Build lead detail/review page
- [ ] Build new lead form page (paste raw text + basic fields)
- [ ] Wire UI to API with server-safe env config

## Phase 4: Yahoo email intake with n8n

- [ ] Build n8n workflow: Yahoo IMAP -> parse alert -> HTTP request to API
- [ ] Implement `POST /api/intake/email`
- [ ] Add dedupe strategy (message-id + URL hash + title/date fallback)
- [ ] Store raw email payload in `intake_records`
- [ ] Mark incoming leads as `NEW`

## Phase 5: Insights MVP

- [ ] Add top stacks query
- [ ] Add top skills query
- [ ] Add recurring project types query
- [ ] Add leads-over-time query
- [ ] Add pricing range query

## Phase 6: Controlled enrichment

- [ ] Add job detail paste endpoint (`POST /api/intake/job-detail`)
- [ ] Append enrichment as a second intake record linked to same lead
- [ ] Re-run extraction rules after enrichment

## Phase 7: Portfolio planner (v1)

- [ ] Add `portfolio_projects` table + CRUD
- [ ] Add recommendation rules (demand frequency + portfolio gap)
- [ ] Add planner UI with prioritized build suggestions
- [ ] Add optional LLM enrichment (async, non-blocking)

## Completion criteria for v0.1

- [ ] Intake works from manual form and Yahoo email alerts
- [ ] Leads are reviewable and taggable
- [ ] Dashboard shows top stacks/skills/project types and basic timeline
- [ ] System is usable daily as an internal operating tool

