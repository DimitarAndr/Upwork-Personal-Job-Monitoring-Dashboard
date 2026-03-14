import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
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

@Injectable()
export class IntakeService {
  private readonly logger = new Logger(IntakeService.name);
  private static readonly maxDeadlockRetries = 3;

  constructor(private readonly prisma: PrismaService) {}

  async createEmailIntake(payload: CreateEmailIntakeDto) {
    const data = this.validateEmailPayload(payload);

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
            status: LeadStatus.NEW,
            intakeRecords: {
              create: {
                channel: SourceType.EMAIL_ALERT,
                externalId: data.externalId,
                subject: data.subject,
                sender: data.sender,
                receivedAt: data.receivedAt,
                rawPayload: data.rawPayload
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

    return {
      externalId: this.parseOptionalString(payload.externalId, "externalId"),
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
      rawPayload: this.parseRawPayload(payload)
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
