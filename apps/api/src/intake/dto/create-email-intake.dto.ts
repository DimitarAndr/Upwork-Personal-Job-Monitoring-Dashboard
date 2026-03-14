import { PricingType, SourceType } from "@prisma/client";

export interface CreateEmailIntakeDto {
  channel?: SourceType;
  externalId?: string;
  subject?: string;
  sender?: string;
  receivedAt?: string;
  postedAt?: string;
  title: string;
  sourceUrl?: string;
  rawText: string;
  summary?: string;
  pricingType?: PricingType;
  hourlyMin?: number;
  hourlyMax?: number;
  fixedBudgetMin?: number;
  fixedBudgetMax?: number;
  durationText?: string;
  workloadText?: string;
  experienceLevel?: string;
  visibleSkills?: string[];
  rawPayload: Record<string, unknown>;
}
