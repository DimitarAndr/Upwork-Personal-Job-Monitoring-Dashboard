Final recommended product structure
Your product is small enough right now that the structure should be three explicit surfaces with minimal internal branching. Don’t invent “platform IA.” Make each surface answer a specific operator question.

Decision labels
- `Adopt now`: build or formalize this in the current UI phase.
- `Defer`: good idea, but premature for current scope.
- `Needs new data/instrumentation`: only worth shipping once the supporting telemetry, tagging, or derived data exists reliably.

Overview (dashboard surface)
Primary question: “Is my pipeline healthy and what should I do next?”
This should behave like a true dashboard: at-a-glance, minimal interaction, not an exploration playground. NN/g explicitly defines dashboards as single-page visualizations meant to be absorbed quickly so users can act, not as expansive exploratory views. 

Admin (operator workspace)
Primary question: “Which leads do I triage now, and how quickly can I make them ‘ready’?”
This is a work surface. It should be table-first and built explicitly to support the four common user tasks in tables: find, compare, view/edit one row, and take action. 

Portfolio (clean proof surface)
Primary question: “What proof do I have, and how can I present it credibly?”
This is not an operator table. It’s closer to a technical brief / evidence page with a curated narrative tone. It should be calmer, more “document-like,” and should not expose internal operational clutter.

What to adopt now
These are the patterns that match your current scope + current data + current goals and will immediately improve usefulness.

`Adopt now` — Use a dashboard discipline for Overview
Use Michelin’s dashboard rules as your guardrails: unify the background, place visuals on white cards, keep a dedicated area/panel for filters or context (if needed), keep it simple, and avoid random layouts or forcing the user’s visual flow. 

This directly prevents “decorative dashboard syndrome.”

`Adopt now` — Make Admin table-first with batch actions and a detail drawer
The Admin list should be a true operator table: selection + batch actions + actions per row (triage flows). Carbon explicitly documents that a batch action toolbar appears when rows are selected. 
Keep the table globally manageable: Carbon reserves the table toolbar for global table actions (complex filters, export, settings) and recommends not overloading icons. 
Use expandable/secondary detail only for supplementary information; Carbon warns that when expanded content feels cramped, you should move to a dedicated page or modal. 
Add a right-side drawer for rapid “detail on demand.” Ant explicitly frames Drawer as a preview of details of an object in a list. 
`Adopt now` — Keep tags calm and meaningful
Your system has lots of tags (stack/skills/project type/domain). Use Michelin’s rule: use one color for tags by default; only multiple colors when there is meaning (e.g., status). 

This is one of the most important “calm density” levers in your UI.

`Adopt now` — Use Page Header conventions simply
Atlassian’s Page Header concept is exactly what your three surfaces need: a title and optional controls like buttons/search/filters. 

You can implement this without building a complex navigation system.

What to defer
These are good ideas in theory, but premature given 3 routes and a personal workflow.

Defer for now (explicitly)
`Defer` — Persistent left sidebar (until you have >5 secondary items or frequent switching between many sections). Carbon specifically says use the left panel if there are more than five secondary nav items or frequent switching; otherwise, it’s optional and tabs within a page are recommended for additional content. 
`Defer` — Saved views (full system). Too early to introduce view management UI, storage, naming, and permissions. Instead: use 3–5 fixed view presets (see Admin structure).
`Defer` — Query language / advanced search DSL. Adds complexity and learning cost; your dataset is small enough that clear filters + a simple search box will outperform it today.
`Defer` — Taxonomy management section. You can manage taxonomy terms implicitly via tagging UI in Admin without creating a separate “Taxonomy” area.
`Defer` — Automations section. Your ingestion flow exists, but operators don’t need a dedicated automation console until you have multiple workflows or failure-handling tools.
`Defer` — Settings section. Most settings can sit behind an avatar dropdown as a single “Preferences” modal later; don’t burn navigation complexity on it now.
`Defer` — Evidence library as a separate surface. You already have “Portfolio.” Keep evidence management embedded there until it becomes too dense.
Recommended navigation model for current scope
Answer to “sidebar vs top nav” (opinionated)
`Adopt now` — Use a top navigation now. Do not add a persistent left sidebar yet.

Why this is the right call for current scope:

Carbon explicitly states the UI shell header can be used on its own for simple products, and left/right panels are optional for more complex navigation. 
Carbon also provides a hard practical threshold: use the left panel when there are more than five secondary navigation items or frequent switching. You have exactly three routes. 
Recommended nav implementation
Top bar with:

`Adopt now` — Three primary tabs/links: Overview, Admin, Portfolio
`Adopt now` — Optional right side: user/avatar
`Needs new data/instrumentation` — Optional right side: “ingestion status” indicator
`Defer` — Optional: a global time range control (only if you truly need it now)
Do not hide navigation behind menus. Keep the three routes visible.

How to prepare for future sidebar without building it
Design the top bar so it can “collapse into” a sidebar later:

`Adopt now` — Keep route names short and stable (“Overview”, “Admin”, “Portfolio”)
`Adopt now` — Keep icons optional (don’t rely on icons for meaning)
`Defer` — Avoid building deep nested subnavigation patterns right now
Recommended page structure for Overview
Your Overview must earn its existence by answering: health + next actions + short market signal, not by “showing charts.”

Michelin’s dashboard guidance gives you the layout discipline: unified background, white cards, simple layout, follow natural scanning patterns (F-pattern), and avoid forcing visual flow. 

NN/g reminds dashboards are for quick consumption and action. 

Above the fold (must-have)
Section A — KPI strip (4–6 cards, no more) Each KPI card should include:

value
delta vs previous period (tiny, calm)
“last updated” if relevant
Suggested KPIs for your dataset:

`Adopt now` — Leads ingested (7d)
`Needs new data/instrumentation` — Ingestion errors (24h)
`Adopt now` — Unreviewed leads count (and oldest age)
`Needs new data/instrumentation` — Tag coverage (e.g., % with PROJECT_TYPE)
`Adopt now` — Enrichment backlog (e.g., missing client signals / missing tags)
`Adopt now` — Average lead quality score (or “verified client share”)
Section B — One primary chart One chart only, answering: “Is intake stable and are errors spiking?”

`Adopt now` — Leads ingested per day (line or bars)
`Needs new data/instrumentation` — Optional overlay: error count (thin line) or error rate
Keep labeling explicit; do not overload with multiple series unless it is truly operationally relevant (Michelin: keep it simple; colors are information). 

Below the fold (useful breakdowns)
Section C — Breakdown table(s) (pick 2, not 6) Breakdowns should answer “where is this coming from?”

Pick two:

`Adopt now` — Breakdown by source (Email vs Manual intake) + counts
`Needs new data/instrumentation` — Breakdown by project type tag + counts (top 10)
`Adopt now` — Breakdown by parser version / data quality + counts
Section D — Action queue: “Top leads to review next” This is what makes Overview non-decorative:

`Adopt now` — Show 5–10 leads ranked by a simple priority signal (new + high client quality + missing review)
`Adopt now` — Each row action: “Open in Admin”
What should NOT be on Overview (yet)
A full filter builder
Deep taxonomy management
Portfolio project management
Evidence-page generation controls
Overview should point to Admin for action.
`Adopt now` — Overview should point to Admin for action.
Recommended page structure for Admin
Admin is your operator console. It should be designed explicitly around the table-workflow model.

NN/g’s table task framework tells you what Admin must support: find, compare, view/edit one lead, take actions. 

Michelin’s table guidance gives you hard constraints: 6–8 columns max, avoid horizontal scroll, freeze the identifying column if you must scroll. 

Carbon adds operator ergonomics: batch actions appear on selection; expandable rows are for supplemental info only; table toolbar is for global actions and should not be overloaded. 

Ant provides the right detail-on-demand component: a preview drawer for list objects. 

Above the fold (Admin header + controls)
Page Header (simple)

`Adopt now` — Title: “Admin”
`Adopt now` — Subtitle (optional): “Lead triage & enrichment”
`Adopt now` — Primary action: “Add lead (manual)” (small)
View presets (not saved views yet) Instead of a full saved-view system, use 4 fixed presets as tabs or segmented control:

`Adopt now` — New
`Adopt now` — Needs enrichment (missing tags/fields)
`Adopt now` — High quality (verified + high rating/spend)
`Adopt now` — Applied / Archive (optional)
This gives you 80% of saved views with 10% of the implementation.

Filter row

`Adopt now` — Search input (title + raw text)
`Adopt now` — 3–5 filter chips max (pricing type, verified only, experience level, status)
`Adopt now` — “More filters” opens a small panel/drawer (not a whole new page)
The table (center of the Admin universe)
Column set (keep to 6–8) Recommended columns for now:

`Adopt now` — Lead title (frozen identifier column)
`Adopt now` — Posted date
`Adopt now` — Pricing (hourly range / fixed)
`Adopt now` — Client quality (verified + rating + spent summarized)
`Needs new data/instrumentation` — Tags (project type + top 1–2 stack tags, not 10)
`Adopt now` — Enrichment state (e.g., “Missing project type”, “Missing client country”)
`Adopt now` — Status (NEW/REVIEWED/APPLIED)
`Adopt now` — Optional 8) Data quality score
Row actions

`Adopt now` — Primary: click row → opens detail drawer
`Adopt now` — Secondary: overflow menu with 2–3 quick actions:
Mark Reviewed
Ignore
Apply Avoid adding more until you need them.
Batch actions (essential for operator efficiency) On selection:

`Adopt now` — Set status (Reviewed / Ignored / Applied)
`Needs new data/instrumentation` — Add tag (project type)
Carbon explicitly supports batch action toolbars on selection. 
Right-side detail drawer (your productivity multiplier)
Use Ant’s “preview drawer” concept: quickly preview details of an object from a list. 

Inside the drawer, use progressive disclosure:

Drawer top (always visible)

`Adopt now` — Title + URL button
`Adopt now` — Status pill
`Adopt now` — Client quality summary strip (verified, rating, spent, country)
`Adopt now` — “Next action” buttons (Reviewed / Ignore / Apply)
Drawer middle (structured content)

`Defer` — AI/summary block
`Adopt now` — Extracted summary
`Adopt now` — Key extracted fields (pricing, workload, duration, experience)
`Needs new data/instrumentation` — Tags editor (project type, stack, skill) — limited to the most useful tags
Drawer bottom (deep detail, collapsible)

`Adopt now` — Raw email/job text (collapsed by default)
`Adopt now` — Intake metadata (hidden behind “debug” toggle)
Carbon cautions that expandable areas become cramped; if you find yourself cramming too much into the drawer, escalate to a full lead detail page later. 

What should NOT be on Admin (yet)
`Defer` — A dedicated taxonomy management area
`Defer` — Automation configuration
`Defer` — A complex query language UI
`Defer` — Highly styled portfolio content
Admin should feel operational and fast.
Recommended page structure for Portfolio
Portfolio must feel distinct from Admin. It should be “externally credible” even if it’s still inside your app.

Visual and structural differences (deliberate)
Background and density: Portfolio should be lighter and more spacious (document-like). Admin can be gray background + dense tables (Michelin dashboard/card structure). 
Color usage: Portfolio should avoid status colors and operational badges. Keep tags neutral and meaning-based (Michelin tag guidance: one color unless meaning like status). 
Interaction style: Portfolio emphasizes reading, scanning “proof cards,” and opening links—less filtering, less triage.
Above the fold (Portfolio landing)
Section A — Credible capability summary A simple “proof-oriented” header:

`Adopt now` — 2–3 sentences: what you do
`Adopt now` — 4 capability bullets (Backend, Frontend, DevOps/Integrations, AI/Automation)
`Adopt now` — A small “verification” strip: GitHub link + key stacks (no hype)
Section B — “Selected proof projects” list Use cards (not a table) to support narrative scanning:

`Adopt now` — Project name
`Adopt now` — One-line purpose
`Adopt now` — “What it proves” (1–2 bullets)
`Adopt now` — Stack tags (3–5 max)
`Adopt now` — Links: GitHub + demo (if any)
Michelin explicitly frames cards as good for dashboards and as containers for structured pieces of information; cards also help you keep a calm rhythm. 

Below the fold (Portfolio depth without turning into an admin UI)
Section C — Proof by theme (optional) If you have enough projects:

`Defer` — “SaaS foundation”
`Defer` — “Backend business systems”
`Defer` — “Ops / integrations”
`Defer` — “Programmatic frontend / widgets”
But do not add taxonomy browsing UI. Just group content.

Section D — “How I approach delivery” (short, credible)

`Adopt now` — 5–7 bullet process
`Adopt now` — No templates, no fluff
What should NOT be on Portfolio (yet)
`Defer` — Lead lists
`Defer` — Client signals
`Defer` — Parsing/debug info
`Defer` — Enrichment state
`Defer` — Status workflows
Portfolio is not where you “operate.” It’s where you “prove.”
Anti-patterns to avoid
These will actively slow you down and reduce UX clarity at your current scope.

Adding a left sidebar now “because internal tools have sidebars.”
Carbon explicitly says header alone is valid for simple products; left panel is advised when you have >5 secondary items or frequent switching. You don’t. 

Turning Overview into a chart wall.
Dashboards are meant for quick consumption and action, not exploratory analysis. 

Over-tagging and multi-colored tag confetti.
Michelin warns against multiple tag colors unless meaning; tags should be concise. 

More than 8 columns in Admin.
Michelin explicitly recommends 6–8 columns max and says if too many columns, use filters/selectable columns instead. 

Using expandable rows for “everything.”
Carbon positions expansion as supplementary and warns to move to a dedicated page/modal if it feels cramped. 

Icon-heavy toolbars.
Carbon reserves table toolbar for global actions and recommends not using too many icons. 

Admin and Portfolio looking identical.
If the Portfolio surface looks like the operator console, it won’t feel externally credible.

Short prioritized UI roadmap
This is the “next 2–3 UI implementation steps” in a buildable order, optimized for current scope.

Step 1 (highest ROI): Admin table-first triage + right drawer
`Adopt now`
Deliver:

Admin route becomes table-first
row selection + batch actions
right-side drawer preview with structured sections (summary, fields, tags, notes, actions)
Why first:

This directly supports core operator workflows (find/compare/action) and is aligned with NN/g’s table task model. 
Drawer preview is explicitly supported as a list-detail pattern. 
Acceptance criteria:

You can review and decide on a lead without leaving the Admin table.
You can change status for multiple leads at once (batch actions).
Step 2: Overview that is useful (KPIs + one chart + two breakdowns + “next leads”)
`Adopt now`
Deliver:

KPI strip
one primary time series chart
2 breakdown tables
“Top leads to review next” list linking to Admin
Acceptance criteria:

In <10 seconds you can answer: “Is ingestion healthy?” and “What should I do next?”
Overview links you into Admin actions rather than duplicating Admin UI.
Step 3: Portfolio that feels distinct and externally credible
`Adopt now`
Deliver:

clean narrative layout
project cards with “what it proves”
restrained tags
minimal UI chrome (no operational filters/status)
Acceptance criteria:

Portfolio reads like a proof brief, not an admin panel.
A non-technical viewer can understand “why these projects prove fit” without seeing internal metadata.
If you want, I can turn the above into “three concrete wireframe specs” (section-by-section with component names and data fields you already store) so your implementation is literally: “build these components in this order.”
