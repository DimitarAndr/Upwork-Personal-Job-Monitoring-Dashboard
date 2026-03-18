import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  EnrichmentStatus,
  FieldConfidence,
  PricingType,
  Prisma,
  SourceType
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLeadEnrichmentDto } from "./dto/create-lead-enrichment.dto";
import { isLikelyUpworkJobAlert } from "../intake/upwork-job-alert";

const MANUAL_PARSE_VERSION = "manual-job-detail-v1";

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async listLeads(limit?: string) {
    const take = this.parseLimit(limit);
    const leads = await this.prisma.lead.findMany({
      orderBy: [
        {
          postedAt: "desc"
        },
        {
          createdAt: "desc"
        }
      ],
      take,
      include: {
        fieldProvenance: {
          orderBy: {
            extractedAt: "desc"
          },
          select: {
            fieldName: true,
            sourceChannel: true,
            confidence: true,
            extractedAt: true
          }
        },
        leadTerms: {
          orderBy: {
            createdAt: "asc"
          },
          select: {
            term: {
              select: {
                label: true
              }
            }
          }
        }
      }
    });

    return leads
      .filter((lead) => {
        if (lead.sourceType !== SourceType.EMAIL_ALERT) {
          return true;
        }

        return isLikelyUpworkJobAlert({
          title: lead.title,
          rawText: lead.rawText,
          sourceUrl: lead.sourceUrl
        });
      })
      .map((lead) => {
      const needsEnrichmentReasons = this.getEnrichmentReasons(lead);
      const latestFieldProvenance = this.getLatestFieldProvenance(lead.fieldProvenance);
      const dataQuality = this.calculateDataQuality(lead, latestFieldProvenance);

      return {
        id: lead.id,
        title: lead.title,
        status: lead.status,
        enrichmentStatus: lead.enrichmentStatus,
        enrichedAt: lead.enrichedAt,
        sourceUrl: lead.sourceUrl,
        summary: lead.summary,
        postedAt: lead.postedAt,
        pricingType: lead.pricingType,
        pricingLabel: this.formatPricing(lead),
        durationText: lead.durationText,
        workloadText: lead.workloadText,
        experienceLevel: lead.experienceLevel,
        clientCountry: lead.clientCountry,
        clientRating: lead.clientRating ? Number(lead.clientRating) : null,
        clientSpent: lead.clientSpent ? Number(lead.clientSpent) : null,
        clientPaymentVerified: lead.clientPaymentVerified,
        agencyRequired: lead.agencyRequired,
        dataQualityScore: dataQuality.score,
        dataQualityLabel: dataQuality.label,
        provenanceSummary: dataQuality.provenanceSummary,
        tags: lead.leadTerms.map((entry) => entry.term.label),
        needsEnrichment: lead.enrichmentStatus !== EnrichmentStatus.ENRICHED,
        needsEnrichmentReasons
      };
      });
  }

  async enrichLead(leadId: string, payload: CreateLeadEnrichmentDto) {
    const existingLead = await this.prisma.lead.findUnique({
      where: {
        id: leadId
      }
    });

    if (!existingLead) {
      throw new NotFoundException(`Lead ${leadId} was not found.`);
    }

    const data = this.validateEnrichmentPayload(payload);
    const rawText = data.rawText ?? (data.rawHtml ? this.stripHtml(data.rawHtml) : undefined);

    if (!rawText) {
      throw new BadRequestException("rawText or rawHtml is required for manual enrichment.");
    }

    const inferred = this.inferFromRawText(rawText);
    const summary = data.summary ?? rawText.slice(0, 280);
    const sourceUrl = data.sourceUrl ?? existingLead.sourceUrl;
    const pricingType = this.pickPricingType(
      data.pricingType,
      inferred.pricingType,
      existingLead.pricingType
    );
    const now = new Date();

    const updatedLead = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: {
          id: leadId
        },
        data: {
          title: data.title ?? existingLead.title,
          sourceUrl,
          rawText,
          summary,
          pricingType,
          hourlyMin: data.hourlyMin ?? inferred.hourlyMin ?? existingLead.hourlyMin,
          hourlyMax: data.hourlyMax ?? inferred.hourlyMax ?? existingLead.hourlyMax,
          fixedBudgetMin: data.fixedBudgetMin ?? inferred.fixedBudgetMin ?? existingLead.fixedBudgetMin,
          fixedBudgetMax: data.fixedBudgetMax ?? existingLead.fixedBudgetMax,
          durationText: data.durationText ?? inferred.durationText ?? existingLead.durationText,
          workloadText: data.workloadText ?? inferred.workloadText ?? existingLead.workloadText,
          experienceLevel: data.experienceLevel ?? inferred.experienceLevel ?? existingLead.experienceLevel,
          clientCountry: data.clientCountry ?? inferred.clientCountry ?? existingLead.clientCountry,
          clientRating: data.clientRating ?? inferred.clientRating ?? existingLead.clientRating,
          clientSpent: data.clientSpent ?? inferred.clientSpent ?? existingLead.clientSpent,
          clientPaymentVerified:
            data.clientPaymentVerified ??
            inferred.clientPaymentVerified ??
            existingLead.clientPaymentVerified,
          agencyRequired: data.agencyRequired ?? inferred.agencyRequired ?? existingLead.agencyRequired,
          enrichmentStatus: EnrichmentStatus.ENRICHED,
          enrichedAt: now
        }
      });

      await tx.intakeRecord.create({
        data: {
          leadId,
          channel: SourceType.JOB_DETAIL,
          rawPayload: {
            source: "manual-job-detail",
            originalText: rawText,
            originalHtml: data.rawHtml,
            manualOverrides: this.compactObject({
              title: data.title,
              sourceUrl: data.sourceUrl,
              summary: data.summary,
              pricingType: data.pricingType,
              hourlyMin: data.hourlyMin,
              hourlyMax: data.hourlyMax,
              fixedBudgetMin: data.fixedBudgetMin,
              durationText: data.durationText,
              workloadText: data.workloadText,
              experienceLevel: data.experienceLevel,
              clientCountry: data.clientCountry,
              clientRating: data.clientRating,
              clientSpent: data.clientSpent,
              clientPaymentVerified: data.clientPaymentVerified,
              agencyRequired: data.agencyRequired
            }),
            derived: this.compactObject({
              pricingType,
              hourlyMin: data.hourlyMin ?? inferred.hourlyMin,
              hourlyMax: data.hourlyMax ?? inferred.hourlyMax,
              fixedBudgetMin: data.fixedBudgetMin ?? inferred.fixedBudgetMin,
              durationText: data.durationText ?? inferred.durationText,
              workloadText: data.workloadText ?? inferred.workloadText,
              experienceLevel: data.experienceLevel ?? inferred.experienceLevel,
              clientCountry: data.clientCountry ?? inferred.clientCountry,
              clientRating: data.clientRating ?? inferred.clientRating,
              clientSpent: data.clientSpent ?? inferred.clientSpent,
              clientPaymentVerified: data.clientPaymentVerified ?? inferred.clientPaymentVerified,
              agencyRequired: data.agencyRequired ?? inferred.agencyRequired
            }),
            submittedAt: now.toISOString()
          } as Prisma.InputJsonObject,
          parseVersion: MANUAL_PARSE_VERSION
        }
      });

      await this.recordFieldProvenance(
        tx,
        this.buildJobDetailFieldProvenanceEntries(leadId, now, {
          pricingType,
          hourlyMin: data.hourlyMin ?? inferred.hourlyMin,
          hourlyMax: data.hourlyMax ?? inferred.hourlyMax,
          fixedBudgetMin: data.fixedBudgetMin ?? inferred.fixedBudgetMin,
          fixedBudgetMax: data.fixedBudgetMax,
          durationText: data.durationText ?? inferred.durationText,
          workloadText: data.workloadText ?? inferred.workloadText,
          experienceLevel: data.experienceLevel ?? inferred.experienceLevel,
          clientCountry: data.clientCountry ?? inferred.clientCountry,
          clientRating: data.clientRating ?? inferred.clientRating,
          clientSpent: data.clientSpent ?? inferred.clientSpent,
          clientPaymentVerified: data.clientPaymentVerified ?? inferred.clientPaymentVerified,
          agencyRequired: data.agencyRequired ?? inferred.agencyRequired
        }, data)
      );

      return lead;
    });

    return {
      leadId: updatedLead.id,
      enrichmentStatus: updatedLead.enrichmentStatus,
      enrichedAt: updatedLead.enrichedAt
    };
  }

  private parseLimit(value?: string) {
    if (!value) {
      return 12;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException("limit must be a positive integer.");
    }

    return Math.min(parsed, 50);
  }

  private validateEnrichmentPayload(payload: CreateLeadEnrichmentDto) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestException("Request body must be a JSON object.");
    }

    return {
      title: this.parseOptionalString(payload.title, "title"),
      sourceUrl: this.parseOptionalSourceUrl(payload.sourceUrl),
      rawText: this.parseOptionalString(payload.rawText, "rawText"),
      rawHtml: this.parseOptionalString(payload.rawHtml, "rawHtml"),
      summary: this.parseOptionalString(payload.summary, "summary"),
      pricingType: this.parsePricingType(payload.pricingType),
      hourlyMin: this.parseOptionalNumber(payload.hourlyMin, "hourlyMin"),
      hourlyMax: this.parseOptionalNumber(payload.hourlyMax, "hourlyMax"),
      fixedBudgetMin: this.parseOptionalNumber(payload.fixedBudgetMin, "fixedBudgetMin"),
      fixedBudgetMax: this.parseOptionalNumber(payload.fixedBudgetMax, "fixedBudgetMax"),
      durationText: this.parseOptionalString(payload.durationText, "durationText"),
      workloadText: this.parseOptionalString(payload.workloadText, "workloadText"),
      experienceLevel: this.parseOptionalString(payload.experienceLevel, "experienceLevel"),
      clientCountry: this.parseOptionalString(payload.clientCountry, "clientCountry"),
      clientRating: this.parseOptionalNumber(payload.clientRating, "clientRating"),
      clientSpent: this.parseOptionalNumber(payload.clientSpent, "clientSpent"),
      clientPaymentVerified: this.parseOptionalBoolean(
        payload.clientPaymentVerified,
        "clientPaymentVerified"
      ),
      agencyRequired: this.parseOptionalBoolean(payload.agencyRequired, "agencyRequired")
    };
  }

  private parseOptionalString(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be a string.`);
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private parseOptionalSourceUrl(value: unknown) {
    const normalized = this.parseOptionalString(value, "sourceUrl");
    if (!normalized) {
      return undefined;
    }

    return this.normalizeSourceUrl(normalized);
  }

  private parseOptionalNumber(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new BadRequestException(`${field} must be a finite number.`);
    }

    return value;
  }

  private parseOptionalBoolean(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "boolean") {
      throw new BadRequestException(`${field} must be a boolean.`);
    }

    return value;
  }

  private parsePricingType(value: unknown) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (!Object.values(PricingType).includes(value as PricingType)) {
      throw new BadRequestException("pricingType must be HOURLY, FIXED, or UNKNOWN.");
    }

    return value as PricingType;
  }

  private formatPricing(lead: {
    pricingType: PricingType;
    hourlyMin: Prisma.Decimal | null;
    hourlyMax: Prisma.Decimal | null;
    fixedBudgetMin: Prisma.Decimal | null;
  }) {
    if (
      lead.pricingType === PricingType.HOURLY &&
      lead.hourlyMin !== null &&
      lead.hourlyMax !== null
    ) {
      return `$${Number(lead.hourlyMin)}-$${Number(lead.hourlyMax)}/hr`;
    }

    if (lead.pricingType === PricingType.FIXED && lead.fixedBudgetMin !== null) {
      return `$${Number(lead.fixedBudgetMin).toLocaleString()} fixed`;
    }

    return "Unknown pricing";
  }

  private buildJobDetailFieldProvenanceEntries(
    leadId: string,
    extractedAt: Date,
    values: {
      pricingType: PricingType;
      hourlyMin?: number;
      hourlyMax?: number;
      fixedBudgetMin?: number;
      fixedBudgetMax?: number;
      durationText?: string;
      workloadText?: string;
      experienceLevel?: string;
      clientCountry?: string;
      clientRating?: number;
      clientSpent?: number;
      clientPaymentVerified?: boolean;
      agencyRequired?: boolean;
    },
    overrides: {
      pricingType?: PricingType;
      hourlyMin?: number;
      hourlyMax?: number;
      fixedBudgetMin?: number;
      fixedBudgetMax?: number;
      durationText?: string;
      workloadText?: string;
      experienceLevel?: string;
      clientCountry?: string;
      clientRating?: number;
      clientSpent?: number;
      clientPaymentVerified?: boolean;
      agencyRequired?: boolean;
    }
  ) {
    const explicitFields = new Set<string>(
      Object.entries(overrides)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([fieldName]) => fieldName)
    );

    return this.buildFieldProvenanceEntries({
      leadId,
      sourceChannel: SourceType.JOB_DETAIL,
      parseVersion: MANUAL_PARSE_VERSION,
      extractedAt,
      entries: [
        {
          fieldName: "pricingType",
          value: values.pricingType,
          confidence: explicitFields.has("pricingType")
            ? FieldConfidence.HIGH
            : values.pricingType === PricingType.UNKNOWN
              ? FieldConfidence.LOW
              : FieldConfidence.MEDIUM
        },
        {
          fieldName: "hourlyMin",
          value: values.hourlyMin,
          confidence: explicitFields.has("hourlyMin") ? FieldConfidence.HIGH : FieldConfidence.MEDIUM
        },
        {
          fieldName: "hourlyMax",
          value: values.hourlyMax,
          confidence: explicitFields.has("hourlyMax") ? FieldConfidence.HIGH : FieldConfidence.MEDIUM
        },
        {
          fieldName: "fixedBudgetMin",
          value: values.fixedBudgetMin,
          confidence: explicitFields.has("fixedBudgetMin")
            ? FieldConfidence.HIGH
            : FieldConfidence.MEDIUM
        },
        {
          fieldName: "fixedBudgetMax",
          value: values.fixedBudgetMax,
          confidence: explicitFields.has("fixedBudgetMax")
            ? FieldConfidence.HIGH
            : FieldConfidence.MEDIUM
        },
        {
          fieldName: "durationText",
          value: values.durationText,
          confidence: explicitFields.has("durationText") ? FieldConfidence.HIGH : FieldConfidence.MEDIUM
        },
        {
          fieldName: "workloadText",
          value: values.workloadText,
          confidence: explicitFields.has("workloadText") ? FieldConfidence.HIGH : FieldConfidence.MEDIUM
        },
        {
          fieldName: "experienceLevel",
          value: values.experienceLevel,
          confidence: explicitFields.has("experienceLevel")
            ? FieldConfidence.HIGH
            : FieldConfidence.MEDIUM
        },
        {
          fieldName: "clientCountry",
          value: values.clientCountry,
          confidence: explicitFields.has("clientCountry") ? FieldConfidence.HIGH : FieldConfidence.MEDIUM
        },
        {
          fieldName: "clientRating",
          value: values.clientRating,
          confidence: explicitFields.has("clientRating") ? FieldConfidence.HIGH : FieldConfidence.MEDIUM
        },
        {
          fieldName: "clientSpent",
          value: values.clientSpent,
          confidence: explicitFields.has("clientSpent") ? FieldConfidence.HIGH : FieldConfidence.MEDIUM
        },
        {
          fieldName: "clientPaymentVerified",
          value: values.clientPaymentVerified,
          confidence: explicitFields.has("clientPaymentVerified")
            ? FieldConfidence.HIGH
            : FieldConfidence.MEDIUM
        },
        {
          fieldName: "agencyRequired",
          value: values.agencyRequired,
          confidence: explicitFields.has("agencyRequired") ? FieldConfidence.HIGH : FieldConfidence.MEDIUM
        }
      ]
    });
  }

  private buildFieldProvenanceEntries(input: {
    leadId: string;
    sourceChannel: SourceType;
    parseVersion?: string;
    extractedAt: Date;
    entries: Array<{
      fieldName: string;
      value: unknown;
      confidence: FieldConfidence;
    }>;
  }) {
    return input.entries.flatMap((entry) => {
      const valueJson = this.toJsonValue(entry.value);

      if (valueJson === undefined) {
        return [];
      }

      return [{
        leadId: input.leadId,
        fieldName: entry.fieldName,
        sourceChannel: input.sourceChannel,
        parseVersion: input.parseVersion,
        confidence: entry.confidence,
        valueJson,
        extractedAt: input.extractedAt
      }];
    });
  }

  private async recordFieldProvenance(
    prisma: Prisma.TransactionClient,
    entries: Array<{
      leadId: string;
      fieldName: string;
      sourceChannel: SourceType;
      parseVersion?: string;
      confidence: FieldConfidence;
      valueJson: Prisma.InputJsonValue;
      extractedAt: Date;
    }>
  ) {
    if (entries.length === 0) {
      return;
    }

    await prisma.leadFieldProvenance.createMany({
      data: entries
    });
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
      return value as Prisma.InputJsonValue;
    }

    return undefined;
  }

  private getLatestFieldProvenance(
    entries: Array<{
      fieldName: string;
      sourceChannel: SourceType;
      confidence: FieldConfidence;
      extractedAt: Date;
    }>
  ) {
    const latest = new Map<string, {
      sourceChannel: SourceType;
      confidence: FieldConfidence;
      extractedAt: Date;
    }>();

    for (const entry of entries) {
      if (!latest.has(entry.fieldName)) {
        latest.set(entry.fieldName, {
          sourceChannel: entry.sourceChannel,
          confidence: entry.confidence,
          extractedAt: entry.extractedAt
        });
      }
    }

    return latest;
  }

  private calculateDataQuality(
    lead: {
      postedAt: Date | null;
      pricingType: PricingType;
      hourlyMin: Prisma.Decimal | null;
      hourlyMax: Prisma.Decimal | null;
      fixedBudgetMin: Prisma.Decimal | null;
      fixedBudgetMax: Prisma.Decimal | null;
      durationText: string | null;
      workloadText: string | null;
      experienceLevel: string | null;
      clientCountry: string | null;
      clientRating: Prisma.Decimal | null;
      clientSpent: Prisma.Decimal | null;
      clientPaymentVerified: boolean | null;
      agencyRequired: boolean | null;
    },
    latestFieldProvenance: Map<string, {
      sourceChannel: SourceType;
      confidence: FieldConfidence;
      extractedAt: Date;
    }>
  ) {
    const fields = [
      {
        fieldName: "postedAt",
        weight: 1,
        present: lead.postedAt !== null,
        valid: lead.postedAt !== null
      },
      {
        fieldName: "pricingType",
        weight: 1,
        present: lead.pricingType !== PricingType.UNKNOWN,
        valid: lead.pricingType !== PricingType.UNKNOWN && this.isPricingValid(lead)
      },
      {
        fieldName: "durationText",
        weight: 0.75,
        present: Boolean(lead.durationText),
        valid: Boolean(lead.durationText)
      },
      {
        fieldName: "workloadText",
        weight: 0.75,
        present: Boolean(lead.workloadText),
        valid: Boolean(lead.workloadText)
      },
      {
        fieldName: "experienceLevel",
        weight: 1,
        present: Boolean(lead.experienceLevel),
        valid: Boolean(lead.experienceLevel)
      },
      {
        fieldName: "clientCountry",
        weight: 0.5,
        present: Boolean(lead.clientCountry),
        valid: Boolean(lead.clientCountry)
      },
      {
        fieldName: "clientRating",
        weight: 0.5,
        present: lead.clientRating !== null,
        valid: lead.clientRating !== null && Number(lead.clientRating) > 0 && Number(lead.clientRating) <= 5
      },
      {
        fieldName: "clientSpent",
        weight: 0.5,
        present: lead.clientSpent !== null,
        valid: lead.clientSpent !== null && Number(lead.clientSpent) >= 0
      },
      {
        fieldName: "clientPaymentVerified",
        weight: 0.75,
        present: lead.clientPaymentVerified !== null,
        valid: lead.clientPaymentVerified !== null
      },
      {
        fieldName: "agencyRequired",
        weight: 0.5,
        present: lead.agencyRequired !== null,
        valid: lead.agencyRequired !== null
      }
    ];

    const totalWeight = fields.reduce((sum, field) => sum + field.weight, 0);
    const completeness = fields.reduce(
      (sum, field) => sum + (field.present ? field.weight : 0),
      0
    ) / totalWeight;
    const validity = fields.reduce(
      (sum, field) => sum + (field.valid ? field.weight : 0),
      0
    ) / totalWeight;
    const provenance = fields.reduce((sum, field) => {
      if (!field.present) {
        return sum;
      }

      return sum + (field.weight * this.getSourceScore(latestFieldProvenance.get(field.fieldName)));
    }, 0) / totalWeight;

    const score = Math.round(((completeness * 0.5) + (validity * 0.25) + (provenance * 0.25)) * 100);
    const provenanceSummary = {
      jobDetailFields: [...latestFieldProvenance.values()].filter(
        (entry) => entry.sourceChannel === SourceType.JOB_DETAIL
      ).length,
      emailFields: [...latestFieldProvenance.values()].filter(
        (entry) => entry.sourceChannel === SourceType.EMAIL_ALERT
      ).length
    };

    return {
      score,
      label: this.getQualityLabel(score),
      provenanceSummary
    };
  }

  private getSourceScore(entry?: {
    sourceChannel: SourceType;
    confidence: FieldConfidence;
  }) {
    if (!entry) {
      return 0.45;
    }

    const confidenceScore = entry.confidence === FieldConfidence.HIGH
      ? 1
      : entry.confidence === FieldConfidence.MEDIUM
        ? 0.85
        : 0.7;

    if (entry.sourceChannel === SourceType.JOB_DETAIL) {
      return confidenceScore;
    }

    if (entry.sourceChannel === SourceType.EMAIL_ALERT) {
      return Math.max(0.6, confidenceScore - 0.15);
    }

    return 0.7;
  }

  private getQualityLabel(score: number) {
    if (score >= 85) {
      return "Strong";
    }

    if (score >= 70) {
      return "Good";
    }

    if (score >= 55) {
      return "Workable";
    }

    return "Thin";
  }

  private isPricingValid(lead: {
    pricingType: PricingType;
    hourlyMin: Prisma.Decimal | null;
    hourlyMax: Prisma.Decimal | null;
    fixedBudgetMin: Prisma.Decimal | null;
    fixedBudgetMax: Prisma.Decimal | null;
  }) {
    if (lead.pricingType === PricingType.HOURLY) {
      if (lead.hourlyMin === null || lead.hourlyMax === null) {
        return false;
      }

      return Number(lead.hourlyMin) <= Number(lead.hourlyMax);
    }

    if (lead.pricingType === PricingType.FIXED) {
      if (lead.fixedBudgetMin === null) {
        return false;
      }

      if (lead.fixedBudgetMax === null) {
        return true;
      }

      return Number(lead.fixedBudgetMin) <= Number(lead.fixedBudgetMax);
    }

    return false;
  }

  private getEnrichmentReasons(lead: {
    enrichmentStatus: EnrichmentStatus;
    durationText: string | null;
    workloadText: string | null;
    clientCountry: string | null;
    rawText: string;
  }) {
    if (lead.enrichmentStatus === EnrichmentStatus.ENRICHED) {
      return [];
    }

    const reasons: string[] = [];
    if (!lead.durationText) {
      reasons.push("Duration missing");
    }

    if (!lead.workloadText) {
      reasons.push("Workload missing");
    }

    if (!lead.clientCountry) {
      reasons.push("Client country missing");
    }

    if (lead.rawText.includes("... more:")) {
      reasons.push("Description truncated in email");
    }

    return reasons.slice(0, 4);
  }

  private stripHtml(html: string) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&hellip;/gi, "...")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, "\"")
      .replace(/\s+/g, " ")
      .trim();
  }

  private normalizeSourceUrl(url: string) {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  private pickPricingType(
    provided: PricingType | undefined,
    inferred: PricingType | undefined,
    existing: PricingType
  ) {
    if (provided && provided !== PricingType.UNKNOWN) {
      return provided;
    }

    if (inferred && inferred !== PricingType.UNKNOWN) {
      return inferred;
    }

    return existing;
  }

  private compactObject(value: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
    );
  }

  private inferFromRawText(rawText: string) {
    return {
      pricingType: this.inferPricingType(rawText),
      hourlyMin: this.inferHourlyMin(rawText),
      hourlyMax: this.inferHourlyMax(rawText),
      fixedBudgetMin: this.inferFixedBudgetMin(rawText),
      durationText: this.inferDuration(rawText),
      workloadText: this.inferWorkload(rawText),
      experienceLevel: this.inferExperienceLevel(rawText),
      clientCountry: this.inferClientCountry(rawText),
      clientRating: this.inferClientRating(rawText),
      clientSpent: this.inferClientSpent(rawText),
      clientPaymentVerified: this.inferClientPaymentVerified(rawText),
      agencyRequired: /agency required/i.test(rawText)
    };
  }

  private inferPricingType(rawText: string) {
    if (/Fixed(?:-price)?:/i.test(rawText) || /\(Fixed(?: Price)?\s*\$/i.test(rawText)) {
      return PricingType.FIXED;
    }

    if (/Hourly:/i.test(rawText) || /\/\s*hr\b/i.test(rawText)) {
      return PricingType.HOURLY;
    }

    return undefined;
  }

  private inferHourlyMin(rawText: string) {
    const match = rawText.match(/Hourly:\s*\$?(\d+(?:\.\d+)?)\s*-\s*\$?(\d+(?:\.\d+)?)/i)
      ?? rawText.match(/\$?(\d+(?:\.\d+)?)\s*-\s*\$?(\d+(?:\.\d+)?)\s*\/\s*hr/i);
    return match ? Number(match[1]) : undefined;
  }

  private inferHourlyMax(rawText: string) {
    const match = rawText.match(/Hourly:\s*\$?(\d+(?:\.\d+)?)\s*-\s*\$?(\d+(?:\.\d+)?)/i)
      ?? rawText.match(/\$?(\d+(?:\.\d+)?)\s*-\s*\$?(\d+(?:\.\d+)?)\s*\/\s*hr/i);
    return match ? Number(match[2]) : undefined;
  }

  private inferFixedBudgetMin(rawText: string) {
    const match = rawText.match(/Fixed(?:-price)?:\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?)/i)
      ?? rawText.match(/\(Fixed(?: Price)?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?)\)/i);
    return match ? this.parseCompactAmount(match[1]) : undefined;
  }

  private inferDuration(rawText: string) {
    const lines = this.getNonEmptyLines(rawText);

    for (const line of lines) {
      const normalized = line.replace(/\s+/g, " ").trim();
      if (/^(?:<\s*1 month|less than 1 month)$/i.test(normalized)) {
        return "less than 1 month";
      }

      if (/^(?:1-3 months|1 to 3 months)$/i.test(normalized)) {
        return "1-3 months";
      }

      if (/^(?:3-6 months|3 to 6 months)$/i.test(normalized)) {
        return "3-6 months";
      }

      if (/^(?:6\+ months|>\s*6 months|more than 6 months)$/i.test(normalized)) {
        return "6+ months";
      }
    }

    return undefined;
  }

  private inferWorkload(rawText: string) {
    const lines = this.getNonEmptyLines(rawText);

    for (const line of lines) {
      const normalized = line.replace(/\s+/g, " ").trim();
      const lessThanMatch = normalized.match(/^<\s*(\d+)\s*(?:hr\/wk|hrs?\/week)$/i);
      if (lessThanMatch) {
        return `< ${lessThanMatch[1]} hr/wk`;
      }

      const moreThanMatch = normalized.match(/^>\s*(\d+)\s*(?:hr\/wk|hrs?\/week)$/i);
      if (moreThanMatch) {
        return `> ${moreThanMatch[1]} hr/wk`;
      }

      const exactMatch = normalized.match(/^(\d+)\+?\s*(?:hr\/wk|hrs?\/week)$/i);
      if (exactMatch) {
        return normalized.includes("+") ? `${exactMatch[1]}+ hr/wk` : `${exactMatch[1]} hr/wk`;
      }
    }

    return undefined;
  }

  private inferExperienceLevel(rawText: string) {
    const match = rawText.match(/\b(entry|intermediate|expert)\b/i);
    return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : undefined;
  }

  private inferClientCountry(rawText: string) {
    const lines = this.getNonEmptyLines(rawText);

    for (let index = 0; index < lines.length; index += 1) {
      if (/^\$?\s*\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?\s+spent$/i.test(lines[index])) {
        const candidate = lines[index + 1];
        if (candidate && /^[A-Za-z][A-Za-z .'-]{1,40}$/.test(candidate)) {
          return this.normalizeCountry(candidate);
        }
      }
    }

    const match = rawText.match(
      /\$?\s*\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?\s+spent\s+([A-Za-z][A-Za-z .'-]{1,40})(?=\s+(?:Posted on|View job details|[A-Za-z0-9.+/#&,'() -]{2,60}:))/is
    );
    return match ? this.normalizeCountry(match[1]) : undefined;
  }

  private inferClientRating(rawText: string) {
    const lines = this.getNonEmptyLines(rawText);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^Payment (?:verified|unverified)\b/i.test(line)) {
        const ratingLine = lines[index + 1];
        if (ratingLine && /^\d(?:\.\d{1,2})?$/.test(ratingLine)) {
          const rating = Number(ratingLine);
          return rating > 0 ? rating : undefined;
        }
      }
    }

    const match = rawText.match(
      /Payment (?:verified|unverified)\s+(\d(?:\.\d{1,2})?)(?=\s+\$?\s*\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?\s+spent)/is
    );
    if (!match) {
      return undefined;
    }

    const rating = Number(match[1]);
    return rating > 0 ? rating : undefined;
  }

  private inferClientSpent(rawText: string) {
    const match = rawText.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?)\s+spent/i);
    return match ? this.parseCompactAmount(match[1]) : undefined;
  }

  private inferClientPaymentVerified(rawText: string) {
    if (/Payment verified/i.test(rawText)) {
      return true;
    }

    if (/Payment unverified/i.test(rawText)) {
      return false;
    }

    return undefined;
  }

  private getNonEmptyLines(rawText: string) {
    return rawText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  private parseCompactAmount(value: string) {
    const match = value.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)([KMB])?/i);
    if (!match) {
      return undefined;
    }

    const baseAmount = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(baseAmount)) {
      return undefined;
    }

    const suffix = match[2]?.toUpperCase();
    const multiplier = suffix === "K"
      ? 1_000
      : suffix === "M"
        ? 1_000_000
        : suffix === "B"
          ? 1_000_000_000
          : 1;

    return baseAmount * multiplier;
  }

  private normalizeCountry(value: string) {
    const normalized = value.replace(/\s+/g, " ").trim();
    const upper = normalized.toUpperCase();
    const aliases: Record<string, string> = {
      AUS: "Australia",
      BGD: "Bangladesh",
      CAN: "Canada",
      COL: "Colombia",
      DEU: "Germany",
      DNK: "Denmark",
      GBR: "United Kingdom",
      GEO: "Georgia",
      IND: "India",
      ISR: "Israel",
      PAK: "Pakistan",
      UKR: "Ukraine",
      USA: "United States",
      US: "United States",
      VNM: "Vietnam"
    };

    if (upper === "U.S.A.") {
      return "United States";
    }

    if (upper === "UK" || upper === "U.K.") {
      return "United Kingdom";
    }

    return aliases[upper] ?? normalized;
  }
}
