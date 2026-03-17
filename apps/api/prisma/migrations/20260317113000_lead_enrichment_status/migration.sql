CREATE TYPE "EnrichmentStatus" AS ENUM ('NONE', 'RECOMMENDED', 'ENRICHED');

ALTER TABLE "Lead"
ADD COLUMN "enrichmentStatus" "EnrichmentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "enrichedAt" TIMESTAMP(3);

UPDATE "Lead" AS lead
SET
  "enrichmentStatus" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "IntakeRecord" AS record
      WHERE record."leadId" = lead."id"
        AND record."channel" = 'JOB_DETAIL'
    )
      THEN 'ENRICHED'::"EnrichmentStatus"
    WHEN lead."rawText" LIKE '%... more:%'
      OR lead."durationText" IS NULL
      OR lead."workloadText" IS NULL
      OR lead."clientCountry" IS NULL
      THEN 'RECOMMENDED'::"EnrichmentStatus"
    ELSE 'NONE'::"EnrichmentStatus"
  END,
  "enrichedAt" = (
    SELECT MAX(record."createdAt")
    FROM "IntakeRecord" AS record
    WHERE record."leadId" = lead."id"
      AND record."channel" = 'JOB_DETAIL'
  );

CREATE INDEX "Lead_enrichmentStatus_postedAt_idx"
ON "Lead"("enrichmentStatus", "postedAt");
