"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type FormState = {
  title?: string;
  sourceUrl?: string;
  rawText?: string;
  rawHtml?: string;
  durationText?: string;
  workloadText?: string;
  clientCountry?: string;
  clientRating?: string;
  clientSpent?: string;
  clientPaymentVerified?: boolean;
  agencyRequired?: boolean;
};

type EnrichmentFormProps = {
  leadId?: string;
  leadTitle?: string;
};

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function EnrichmentForm({ leadId, leadTitle }: EnrichmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({
    title: leadTitle ?? ""
  });

  if (!leadId) {
    return (
      <section className="panel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Manual enrichment</p>
            <h2>Select a lead from the admin desk first.</h2>
          </div>
        </div>
        <div className="emptyPanel">
          Open this screen from the lead list so the form knows which row to enrich.
        </div>
      </section>
    );
  }

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const payload = {
        title: formState.title?.trim() || undefined,
        sourceUrl: formState.sourceUrl?.trim() || undefined,
        rawText: formState.rawText?.trim() || undefined,
        rawHtml: formState.rawHtml?.trim() || undefined,
        durationText: formState.durationText?.trim() || undefined,
        workloadText: formState.workloadText?.trim() || undefined,
        clientCountry: formState.clientCountry?.trim() || undefined,
        clientRating: toOptionalNumber(formState.clientRating ?? ""),
        clientSpent: toOptionalNumber(formState.clientSpent ?? ""),
        clientPaymentVerified: formState.clientPaymentVerified,
        agencyRequired: formState.agencyRequired
      };

      try {
        const response = await fetch(`/api/leads/${leadId}/enrich`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(result?.message ?? `Enrichment failed with ${response.status}`);
        }

        setSuccess("Lead enrichment stored.");
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Could not save enrichment.");
      }
    });
  }

  return (
    <section className="panel">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Manual enrichment</p>
          <h2>Paste the real job-page content for the lead you care about.</h2>
        </div>
        <p className="sectionText">
          This stores the job-page payload as a separate intake record and updates the lead with
          any safer structured details you provide.
        </p>
      </div>

      <div className="enrichmentHeader">
        <div className="enrichmentSummary">
          <span className="miniLabel">Lead</span>
          <strong>{leadTitle ?? leadId}</strong>
        </div>
        <Link className="buttonGhost" href="/admin">
          Back to admin
        </Link>
      </div>

      <form className="enrichmentForm" onSubmit={handleSubmit}>
        <div className="fieldGrid">
          <label className="formField">
            <span>Lead title</span>
            <input
              type="text"
              value={formState.title ?? ""}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Optional if the existing title is already correct"
            />
          </label>

          <label className="formField">
            <span>Job URL</span>
            <input
              type="url"
              value={formState.sourceUrl ?? ""}
              onChange={(event) => updateField("sourceUrl", event.target.value)}
              placeholder="https://www.upwork.com/jobs/..."
            />
          </label>
        </div>

        <label className="formField formFieldWide">
          <span>Job page text</span>
          <textarea
            rows={12}
            value={formState.rawText ?? ""}
            onChange={(event) => updateField("rawText", event.target.value)}
            placeholder="Paste the full visible text from the Upwork job page"
          />
        </label>

        <label className="formField formFieldWide">
          <span>Job page HTML</span>
          <textarea
            rows={8}
            value={formState.rawHtml ?? ""}
            onChange={(event) => updateField("rawHtml", event.target.value)}
            placeholder="Optional raw HTML or DOM dump for later reprocessing"
          />
        </label>

        <div className="fieldGrid fieldGridCompact">
          <label className="formField">
            <span>Duration</span>
            <input
              type="text"
              value={formState.durationText ?? ""}
              onChange={(event) => updateField("durationText", event.target.value)}
              placeholder="Optional override"
            />
          </label>

          <label className="formField">
            <span>Workload</span>
            <input
              type="text"
              value={formState.workloadText ?? ""}
              onChange={(event) => updateField("workloadText", event.target.value)}
              placeholder="Optional override"
            />
          </label>

          <label className="formField">
            <span>Client country</span>
            <input
              type="text"
              value={formState.clientCountry ?? ""}
              onChange={(event) => updateField("clientCountry", event.target.value)}
              placeholder="Optional override"
            />
          </label>

          <label className="formField">
            <span>Client rating</span>
            <input
              type="number"
              step="0.01"
              value={formState.clientRating ?? ""}
              onChange={(event) => updateField("clientRating", event.target.value)}
              placeholder="Optional override"
            />
          </label>

          <label className="formField">
            <span>Client spent</span>
            <input
              type="number"
              step="0.01"
              value={formState.clientSpent ?? ""}
              onChange={(event) => updateField("clientSpent", event.target.value)}
              placeholder="Optional override"
            />
          </label>
        </div>

        <div className="toggleRow">
          <label className="toggleField">
            <input
              type="checkbox"
              checked={Boolean(formState.clientPaymentVerified)}
              onChange={(event) => updateField("clientPaymentVerified", event.target.checked)}
            />
            <span>Payment verified</span>
          </label>

          <label className="toggleField">
            <input
              type="checkbox"
              checked={Boolean(formState.agencyRequired)}
              onChange={(event) => updateField("agencyRequired", event.target.checked)}
            />
            <span>Agency required</span>
          </label>
        </div>

        {error ? <p className="formMessage formError">{error}</p> : null}
        {success ? <p className="formMessage formSuccess">{success}</p> : null}

        <div className="formActions">
          <button className="buttonLink" type="submit" disabled={isPending}>
            {isPending ? "Saving enrichment..." : "Save enrichment"}
          </button>
          <Link className="buttonGhost" href="/admin">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
