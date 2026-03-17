import Link from "next/link";
import { TopNav } from "../_components/top-nav";
import {
  portfolioCapabilities,
  portfolioProjects,
  portfolioSteps,
  portfolioTrustCards
} from "../_content/view-models";

const proofRules = [
  "No raw lead intake, no client-quality scoring, and no internal research notes",
  "Only project proof, delivery thinking, and relevant capabilities",
  "This route can later become a shareable evidence page per lead"
];

export default function PortfolioPage() {
  return (
    <main className="pageShell">
      <TopNav currentPath="/portfolio" />

      <section className="heroPanel">
        <div className="heroCopy">
          <p className="eyebrow">Client-facing preview</p>
          <h1>Show relevant proof fast, without making the client parse your operating system.</h1>
          <p className="heroText">
            This route is the public-facing side of the product. It should answer one question well:
            why you are a strong fit for this type of build, with grounded examples instead of
            generic positioning.
          </p>
        </div>
        <div className="heroActions">
          <Link className="buttonGhost" href="/admin">
            Back to admin
          </Link>
        </div>
        <div className="pillRow" aria-label="Relevant capabilities">
          {portfolioCapabilities.map((capability) => (
            <span className="proofPill" key={capability}>
              {capability}
            </span>
          ))}
        </div>
      </section>

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
            <h2>Projects that support the kind of work you want to sell.</h2>
          </div>
          <p className="sectionText">
            Right now this is a static preview. Later it should become a tailored evidence page that
            selects the best supporting projects for a specific lead.
          </p>
        </div>

        <div className="projectGrid">
          {portfolioProjects.map((project) => (
            <article className="projectCard" key={project.name}>
              <div className="projectHeader">
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.summary}</p>
                </div>
                <span className="projectType">{project.projectType}</span>
              </div>
              <div className="tagRow" aria-label={`Project tags for ${project.name}`}>
                {project.tags.map((tag) => (
                  <span className="tagPill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
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
          <h2>How I would de-risk this build.</h2>
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
          <p className="eyebrow">Public rules</p>
          <h2>What belongs in this route.</h2>
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
