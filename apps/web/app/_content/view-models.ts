export const modeCards = [
  {
    href: "/portfolio",
    eyebrow: "Proof",
    title: "Portfolio",
    summary: "A quieter proof layer for fit, delivery taste, and selected work.",
    points: [
      "Selected work only",
      "Relevant stacks and proof points",
      "No intake or scoring noise"
    ],
    cta: "Open portfolio",
    audience: "External"
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
  "Dashboards",
  "RBAC",
  "Backend systems",
  "Payments",
  "Stabilization"
];

export const portfolioTrustCards = [
  {
    label: "Fit",
    value: "Ops-heavy product work",
    detail: "Best where product logic and internal workflows meet."
  },
  {
    label: "Tone",
    value: "Specific, not loud",
    detail: "The work is framed with clear outcomes and visible constraints."
  },
  {
    label: "Boundary",
    value: "Curated only",
    detail: "No intake records, no scoring logic, no internal notes."
  }
];

export type PortfolioProjectLink = {
  label: string;
  href: string;
};

export type PortfolioProject = {
  name: string;
  summary: string;
  projectType: string;
  tags: string[];
  links: PortfolioProjectLink[];
  proof: string[];
};

export const portfolioProjects: PortfolioProject[] = [
  {
    name: "Operations Control Center",
    summary: "An internal dashboard for review workflows, access control, and reporting.",
    projectType: "Admin platform",
    tags: ["Next.js", "PostgreSQL", "RBAC"],
    links: [],
    proof: [
      "Multi-role access for operators, managers, and support",
      "Dense review screens built for speed",
      "Reporting tied directly to decisions"
    ]
  },
  {
    name: "Subscription and Billing Console",
    summary: "A product operations surface for billing state, customer actions, and revenue reporting.",
    projectType: "Payments ops",
    tags: ["React", "Stripe", "Reporting"],
    links: [],
    proof: [
      "Payment flows mapped into clear states",
      "Billing data paired with action controls",
      "Complex logic translated into a sendable story"
    ]
  },
  {
    name: "Platform Stabilization Toolkit",
    summary: "A backend-focused effort centered on cleanup, monitoring, and safer ownership handoff.",
    projectType: "Maintenance and hardening",
    tags: ["NestJS", "Queues", "Observability"],
    links: [],
    proof: [
      "Reliability work for a system under active ownership",
      "Observability added where trust was thin",
      "Cleanup framed as measurable risk reduction"
    ]
  }
];

export const portfolioSteps = [
  {
    title: "Clarify the core workflow",
    detail: "Start with the roles, decisions, and reporting loops that matter."
  },
  {
    title: "Ship the essential surfaces",
    detail: "Build the useful path first and leave edge cases for later."
  },
  {
    title: "Harden for ownership",
    detail: "Add the guardrails and visibility that make long-term maintenance safe."
  }
];
