import Link from "next/link";
import { TopNav } from "./_components/top-nav";
import { modeCards } from "./_content/view-models";

const separationNotes = [
  {
    title: "Admin view",
    detail: "Internal-only context for triage, tagging, gap analysis, and deciding what is worth building or pitching next."
  },
  {
    title: "Portfolio view",
    detail: "External proof that stays narrow: relevant projects, concrete outcomes, and a grounded plan without internal notes."
  }
];

export default function HomePage() {
  return (
    <main className="pageShell">
      <TopNav currentPath="/" />

      <section className="heroPanel heroPanelWide">
        <div className="heroCopy">
          <p className="eyebrow">Audience split</p>
          <h1>Two views. One for operating the pipeline, one for winning the conversation.</h1>
          <p className="heroText">
            The report really describes two products sharing the same data: an internal admin desk
            for deciding where to focus, and a client-facing proof page for showing fit. Mixing
            those concerns on one screen makes both weaker.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Choose a mode</p>
            <h2>Start with a route structure that matches the audience.</h2>
          </div>
          <p className="sectionText">
            This gives the app a stable boundary now, before real data wiring and public evidence
            pages make that split harder to retrofit.
          </p>
        </div>

        <div className="modeGrid">
          {modeCards.map((mode) => (
            <article className="modeCard" key={mode.href}>
              <div className="modeMeta">
                <p className="eyebrow">{mode.eyebrow}</p>
                <h3>{mode.title}</h3>
                <p>{mode.summary}</p>
              </div>
              <div className="modeList">
                {mode.points.map((point) => (
                  <div className="listRow" key={point}>
                    <span className="screenDot" aria-hidden="true" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
              <div className="modeActions">
                <Link className="buttonLink" href={mode.href}>
                  {mode.cta}
                </Link>
                <p className="microCopy">{mode.audience}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel boundaryPanel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Boundary</p>
            <h2>Keep internal signal and external proof separate from the start.</h2>
          </div>
          <p className="sectionText">
            The client should never see inbox mechanics, raw intake payloads, ratings filters, or
            portfolio gap notes. The public view should only expose curated proof.
          </p>
        </div>

        <div className="boundaryGrid">
          {separationNotes.map((note) => (
            <article className="boundaryCard" key={note.title}>
              <h3>{note.title}</h3>
              <p>{note.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
