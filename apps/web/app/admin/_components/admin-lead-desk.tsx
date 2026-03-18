"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

type AdminLead = {
  id: string;
  title: string;
  sourceUrl: string | null;
  summary: string | null;
  postedAt: string | null;
  status: string;
  enrichmentStatus: "NONE" | "RECOMMENDED" | "ENRICHED";
  enrichedAt: string | null;
  pricingLabel: string;
  durationText: string | null;
  workloadText: string | null;
  experienceLevel: string | null;
  clientCountry: string | null;
  clientRating: number | null;
  clientSpent: number | null;
  clientPaymentVerified: boolean | null;
  agencyRequired: boolean | null;
  dataQualityScore: number;
  dataQualityLabel: string;
  provenanceSummary: {
    jobDetailFields: number;
    emailFields: number;
  };
  tags: string[];
  needsEnrichment: boolean;
  needsEnrichmentReasons: string[];
};

type DeskPreset = "all" | "new" | "needs-enrichment" | "high-quality";

const presetOptions: Array<{ id: DeskPreset; label: string }> = [
  { id: "all", label: "All leads" },
  { id: "new", label: "New" },
  { id: "needs-enrichment", label: "Needs enrichment" },
  { id: "high-quality", label: "High quality" }
];

function formatMoney(value: number | null) {
  if (value === null) {
    return null;
  }

  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k spent`;
  }

  return `$${value} spent`;
}

function formatClient(lead: AdminLead) {
  const parts = [
    lead.clientPaymentVerified === true
      ? "Verified"
      : lead.clientPaymentVerified === false
        ? "Unverified"
        : null,
    lead.clientRating !== null ? `${lead.clientRating.toFixed(1)} rating` : null,
    formatMoney(lead.clientSpent),
    lead.clientCountry
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Client details still thin";
  }

  return parts.join(" · ");
}

function formatPostedAt(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function getEnrichmentLabel(status: AdminLead["enrichmentStatus"]) {
  if (status === "ENRICHED") {
    return "Enriched";
  }

  if (status === "RECOMMENDED") {
    return "Needs enrichment";
  }

  return "Optional";
}

function getStatusShortLabel(status: string) {
  if (status === "NEW") {
    return "N";
  }

  if (status === "REVIEWED") {
    return "R";
  }

  if (status === "IGNORED") {
    return "I";
  }

  if (status === "APPLIED") {
    return "A";
  }

  return status.slice(0, 1).toUpperCase();
}

function getEnrichmentShortLabel(status: AdminLead["enrichmentStatus"]) {
  if (status === "ENRICHED") {
    return "✓";
  }

  if (status === "RECOMMENDED") {
    return "!";
  }

  return "·";
}

function getLeadTags(lead: AdminLead) {
  const tags = [...lead.tags];

  if (lead.durationText) {
    tags.push(lead.durationText);
  }

  if (lead.workloadText) {
    tags.push(lead.workloadText);
  }

  return tags;
}

function matchesPreset(lead: AdminLead, preset: DeskPreset) {
  if (preset === "all") {
    return true;
  }

  if (preset === "new") {
    return lead.status === "NEW";
  }

  if (preset === "needs-enrichment") {
    return lead.needsEnrichment;
  }

  return (
    lead.clientPaymentVerified === true &&
    (lead.clientRating !== null || lead.clientSpent !== null || lead.dataQualityScore >= 75)
  );
}

export function AdminLeadDesk() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<DeskPreset>("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    async function loadLeads() {
      try {
        const response = await fetch("/api/leads?limit=24", {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Lead request failed with ${response.status}`);
        }

        const data = (await response.json()) as AdminLead[];
        if (!active) {
          return;
        }

        setLeads(data);
        setSelectedLeadId(data[0]?.id ?? null);
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Could not load leads.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLeads();

    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredLeads = leads.filter((lead) => {
    if (!matchesPreset(lead, preset)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      lead.title,
      lead.summary ?? "",
      lead.pricingLabel,
      lead.experienceLevel ?? "",
      lead.clientCountry ?? "",
      ...getLeadTags(lead)
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  const selectedLead =
    filteredLeads.find((lead) => lead.id === selectedLeadId) ?? filteredLeads[0] ?? null;

  const verifiedCount = leads.filter((lead) => lead.clientPaymentVerified === true).length;
  const needsEnrichmentCount = leads.filter((lead) => lead.needsEnrichment).length;
  const averageQuality =
    leads.length > 0
      ? Math.round(leads.reduce((sum, lead) => sum + lead.dataQualityScore, 0) / leads.length)
      : 0;

  if (loading) {
    return (
      <section className="panel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Lead desk</p>
            <h2>Loading lead desk.</h2>
          </div>
          <p className="sectionText">Fetching live rows.</p>
        </div>
        <div className="emptyPanel">Loading leads...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Lead desk</p>
            <h2>Lead desk unavailable.</h2>
          </div>
          <p className="sectionText">The API did not return rows.</p>
        </div>
        <div className="emptyPanel">{error}</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="deskSummaryGrid">
        <article className="deskSummaryCard">
          <span className="signalLabel">Loaded</span>
          <strong>{leads.length}</strong>
          <p>Live rows.</p>
        </article>
        <article className="deskSummaryCard">
          <span className="signalLabel">Verified clients</span>
          <strong>{verifiedCount}</strong>
          <p>Payment verified.</p>
        </article>
        <article className="deskSummaryCard">
          <span className="signalLabel">Enrichment backlog</span>
          <strong>{needsEnrichmentCount}</strong>
          <p>Need a deeper pass.</p>
        </article>
        <article className="deskSummaryCard">
          <span className="signalLabel">Average quality</span>
          <strong>{averageQuality}/100</strong>
          <p>Confidence now.</p>
        </article>
      </div>

      <div className="deskToolbar">
        <label className="deskSearch">
          <span className="miniLabel">Search</span>
          <input
            type="search"
            placeholder="Search title, summary, pricing, country, or tags"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="deskPresetGroup" aria-label="Lead desk presets">
          {presetOptions.map((option) => (
            <button
              key={option.id}
              className={option.id === preset ? "deskPresetButton isActive" : "deskPresetButton"}
              onClick={() => setPreset(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="emptyPanel">No leads stored yet.</div>
      ) : filteredLeads.length === 0 ? (
        <div className="emptyPanel">No leads match the current filters.</div>
      ) : (
        <div className="adminDeskLayout">
          <div className="leadTableWrap">
            <table className="leadTable">
              <colgroup>
                <col className="leadTableColLead" />
                <col className="leadTableColPosted" />
                <col className="leadTableColPricing" />
                <col className="leadTableColClient" />
                <col className="leadTableColTags" />
                <col className="leadTableColState" />
              </colgroup>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Posted</th>
                  <th>Pricing</th>
                  <th>Client</th>
                  <th>Top tags</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const allTags = getLeadTags(lead);
                  const visibleTags = allTags.slice(0, 2);
                  const hiddenTagCount = Math.max(allTags.length - visibleTags.length, 0);
                  const isSelected = selectedLead?.id === lead.id;

                  return (
                    <tr
                      aria-selected={isSelected}
                      className={isSelected ? "isSelected" : undefined}
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedLeadId(lead.id);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <div className="leadTableLeadCell">
                          <div className="leadTableTitle">{lead.title}</div>
                          {lead.summary ? (
                            <div className="leadTableSummary">{lead.summary}</div>
                          ) : null}
                        </div>
                      </td>
                      <td className="leadTableMuted">{formatPostedAt(lead.postedAt)}</td>
                      <td className="leadTableMuted">{lead.pricingLabel}</td>
                      <td className="leadTableMuted">{formatClient(lead)}</td>
                      <td>
                        <div className="leadTablePills">
                          {visibleTags.length > 0 ? (
                            <>
                              {visibleTags.map((tag) => (
                                <span className="tagPill" key={`${lead.id}-${tag}`}>
                                  {tag}
                                </span>
                              ))}
                              {hiddenTagCount > 0 ? (
                                <span className="tagPill" key={`${lead.id}-tag-overflow`}>
                                  +{hiddenTagCount}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="leadTableMuted">No tags yet</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="leadTableState">
                          <span
                            aria-label={`Lead status: ${lead.status}`}
                            className={`tableStateBadge tableStateStatus status${lead.status.toLowerCase()}`}
                            title={`Lead status: ${lead.status}`}
                          >
                            {getStatusShortLabel(lead.status)}
                          </span>
                          <span
                            aria-label={getEnrichmentLabel(lead.enrichmentStatus)}
                            className={`tableStateBadge tableStateEnrichment enrichment${lead.enrichmentStatus.toLowerCase()}`}
                            title={getEnrichmentLabel(lead.enrichmentStatus)}
                          >
                            {getEnrichmentShortLabel(lead.enrichmentStatus)}
                          </span>
                          <span
                            aria-label={`Data quality ${lead.dataQualityScore}`}
                            className="tableStateBadge tableStateQuality"
                            title={`Data quality ${lead.dataQualityScore}`}
                          >
                            {lead.dataQualityScore}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <aside className="leadInspector">
            {selectedLead ? (
              <>
                <div className="leadInspectorHeader">
                  <div className="leadInspectorTitle">
                    <p className="eyebrow">Inspector</p>
                    <h3>{selectedLead.title}</h3>
                  </div>
                  <div className="pillStack">
                    <span
                      className={`enrichmentPill enrichment${selectedLead.enrichmentStatus.toLowerCase()}`}
                    >
                      {getEnrichmentLabel(selectedLead.enrichmentStatus)}
                    </span>
                    <span className={`statusPill status${selectedLead.status.toLowerCase()}`}>
                      {selectedLead.status}
                    </span>
                  </div>
                </div>

                <p className="leadInspectorSummary">{selectedLead.summary ?? "No summary yet."}</p>

                <div className="leadInspectorMetrics">
                  <div className="leadInspectorMetric">
                    <span className="miniLabel">Posted</span>
                    <strong>{formatPostedAt(selectedLead.postedAt)}</strong>
                  </div>
                  <div className="leadInspectorMetric">
                    <span className="miniLabel">Pricing</span>
                    <strong>{selectedLead.pricingLabel}</strong>
                  </div>
                  <div className="leadInspectorMetric">
                    <span className="miniLabel">Quality</span>
                    <strong>
                      {selectedLead.dataQualityScore}/100 · {selectedLead.dataQualityLabel}
                    </strong>
                  </div>
                  <div className="leadInspectorMetric">
                    <span className="miniLabel">Client</span>
                    <strong>{formatClient(selectedLead)}</strong>
                  </div>
                </div>

                <div className="leadInspectorSection">
                  <p className="miniLabel">Provenance</p>
                  <div className="reasonRow">
                    <span className="reasonPill">
                      Email fields: {selectedLead.provenanceSummary.emailFields}
                    </span>
                    <span className="reasonPill">
                      Job detail fields: {selectedLead.provenanceSummary.jobDetailFields}
                    </span>
                  </div>
                </div>

                <div className="leadInspectorSection">
                  <p className="miniLabel">Gaps</p>
                  <div className="reasonRow">
                    {selectedLead.needsEnrichmentReasons.length > 0 ? (
                      selectedLead.needsEnrichmentReasons.map((reason) => (
                        <span className="reasonPill" key={reason}>
                          {reason}
                        </span>
                      ))
                    ) : (
                      <span className="reasonPill">No blockers flagged</span>
                    )}
                  </div>
                </div>

                <div className="leadInspectorSection">
                  <p className="miniLabel">Tags</p>
                  <div className="tagRow">
                    {getLeadTags(selectedLead).length > 0 ? (
                      getLeadTags(selectedLead).map((tag) => (
                        <span className="tagPill" key={`${selectedLead.id}-inspector-${tag}`}>
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="leadTableMuted">No tags or timing markers stored yet.</span>
                    )}
                  </div>
                </div>

                <div className="leadInspectorActions">
                  <Link
                    className="buttonLink"
                    href={{
                      pathname: "/portfolio",
                      query: {
                        lead: selectedLead.title,
                        tags: selectedLead.tags.join("|")
                      }
                    }}
                  >
                    Proof pack
                  </Link>

                  <Link
                    className="buttonGhost"
                    href={{
                      pathname: "/admin/enrich",
                      query: {
                        leadId: selectedLead.id,
                        title: selectedLead.title
                      }
                    }}
                  >
                    {selectedLead.enrichmentStatus === "ENRICHED"
                      ? "Update"
                      : "Enrich"}
                  </Link>

                  {selectedLead.sourceUrl ? (
                    <a
                      className="buttonGhost"
                      href={selectedLead.sourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open source
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="emptyPanel">Select a lead.</div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
