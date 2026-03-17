import { PricingType } from "@prisma/client";

export interface CreateLeadEnrichmentDto {
  title?: string;
  sourceUrl?: string;
  rawText?: string;
  rawHtml?: string;
  summary?: string;
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
