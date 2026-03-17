"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdminLead = {
  id: string;
  title: string;
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
  summary: string | null;
};

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
    lead.clientRating !== null ? `${lead.clientRating.toFixed(2)} rating` : null,
    formatMoney(lead.clientSpent),
    lead.clientCountry
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Client details still thin";
  }

  return parts.join(" · ");
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

export function AdminLeadDesk() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadLeads() {
      try {
        const response = await fetch("/api/leads?limit=12", {
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

  if (loading) {
    return (
      <section className="panel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Lead radar</p>
            <h2>Loading the live lead desk.</h2>
          </div>
          <p className="sectionText">
            Pulling current rows from the API so enrichment actions can target real leads.
          </p>
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
            <p className="eyebrow">Lead radar</p>
            <h2>The live lead desk is unavailable.</h2>
          </div>
          <p className="sectionText">
            The admin UI could not load the API right now, so enrichment actions are blocked.
          </p>
        </div>
        <div className="emptyPanel">{error}</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Lead radar</p>
          <h2>Shortlist leads that deserve a full job-page pass.</h2>
        </div>
        <p className="sectionText">
          The enrich action is for promising rows where the email alert is too thin to support a
          confident apply-or-ignore decision.
        </p>
      </div>

      <div className="filterRow" aria-label="Lead desk status filters">
        <span className="filterChip">Live data</span>
        <span className="filterChip">Last 12 leads</span>
        <span className="filterChip">Enrichment-aware</span>
      </div>

      {leads.length === 0 ? (
        <div className="emptyPanel">No leads are stored yet.</div>
      ) : (
        <div className="leadList" role="list">
          {leads.map((lead) => (
            <article className="leadRow" key={lead.id} role="listitem">
              <div className="leadPrimary">
                <div className="leadTitleRow">
                  <div className="leadTitleStack">
                    <h3>{lead.title}</h3>
                    <p className="leadNote">{lead.summary ?? "No summary stored yet."}</p>
                  </div>
                  <div className="pillStack">
                    <span className={`enrichmentPill enrichment${lead.enrichmentStatus.toLowerCase()}`}>
                      {getEnrichmentLabel(lead.enrichmentStatus)}
                    </span>
                    <span className={`statusPill status${lead.status.toLowerCase()}`}>{lead.status}</span>
                  </div>
                </div>
              </div>

              <div className="leadMeta">
                <span>
                  Quality {lead.dataQualityScore}/100 · {lead.dataQualityLabel}
                </span>
                <span>{lead.pricingLabel}</span>
                <span>{lead.experienceLevel ?? "Level n/a"}</span>
                <span>{formatClient(lead)}</span>
              </div>

              <div className="reasonRow">
                <span className="reasonPill">
                  Provenance: {lead.provenanceSummary.emailFields} email
                </span>
                <span className="reasonPill">
                  Job detail: {lead.provenanceSummary.jobDetailFields}
                </span>
              </div>

              <div className="tagRow" aria-label={`Tags for ${lead.title}`}>
                {lead.tags.map((tag) => (
                  <span className="tagPill" key={tag}>
                    {tag}
                  </span>
                ))}
                {lead.durationText ? <span className="tagPill">{lead.durationText}</span> : null}
                {lead.workloadText ? <span className="tagPill">{lead.workloadText}</span> : null}
              </div>

              {lead.needsEnrichmentReasons.length > 0 ? (
                <div className="reasonRow">
                  {lead.needsEnrichmentReasons.map((reason) => (
                    <span className="reasonPill" key={reason}>
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="actionRow">
                <Link
                  className="buttonGhost"
                  href={{
                    pathname: "/admin/enrich",
                    query: {
                      leadId: lead.id,
                      title: lead.title
                    }
                  }}
                >
                  {lead.enrichmentStatus === "ENRICHED" ? "Update enrichment" : "Enrich this lead"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
