import Link from "next/link";
import { TopNav } from "../_components/top-nav";
import {
  portfolioCapabilities,
  portfolioProjects,
  portfolioSteps,
  portfolioTrustCards
} from "../_content/view-models";

const proofRules = [
  "Only selected proof",
  "No intake or scoring",
  "Tailor by lead when needed"
];

type PortfolioPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function slugifyProjectName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parseLeadTags(value?: string | string[]) {
  return normalizeParam(value)
    .split("|")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function scoreProjectForLead(project: (typeof portfolioProjects)[number], leadTitle: string, leadTags: string[]) {
  const normalizedLeadTags = new Set(leadTags.map((tag) => tag.toLowerCase()));
  const matchedTags = project.tags.filter((tag) => normalizedLeadTags.has(tag.toLowerCase()));
  const normalizedTitle = leadTitle.toLowerCase();
  const titleSignals = [
    project.projectType.toLowerCase(),
    ...project.tags.map((tag) => tag.toLowerCase())
  ];

  const titleBonus = titleSignals.some((token) => normalizedTitle.includes(token)) ? 1 : 0;

  return {
    matchedTags,
    score: matchedTags.length * 2 + titleBonus
  };
}

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const params = (await searchParams) ?? {};
  const leadTitle = normalizeParam(params.lead).trim();
  const leadTags = parseLeadTags(params.tags);
  const isTailoredProof = leadTitle.length > 0;

  const rankedProjects = portfolioProjects
    .map((project) => {
      const matching = scoreProjectForLead(project, leadTitle, leadTags);

      return {
        ...project,
        anchorId: slugifyProjectName(project.name),
        matchedTags: matching.matchedTags,
        matchScore: matching.score
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore || left.name.localeCompare(right.name));

  const featuredProjects = isTailoredProof
    ? rankedProjects.filter((project) => project.matchScore > 0).slice(0, 3)
    : [];
  const visibleProjects =
    isTailoredProof && featuredProjects.length > 0 ? featuredProjects : rankedProjects;
  const hasExplicitProofLinks = visibleProjects.some((project) => project.links.length > 0);

  return (
    <main className="pageShell">
      <TopNav currentPath="/portfolio" />

      <section className="heroPanel">
        <div className="heroCopy">
          <p className="eyebrow">{isTailoredProof ? "Tailored proof" : "Portfolio"}</p>
          <h1>
            {isTailoredProof ? `Proof for ${leadTitle}.` : "Selected proof, quietly framed."}
          </h1>
          <p className="heroText">
            {isTailoredProof
              ? "Ranked by shared tags so you can start with the closest examples."
              : "A cleaner layer for fit, capability, and selected work."}
          </p>
        </div>
        <div className="heroActions">
          {isTailoredProof ? (
            <Link className="buttonGhost" href="/portfolio">
              Full portfolio
            </Link>
          ) : null}
        </div>
        <div className="pillRow" aria-label="Relevant capabilities">
          {(isTailoredProof && leadTags.length > 0 ? leadTags : portfolioCapabilities).map((capability) => (
            <span className="proofPill" key={capability}>
              {capability}
            </span>
          ))}
        </div>
      </section>

      {isTailoredProof ? (
        <section className="panel">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Proof pack</p>
              <h2>Start with the closest examples.</h2>
            </div>
            <p className="sectionText">Ranked by shared tags.</p>
          </div>

          <div className="proofPackGrid">
            <article className="proofPackCard">
              <span className="signalLabel">Lead</span>
              <h3>{leadTitle}</h3>
              <p>Keep the proof tight and relevant.</p>
            </article>

            <article className="proofPackCard">
              <span className="signalLabel">Best matching examples</span>
              <div className="proofMatchList">
                {featuredProjects.length > 0 ? (
                  featuredProjects.map((project) => (
                    <a className="proofMatchLink" href={`#${project.anchorId}`} key={project.anchorId}>
                      {project.name}
                    </a>
                  ))
                ) : (
                  <p className="microCopy">
                    No direct tag match yet. Use the strongest general proof below.
                  </p>
                )}
              </div>
              <p className="microCopy">
                {hasExplicitProofLinks
                  ? "GitHub and demo links appear on matching cards."
                  : "Links will appear here as you add them to projects."}
              </p>
            </article>
          </div>
        </section>
      ) : null}

      <section className="trustGrid">
        {portfolioTrustCards.map((card) => (
          <article className="trustCard" key={card.label}>
            <span className="signalLabel">{card.label}</span>
            <h3>{card.value}</h3>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Selected proof</p>
            <h2>
              {isTailoredProof ? "Examples ranked for this lead." : "Projects that support the work you want to sell."}
            </h2>
          </div>
          <p className="sectionText">
            {isTailoredProof
              ? "Already sorted by overlap."
              : "Selected proof, not a project dump."}
          </p>
        </div>

        <div className="projectGrid">
          {visibleProjects.map((project) => (
            <article
              className={project.matchScore > 0 ? "projectCard projectCardMatched" : "projectCard"}
              id={project.anchorId}
              key={project.name}
            >
              <div className="projectHeader">
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.summary}</p>
                </div>
                <span className="projectType">{project.projectType}</span>
              </div>

              {isTailoredProof ? (
                <div className="projectMatchMeta">
                  <span className="miniLabel">Match</span>
                  <strong>
                    {project.matchScore > 0
                      ? `${project.matchedTags.length} shared tag${project.matchedTags.length === 1 ? "" : "s"}`
                      : "General proof"}
                  </strong>
                </div>
              ) : null}

              <div className="tagRow" aria-label={`Project tags for ${project.name}`}>
                {project.tags.map((tag) => (
                  <span className="tagPill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>

              {isTailoredProof && project.matchedTags.length > 0 ? (
                <div className="proofMatchTags">
                  {project.matchedTags.map((tag) => (
                    <span className="proofPill" key={`${project.name}-${tag}`}>
                      Shared: {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {project.links.length > 0 ? (
                <div className="projectLinkRow">
                  {project.links.map((link) => (
                    <a
                      className="projectLinkPill"
                      href={link.href}
                      key={`${project.name}-${link.label}-${link.href}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}

              <div className="modeList">
                {project.proof.map((item) => (
                  <div className="listRow" key={item}>
                    <span className="screenDot" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panelSplit">
        <div>
          <p className="eyebrow">Approach</p>
          <h2>How I would de-risk the build.</h2>
          <div className="timelineList">
            {portfolioSteps.map((step, index) => (
              <article className="timelineCard" key={step.title}>
                <span className="stepNumber">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="noteCard">
          <p className="eyebrow">Boundary</p>
          <h2>Keep it public.</h2>
          <div className="modeList">
            {proofRules.map((rule) => (
              <div className="listRow" key={rule}>
                <span className="screenDot" aria-hidden="true" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
