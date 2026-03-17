import Link from "next/link";
import { AdminLeadDesk } from "./_components/admin-lead-desk";
import { TopNav } from "../_components/top-nav";
import {
  adminFocusCards,
  adminGapCards
} from "../_content/view-models";

const internalAssets = [
  "Recurring stacks and project types across the inbox",
  "Client quality filters such as verified payment, rating, and spend",
  "Portfolio gap notes that tell you what proof to build next"
];

export default function AdminPage() {
  return (
    <main className="pageShell">
      <TopNav currentPath="/admin" />

      <section className="heroPanel">
        <div className="heroCopy">
          <p className="eyebrow">Internal view</p>
          <h1>Admin mode is for prioritizing demand, not impressing a client.</h1>
          <p className="heroText">
            This screen is the operating desk: what is recurring, what deserves attention, and
            which proof gaps are worth closing because they will pay off across multiple proposals.
          </p>
        </div>
        <div className="heroActions">
          <Link className="buttonLink" href="/portfolio">
            Preview portfolio view
          </Link>
        </div>
        <div className="focusGrid">
          {adminFocusCards.map((card) => (
            <article className="focusCard" key={card.label}>
              <span className="signalLabel">{card.label}</span>
              <h3>{card.value}</h3>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panelSplit">
        <div>
          <p className="eyebrow">Focus areas</p>
          <h2>What to build or emphasize next.</h2>
          <p className="sectionText">
            These are internal recommendations driven by recurring demand and weak public proof.
          </p>
          <div className="gapGrid">
            {adminGapCards.map((gap) => (
              <article className="gapCard" key={gap.title}>
                <h3>{gap.title}</h3>
                <p>{gap.detail}</p>
                <div className="metricList">
                  <div className="metricRow">
                    <span className="miniLabel">Demand</span>
                    <strong>{gap.demand}</strong>
                  </div>
                  <div className="metricRow">
                    <span className="miniLabel">Gap</span>
                    <strong>{gap.gap}</strong>
                  </div>
                  <div className="metricRow">
                    <span className="miniLabel">Next move</span>
                    <strong>{gap.nextMove}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="noteCard">
          <p className="eyebrow">Internal-only data</p>
          <h2>Safe to expose here, not on a portfolio page.</h2>
          <div className="modeList">
            {internalAssets.map((item) => (
              <div className="listRow" key={item}>
                <span className="screenDot" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
      <AdminLeadDesk />
    </main>
  );
}
