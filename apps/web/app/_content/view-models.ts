export const modeCards = [
  {
    href: "/admin",
    eyebrow: "Power user",
    title: "Admin workspace",
    summary: "Use this route to decide what to pursue, what to ignore, and what proof to build next.",
    points: [
      "Lead inbox, filters, and review workflow",
      "Recurring demand and portfolio-gap signals",
      "Internal notes and client-quality context"
    ],
    cta: "Open admin view",
    audience: "For you and other internal operators"
  },
  {
    href: "/portfolio",
    eyebrow: "Client-facing",
    title: "Portfolio proof",
    summary: "Use this route as the basis for a clean, tailored page you can actually send to prospects.",
    points: [
      "Relevant project selection and proof points",
      "Grounded explanation of why the fit is strong",
      "A delivery approach without inbox noise"
    ],
    cta: "Open portfolio view",
    audience: "For clients and external reviewers"
  }
];

export const adminFocusCards = [
  {
    label: "Recurring demand",
    value: "Dashboard + auth",
    detail: "This pattern keeps showing up across the research report and should influence both positioning and build order."
  },
  {
    label: "Highest gap",
    value: "RBAC proof",
    detail: "Role-based access shows up often enough to justify a reusable public evidence asset."
  },
  {
    label: "Best filter",
    value: "Verified + 4.5+",
    detail: "A client-quality lens reduces wasted review time when the inbox starts growing."
  },
  {
    label: "Best next asset",
    value: "Analytics admin demo",
    detail: "One strong demo could support multiple dashboard, reporting, and internal-tools proposals."
  }
];

export const adminGapCards = [
  {
    title: "Analytics admin system",
    detail: "Frequent demand cluster around dashboards, reporting, and role-based controls.",
    demand: "High frequency over last 30 days",
    gap: "No single public project proving the full stack",
    nextMove: "Build one reference app with metrics, auth, and admin workflows"
  },
  {
    title: "Maintenance and takeover proof",
    detail: "Several leads point to cleanup, ownership, and operational reliability rather than greenfield delivery.",
    demand: "Recurring in backend-heavy leads",
    gap: "Current portfolio does not foreground observability and hardening",
    nextMove: "Add a case study emphasizing CI, monitoring, and safe rollout work"
  },
  {
    title: "Payments plus internal operations",
    detail: "Stripe and internal tools are a strong combination for productized admin work.",
    demand: "Moderate but commercially attractive",
    gap: "Proof exists in fragments, not as a coherent external story",
    nextMove: "Package payment flows and reporting into one sendable narrative"
  }
];

export const adminFilters = [
  "Last 30 days",
  "Verified clients",
  "Hourly",
  "Expert",
  "Next.js",
  "Project type: Dashboard/Admin"
];

export const adminLeadPreview = [
  {
    title: "Senior Full-Stack Engineer for analytics dashboard rebuild",
    price: "$55-$85/hr",
    level: "Expert",
    client: "Verified · 4.9 rating · Germany",
    tags: ["Next.js", "PostgreSQL", "RBAC"],
    status: "NEW",
    priority: "High leverage",
    priorityTone: "high",
    note: "Strong fit and directly aligned with the strongest missing proof asset."
  },
  {
    title: "NestJS backend cleanup and long-term API ownership",
    price: "$7k fixed",
    level: "Intermediate",
    client: "Verified · $120k spent · United States",
    tags: ["NestJS", "Queues", "Observability"],
    status: "REVIEWED",
    priority: "Strategic",
    priorityTone: "medium",
    note: "Worth studying because it supports a maintenance/takeover positioning angle."
  },
  {
    title: "Internal tools portal with auth, reporting, and Stripe",
    price: "$45-$70/hr",
    level: "Expert",
    client: "Payment unverified · Canada",
    tags: ["React", "Stripe", "Admin"],
    status: "IGNORED",
    priority: "Low quality",
    priorityTone: "low",
    note: "Useful as a demand signal, but not strong enough on client quality to prioritize."
  }
];

export const portfolioCapabilities = [
  "Admin dashboards",
  "RBAC and auth",
  "Backend systems",
  "Payments and reporting",
  "Operational cleanup"
];

export const portfolioTrustCards = [
  {
    label: "Fit",
    value: "Internal tools + product systems",
    detail: "The strongest through-line is building the operational surfaces that teams actually use every day."
  },
  {
    label: "Proof style",
    value: "Specific and grounded",
    detail: "Selected work should show what was built, why it mattered, and which constraints were handled."
  },
  {
    label: "Public boundary",
    value: "Curated only",
    detail: "This route stays clean by excluding internal intake records, scoring logic, and research annotations."
  }
];

export const portfolioProjects = [
  {
    name: "Operations Control Center",
    summary: "An internal dashboard for account review, role-based access, and reporting workflows.",
    projectType: "Admin platform",
    tags: ["Next.js", "PostgreSQL", "RBAC"],
    proof: [
      "Designed multi-role access for operators, managers, and support staff",
      "Built data-heavy review screens that help teams move faster with less context switching",
      "Connected backend reporting logic to practical decision-making interfaces"
    ]
  },
  {
    name: "Subscription and Billing Console",
    summary: "A product operations surface for payment status, customer actions, and revenue reporting.",
    projectType: "Payments ops",
    tags: ["React", "Stripe", "Reporting"],
    proof: [
      "Mapped payment flows into clear operational states that support non-technical users",
      "Reduced ambiguity by pairing billing data with admin actions in one place",
      "Turned fragmented product logic into a sendable, client-understandable story"
    ]
  },
  {
    name: "Platform Stabilization Toolkit",
    summary: "A backend-focused effort centered on cleanup, monitoring, and safer ownership transfer.",
    projectType: "Maintenance and hardening",
    tags: ["NestJS", "Queues", "Observability"],
    proof: [
      "Improved reliability in a system that needed ongoing operational ownership",
      "Added the kind of visibility that makes maintenance work safer and easier to trust",
      "Framed technical cleanup as measurable risk reduction instead of vague refactoring"
    ]
  }
];

export const portfolioSteps = [
  {
    title: "Clarify the operational core",
    detail: "Define the workflows, roles, and reporting decisions the product must support first."
  },
  {
    title: "Ship the essential surfaces",
    detail: "Build the admin flows that create immediate value instead of overbuilding edge-case UI too early."
  },
  {
    title: "Harden for ownership",
    detail: "Add the monitoring, guardrails, and structure needed for confident long-term maintenance."
  }
];
