import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  EnrichmentStatus,
  FieldConfidence,
  LeadStatus,
  PricingType,
  Prisma,
  PrismaClient,
  SourceType,
  TagSource,
  TermType
} from "@prisma/client";
import { CreateEmailIntakeDto } from "./dto/create-email-intake.dto";
import { PrismaService } from "../prisma/prisma.service";
import { isLikelyUpworkJobAlert } from "./upwork-job-alert";

@Injectable()
export class IntakeService {
  private readonly logger = new Logger(IntakeService.name);
  private static readonly maxDeadlockRetries = 3;

  constructor(private readonly prisma: PrismaService) {}

  async createEmailIntake(payload: CreateEmailIntakeDto) {
    const data = this.validateEmailPayload(payload);

    if (
      !isLikelyUpworkJobAlert({
        subject: data.subject,
        title: data.title,
        rawText: data.rawText,
        sourceUrl: data.sourceUrl
      })
    ) {
      this.logger.log(
        `Ignored non-job email externalId=${data.externalId ?? "n/a"} subject="${data.subject ?? data.title}"`
      );

      return {
        duplicate: false,
        ignored: true,
        reason: "non_job_email"
      };
    }

    // Start with message-id based dedupe because Yahoo/n8n can provide it reliably.
    if (data.externalId) {
      const existingRecord = await this.prisma.intakeRecord.findFirst({
        where: {
          channel: SourceType.EMAIL_ALERT,
          externalId: data.externalId
        },
        select: {
          id: true,
          leadId: true
        }
      });

      if (existingRecord) {
        this.logger.log(
          `Duplicate email ignored externalId=${data.externalId} leadId=${existingRecord.leadId}`
        );

        return {
          duplicate: true,
          leadId: existingRecord.leadId,
          intakeRecordId: existingRecord.id
        };
      }
    }

    const lead = await this.runWithDeadlockRetry(async () => {
      return this.prisma.$transaction(async (tx) => {
        const createdLead = await tx.lead.create({
          data: {
            title: data.title,
            sourceType: SourceType.EMAIL_ALERT,
            sourceUrl: data.sourceUrl,
            rawText: data.rawText,
            summary: data.summary,
            postedAt: data.postedAt,
            pricingType: data.pricingType,
            hourlyMin: data.hourlyMin,
            hourlyMax: data.hourlyMax,
            fixedBudgetMin: data.fixedBudgetMin,
            fixedBudgetMax: data.fixedBudgetMax,
            durationText: data.durationText,
            workloadText: data.workloadText,
            experienceLevel: data.experienceLevel,
            clientCountry: data.clientCountry,
            clientRating: data.clientRating,
            clientSpent: data.clientSpent,
            clientPaymentVerified: data.clientPaymentVerified,
            agencyRequired: data.agencyRequired,
            enrichmentStatus: data.enrichmentStatus,
            status: LeadStatus.NEW,
            intakeRecords: {
              create: {
                channel: SourceType.EMAIL_ALERT,
                externalId: data.externalId,
                subject: data.subject,
                sender: data.sender,
                receivedAt: data.receivedAt,
                rawPayload: data.rawPayload,
                parseVersion: data.parseVersion
              }
            }
          },
          include: {
            intakeRecords: {
              select: {
                id: true
              },
              take: 1
            }
          }
        });

        if (data.visibleSkills.length > 0) {
          await this.attachVisibleSkills(tx, createdLead.id, data.visibleSkills);
        }

        await this.recordFieldProvenance(
          tx,
          this.buildEmailFieldProvenanceEntries(createdLead.id, data)
        );

        return createdLead;
      });
    }, data.externalId);

    this.logger.log(
      `Stored email lead leadId=${lead.id} title="${lead.title}" postedAt=${data.postedAt?.toISOString() ?? "n/a"} skills=${data.visibleSkills.length}`
    );

    return {
      duplicate: false,
      leadId: lead.id,
      intakeRecordId: lead.intakeRecords[0]?.id,
      status: lead.status
    };
  }

  private validateEmailPayload(payload: CreateEmailIntakeDto) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestException("Request body must be a JSON object.");
    }

    if (payload.channel && payload.channel !== SourceType.EMAIL_ALERT) {
      throw new BadRequestException("channel must be EMAIL_ALERT when provided.");
    }

    const rawPayload = this.parseRawPayload(payload);
    const rawPayloadDerived = this.extractDerivedPayload(payload.rawPayload);
    const clientRating = this.parseOptionalNumber(
      payload.clientRating ?? rawPayloadDerived.clientRating,
      "clientRating"
    );

    return {
      externalId: this.parseOptionalString(payload.externalId, "externalId"),
      parseVersion: this.parseOptionalString(payload.parseVersion, "parseVersion"),
      subject: this.parseOptionalString(payload.subject, "subject"),
      sender: this.parseOptionalString(payload.sender, "sender"),
      receivedAt: this.parseOptionalDate(payload.receivedAt, "receivedAt"),
      postedAt: this.parseOptionalDate(payload.postedAt, "postedAt"),
      title: this.parseRequiredString(payload.title, "title"),
      sourceUrl: this.parseOptionalSourceUrl(payload.sourceUrl),
      rawText: this.parseRequiredString(payload.rawText, "rawText"),
      summary: this.parseOptionalString(payload.summary, "summary"),
      pricingType: this.parsePricingType(payload.pricingType),
      hourlyMin: this.parseOptionalNumber(payload.hourlyMin, "hourlyMin"),
      hourlyMax: this.parseOptionalNumber(payload.hourlyMax, "hourlyMax"),
      fixedBudgetMin: this.parseOptionalNumber(payload.fixedBudgetMin, "fixedBudgetMin"),
      fixedBudgetMax: this.parseOptionalNumber(payload.fixedBudgetMax, "fixedBudgetMax"),
      durationText: this.parseOptionalString(payload.durationText, "durationText"),
      workloadText: this.parseOptionalString(payload.workloadText, "workloadText"),
      experienceLevel: this.parseOptionalString(payload.experienceLevel, "experienceLevel"),
      visibleSkills: this.parseVisibleSkills(payload.visibleSkills),
      clientCountry: this.parseOptionalString(
        payload.clientCountry ?? rawPayloadDerived.clientCountry,
        "clientCountry"
      ),
      clientRating: clientRating && clientRating > 0 ? clientRating : undefined,
      clientSpent: this.parseOptionalNumber(
        payload.clientSpent ?? rawPayloadDerived.clientSpent,
        "clientSpent"
      ),
      clientPaymentVerified: this.parseOptionalBoolean(
        payload.clientPaymentVerified ?? rawPayloadDerived.clientPaymentVerified,
        "clientPaymentVerified"
      ),
      agencyRequired: this.parseOptionalBoolean(
        payload.agencyRequired ?? rawPayloadDerived.agencyRequired,
        "agencyRequired"
      ),
      enrichmentStatus: this.deriveEmailEnrichmentStatus({
        rawText: payload.rawText,
        summary: payload.summary,
        durationText: payload.durationText,
        workloadText: payload.workloadText,
        clientCountry: payload.clientCountry ?? rawPayloadDerived.clientCountry,
        rawPayloadDerived,
        visibleSkills: payload.visibleSkills
      }),
      rawPayload
    };
  }

  private parseRequiredString(value: unknown, field: string) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required.`);
    }

    return value.trim();
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

  private parseOptionalDate(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`${field} must be an ISO date string.`);
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO date string.`);
    }

    return parsedDate;
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
      return PricingType.UNKNOWN;
    }

    if (!Object.values(PricingType).includes(value as PricingType)) {
      throw new BadRequestException("pricingType must be HOURLY, FIXED, or UNKNOWN.");
    }

    return value as PricingType;
  }

  private parseRawPayload(payload: CreateEmailIntakeDto) {
    if (!payload.rawPayload || typeof payload.rawPayload !== "object" || Array.isArray(payload.rawPayload)) {
      throw new BadRequestException("rawPayload is required and must be an object.");
    }

    // Persist the opaque upstream payload, not the normalized API wrapper fields.
    return payload.rawPayload as unknown as Prisma.InputJsonObject;
  }

  private extractDerivedPayload(rawPayload: Record<string, unknown>) {
    const derived = rawPayload.derived;
    if (!derived || typeof derived !== "object" || Array.isArray(derived)) {
      return {};
    }

    return derived as Record<string, unknown>;
  }

  private deriveEmailEnrichmentStatus(input: {
    rawText: string;
    summary?: string;
    durationText?: string;
    workloadText?: string;
    clientCountry?: unknown;
    rawPayloadDerived: Record<string, unknown>;
    visibleSkills?: string[];
  }) {
    const descriptionTruncated = this.parseOptionalBoolean(
      input.rawPayloadDerived.descriptionTruncated,
      "rawPayload.derived.descriptionTruncated"
    );
    const visibleSkillsExtraCount = this.parseOptionalNumber(
      input.rawPayloadDerived.visibleSkillsExtraCount,
      "rawPayload.derived.visibleSkillsExtraCount"
    );
    const hasTruncatedText = (input.rawText ?? "").includes("... more:");
    const hasMissingDuration = !this.parseOptionalString(input.durationText, "durationText");
    const hasMissingWorkload = !this.parseOptionalString(input.workloadText, "workloadText");
    const hasMissingCountry = !this.parseOptionalString(input.clientCountry, "clientCountry");
    const hasExtraHiddenSkills = (visibleSkillsExtraCount ?? 0) > 0;
    const hasNoVisibleSkills = (input.visibleSkills?.length ?? 0) === 0;
    const summaryTruncated = (input.summary ?? "").endsWith("...");

    if (
      descriptionTruncated ||
      hasTruncatedText ||
      summaryTruncated ||
      hasMissingDuration ||
      hasMissingWorkload ||
      hasMissingCountry ||
      hasExtraHiddenSkills ||
      hasNoVisibleSkills
    ) {
      return EnrichmentStatus.RECOMMENDED;
    }

    return EnrichmentStatus.NONE;
  }

  private parseVisibleSkills(value: unknown) {
    if (value === undefined || value === null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException("visibleSkills must be an array of strings.");
    }

    const normalized = value.map((item) => {
      if (typeof item !== "string" || item.trim().length === 0) {
        throw new BadRequestException("visibleSkills must contain only non-empty strings.");
      }

      return item.trim();
    }).filter((label) => !/^\+\d+$/.test(label) && !/^\d+$/.test(label));

    return [...new Set(normalized)];
  }

  // Normalize canonical Upwork job URLs in the API so older n8n workflows cannot keep storing tracking params.
  private normalizeSourceUrl(value: string) {
    const decodedValue = value.replace(/&amp;/gi, "&").replace(/["')\]]+$/, "");

    try {
      const parsedUrl = new URL(decodedValue);
      if (parsedUrl.hostname.toLowerCase() === "www.upwork.com" && parsedUrl.pathname.startsWith("/jobs/~")) {
        return `${parsedUrl.origin}${parsedUrl.pathname}`;
      }

      return decodedValue;
    } catch {
      return decodedValue;
    }
  }

  private buildEmailFieldProvenanceEntries(
    leadId: string,
    data: {
      parseVersion?: string;
      receivedAt?: Date;
      postedAt?: Date;
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
    }
  ) {
    const extractedAt = data.receivedAt ?? new Date();

    return this.buildFieldProvenanceEntries({
      leadId,
      sourceChannel: SourceType.EMAIL_ALERT,
      parseVersion: data.parseVersion ?? "v1",
      extractedAt,
      entries: [
        {
          fieldName: "postedAt",
          value: data.postedAt,
          confidence: FieldConfidence.HIGH
        },
        {
          fieldName: "pricingType",
          value: data.pricingType,
          confidence: data.pricingType === PricingType.UNKNOWN
            ? FieldConfidence.LOW
            : FieldConfidence.MEDIUM
        },
        {
          fieldName: "hourlyMin",
          value: data.hourlyMin,
          confidence: FieldConfidence.MEDIUM
        },
        {
          fieldName: "hourlyMax",
          value: data.hourlyMax,
          confidence: FieldConfidence.MEDIUM
        },
        {
          fieldName: "fixedBudgetMin",
          value: data.fixedBudgetMin,
          confidence: FieldConfidence.MEDIUM
        },
        {
          fieldName: "fixedBudgetMax",
          value: data.fixedBudgetMax,
          confidence: FieldConfidence.MEDIUM
        },
        {
          fieldName: "durationText",
          value: data.durationText,
          confidence: FieldConfidence.LOW
        },
        {
          fieldName: "workloadText",
          value: data.workloadText,
          confidence: FieldConfidence.LOW
        },
        {
          fieldName: "experienceLevel",
          value: data.experienceLevel,
          confidence: FieldConfidence.HIGH
        },
        {
          fieldName: "clientCountry",
          value: data.clientCountry,
          confidence: FieldConfidence.LOW
        },
        {
          fieldName: "clientRating",
          value: data.clientRating,
          confidence: FieldConfidence.MEDIUM
        },
        {
          fieldName: "clientSpent",
          value: data.clientSpent,
          confidence: FieldConfidence.LOW
        },
        {
          fieldName: "clientPaymentVerified",
          value: data.clientPaymentVerified,
          confidence: FieldConfidence.HIGH
        },
        {
          fieldName: "agencyRequired",
          value: data.agencyRequired,
          confidence: FieldConfidence.HIGH
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
    prisma: Prisma.TransactionClient | PrismaClient,
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

  // Email skills are directly useful for research, so attach them as taxonomy terms now.
  private async attachVisibleSkills(
    prisma: Prisma.TransactionClient | PrismaClient,
    leadId: string,
    visibleSkills: string[]
  ) {
    // Acquire shared taxonomy locks in a stable order so parallel backlog imports do not deadlock.
    const orderedSkills = [...visibleSkills].sort((left, right) =>
      this.getTermLockKey(left).localeCompare(this.getTermLockKey(right))
    );

    for (const label of orderedSkills) {
      const termType = this.classifySkillTerm(label);
      const slug = `${termType.toLowerCase()}-${this.slugify(label)}`;
      const term = await prisma.taxonomyTerm.upsert({
        where: {
          slug
        },
        update: {
          label,
          isActive: true
        },
        create: {
          termType,
          label,
          slug
        }
      });

      await prisma.leadTerm.upsert({
        where: {
          leadId_termId: {
            leadId,
            termId: term.id
          }
        },
        update: {},
        create: {
          leadId,
          termId: term.id,
          tagSource: TagSource.RULE,
          confidence: 100
        }
      });
    }
  }

  private classifySkillTerm(label: string) {
    const normalized = label.toLowerCase();
    const stackKeywords = [
      "react",
      "next.js",
      "node.js",
      "javascript",
      "typescript",
      "vue",
      "angular",
      "python",
      "django",
      "nestjs",
      "express",
      "postgresql",
      "mysql",
      "mongodb",
      "docker",
      "aws"
    ];

    return stackKeywords.includes(normalized) ? TermType.STACK : TermType.SKILL;
  }

  private getTermLockKey(label: string) {
    const termType = this.classifySkillTerm(label);
    return `${termType.toLowerCase()}-${this.slugify(label)}`;
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private async runWithDeadlockRetry<T>(operation: () => Promise<T>, externalId?: string) {
    for (let attempt = 1; attempt <= IntakeService.maxDeadlockRetries; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isDeadlockError(error) || attempt === IntakeService.maxDeadlockRetries) {
          throw error;
        }

        this.logger.warn(
          `Retrying intake after deadlock attempt=${attempt} externalId=${externalId ?? "n/a"}`
        );

        await this.sleep(attempt * 100);
      }
    }

    throw new Error("Deadlock retry loop exhausted unexpectedly.");
  }

  private isDeadlockError(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientUnknownRequestError)) {
      return false;
    }

    return error.message.includes('code: "40P01"') || error.message.includes("deadlock detected");
  }

  private sleep(durationMs: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }
}
