import { BadRequestException, Injectable } from "@nestjs/common";
import { LeadStatus, PricingType, Prisma, SourceType } from "@prisma/client";
import { CreateEmailIntakeDto } from "./dto/create-email-intake.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class IntakeService {
  constructor(private readonly prisma: PrismaService) {}

  async createEmailIntake(payload: CreateEmailIntakeDto) {
    const data = this.validateEmailPayload(payload);

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
        return {
          duplicate: true,
          leadId: existingRecord.leadId,
          intakeRecordId: existingRecord.id
        };
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        title: data.title,
        sourceType: SourceType.EMAIL_ALERT,
        sourceUrl: data.sourceUrl,
        rawText: data.rawText,
        summary: data.summary,
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
      title: this.parseRequiredString(payload.title, "title"),
      sourceUrl: this.parseOptionalString(payload.sourceUrl, "sourceUrl"),
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

    return payload as unknown as Prisma.InputJsonObject;
  }
}
