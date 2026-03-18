import Link from "next/link";
import { getApiBaseUrl } from "./api/_lib/upstream";
import { OverviewChartsShell } from "./_components/overview-charts-shell";
import { TopNav } from "./_components/top-nav";
import { modeCards } from "./_content/view-models";

type OverviewLead = {
  clientPaymentVerified: boolean | null;
  dataQualityLabel: string;
  dataQualityScore: number;
  enrichmentStatus: "NONE" | "RECOMMENDED" | "ENRICHED";
  postedAt: string | null;
  status: string;
  tags: string[];
};

type OverviewSnapshot = {
  averageQuality: number;
  enrichedCount: number;
  needsEnrichmentCount: number;
  qualityBands: Array<{
    count: number;
    label: string;
  }>;
  recentVolume: Array<{
    count: number;
    isoDate: string;
    label: string;
  }>;
  topTags: Array<{
    count: number;
    label: string;
  }>;
  totalLeads: number;
  verifiedCount: number;
};

function toShortDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(value);
}

function buildRecentVolume(leads: OverviewLead[]) {
  const dayCount = 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const counts = new Map<string, number>();

  for (let index = dayCount - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    counts.set(date.toISOString().slice(0, 10), 0);
  }

  for (const lead of leads) {
    if (!lead.postedAt) {
      continue;
    }

    const dayKey = new Date(lead.postedAt).toISOString().slice(0, 10);
    if (!counts.has(dayKey)) {
      continue;
    }

    counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([isoDate, count]) => ({
    count,
    isoDate,
    label: toShortDateLabel(new Date(`${isoDate}T00:00:00.000Z`))
  }));
}

function buildQualityBands(leads: OverviewLead[]) {
  const counts = new Map<string, number>([
    ["Strong", 0],
    ["Good", 0],
    ["Workable", 0],
    ["Thin", 0]
  ]);

  for (const lead of leads) {
    const key = counts.has(lead.dataQualityLabel) ? lead.dataQualityLabel : "Thin";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

function buildTopTags(leads: OverviewLead[]) {
  const counts = new Map<string, number>();

  for (const lead of leads) {
    for (const tag of lead.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const topEntries = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6);

  return topEntries.map(([label, count]) => ({
    label,
    count
  }));
}

function summarizeLeads(leads: OverviewLead[]): OverviewSnapshot {
  const totalLeads = leads.length;
  const verifiedCount = leads.filter((lead) => lead.clientPaymentVerified === true).length;
  const needsEnrichmentCount = leads.filter(
    (lead) => lead.enrichmentStatus === "RECOMMENDED"
  ).length;
  const enrichedCount = leads.filter((lead) => lead.enrichmentStatus === "ENRICHED").length;
  const qualityTotal = leads.reduce((sum, lead) => sum + lead.dataQualityScore, 0);

  return {
    averageQuality: totalLeads > 0 ? Math.round(qualityTotal / totalLeads) : 0,
    enrichedCount,
    needsEnrichmentCount,
    qualityBands: buildQualityBands(leads),
    recentVolume: buildRecentVolume(leads),
    topTags: buildTopTags(leads),
    totalLeads,
    verifiedCount
  };
}

async function loadOverviewSnapshot() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/leads?limit=50`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const leads = (await response.json()) as OverviewLead[];
    return summarizeLeads(leads);
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const snapshot = await loadOverviewSnapshot();
  const verifiedShare = snapshot
    ? Math.round((snapshot.verifiedCount / Math.max(snapshot.totalLeads, 1)) * 100)
    : 0;

  return (
    <main className="pageShell">
      <TopNav currentPath="/" />

      <section className="heroPanel heroPanelWide heroPanelLanding">
        <div className="heroLandingIntro">
          <h1>Calm systems for operational products.</h1>
          <p className="heroText">
            I design and build admin dashboards, backend workflows, and client-facing product
            surfaces with a focus on clarity, reliability, and practical delivery.
          </p>
        </div>

        {snapshot ? (
          <div className="overviewStatGrid">
            <article className="overviewStatCard">
              <span className="miniLabel">Total leads</span>
              <strong>{snapshot.totalLeads}</strong>
              <p>Stored now.</p>
            </article>
            <article className="overviewStatCard">
              <span className="miniLabel">Verified clients</span>
              <strong>{verifiedShare}%</strong>
              <p>Payment verified.</p>
            </article>
            <article className="overviewStatCard">
              <span className="miniLabel">Needs enrichment</span>
              <strong>{snapshot.needsEnrichmentCount}</strong>
              <p>Still thin.</p>
            </article>
            <article className="overviewStatCard">
              <span className="miniLabel">Enriched</span>
              <strong>{snapshot.enrichedCount}</strong>
              <p>Already deepened.</p>
            </article>
          </div>
        ) : (
          <div className="heroActions heroLandingActions">
            <Link className="buttonLink" href="/portfolio">
              View portfolio
            </Link>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Snapshot</p>
            <h2>{snapshot ? "Flow, quality, demand." : "Live metrics unavailable right now."}</h2>
          </div>
          <p className="sectionText">
            {snapshot
              ? "Three quick reads. Nothing more."
              : "Public snapshot will appear here when data is available."}
          </p>
        </div>

        {snapshot ? (
          <OverviewChartsShell
            qualityBands={snapshot.qualityBands}
            recentVolume={snapshot.recentVolume}
            topTags={snapshot.topTags}
          />
        ) : (
          <div className="overviewEmptyState">
            <p>Live snapshot is temporarily unavailable.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Routes</p>
            <h2>Choose the next surface.</h2>
          </div>
          <p className="sectionText">Overview stays summary-only.</p>
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
    </main>
  );
}
