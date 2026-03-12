-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'EMAIL_ALERT', 'JOB_DETAIL');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'REVIEWED', 'IGNORED', 'APPLIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('HOURLY', 'FIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TermType" AS ENUM ('PROJECT_TYPE', 'STACK', 'SKILL', 'DOMAIN', 'ENGAGEMENT_TYPE');

-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('MANUAL', 'RULE', 'LLM');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "rawText" TEXT NOT NULL,
    "summary" TEXT,
    "postedAt" TIMESTAMP(3),
    "pricingType" "PricingType" NOT NULL DEFAULT 'UNKNOWN',
    "hourlyMin" DECIMAL(65,30),
    "hourlyMax" DECIMAL(65,30),
    "fixedBudgetMin" DECIMAL(65,30),
    "fixedBudgetMax" DECIMAL(65,30),
    "durationText" TEXT,
    "workloadText" TEXT,
    "experienceLevel" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "reviewNotes" TEXT,
    "portfolioGapNote" TEXT,
    "fitScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeRecord" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" "SourceType" NOT NULL,
    "externalId" TEXT,
    "subject" TEXT,
    "sender" TEXT,
    "receivedAt" TIMESTAMP(3),
    "rawPayload" JSONB NOT NULL,
    "parseVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxonomyTerm" (
    "id" TEXT NOT NULL,
    "termType" "TermType" NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonomyTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTerm" (
    "leadId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "tagSource" "TagSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTerm_pkey" PRIMARY KEY ("leadId","termId")
);

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_sourceType_postedAt_idx" ON "Lead"("sourceType", "postedAt");

-- CreateIndex
CREATE INDEX "IntakeRecord_leadId_createdAt_idx" ON "IntakeRecord"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "IntakeRecord_externalId_idx" ON "IntakeRecord"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyTerm_slug_key" ON "TaxonomyTerm"("slug");

-- CreateIndex
CREATE INDEX "TaxonomyTerm_termType_isActive_idx" ON "TaxonomyTerm"("termType", "isActive");

-- CreateIndex
CREATE INDEX "LeadTerm_termId_idx" ON "LeadTerm"("termId");

-- AddForeignKey
ALTER TABLE "IntakeRecord" ADD CONSTRAINT "IntakeRecord_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTerm" ADD CONSTRAINT "LeadTerm_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTerm" ADD CONSTRAINT "LeadTerm_termId_fkey" FOREIGN KEY ("termId") REFERENCES "TaxonomyTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
