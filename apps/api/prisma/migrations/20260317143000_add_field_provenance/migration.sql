CREATE TYPE "FieldConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "LeadFieldProvenance" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "sourceChannel" "SourceType" NOT NULL,
  "parseVersion" TEXT,
  "confidence" "FieldConfidence" NOT NULL DEFAULT 'MEDIUM',
  "valueJson" JSONB,
  "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LeadFieldProvenance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeadFieldProvenance_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LeadFieldProvenance_leadId_fieldName_extractedAt_idx"
  ON "LeadFieldProvenance"("leadId", "fieldName", "extractedAt");

CREATE INDEX "LeadFieldProvenance_fieldName_sourceChannel_parseVersion_idx"
  ON "LeadFieldProvenance"("fieldName", "sourceChannel", "parseVersion");

WITH lead_source AS (
  SELECT
    l.id AS lead_id,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM "IntakeRecord" ir
        WHERE ir."leadId" = l.id
          AND ir.channel = 'JOB_DETAIL'
      )
        THEN 'JOB_DETAIL'::"SourceType"
      ELSE 'EMAIL_ALERT'::"SourceType"
    END AS source_channel,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM "IntakeRecord" ir
        WHERE ir."leadId" = l.id
          AND ir.channel = 'JOB_DETAIL'
      )
        THEN (
          SELECT ir."parseVersion"
          FROM "IntakeRecord" ir
          WHERE ir."leadId" = l.id
            AND ir.channel = 'JOB_DETAIL'
          ORDER BY ir."createdAt" DESC
          LIMIT 1
        )
      ELSE (
        SELECT ir."parseVersion"
        FROM "IntakeRecord" ir
        WHERE ir."leadId" = l.id
          AND ir.channel = 'EMAIL_ALERT'
        ORDER BY ir."createdAt" DESC
        LIMIT 1
      )
    END AS parse_version,
    COALESCE(l."enrichedAt", l."createdAt") AS extracted_at
  FROM "Lead" l
),
field_rows AS (
  SELECT
    l.id AS lead_id,
    ls.source_channel,
    ls.parse_version,
    ls.extracted_at,
    fields.field_name,
    fields.confidence,
    fields.value_json
  FROM "Lead" l
  JOIN lead_source ls
    ON ls.lead_id = l.id
  CROSS JOIN LATERAL (
    VALUES
      ('postedAt', 'HIGH'::"FieldConfidence", CASE WHEN l."postedAt" IS NOT NULL THEN to_jsonb(l."postedAt") ELSE NULL END),
      ('pricingType', CASE WHEN l."pricingType" = 'UNKNOWN' THEN 'LOW'::"FieldConfidence" ELSE 'MEDIUM'::"FieldConfidence" END, CASE WHEN l."pricingType" IS NOT NULL THEN to_jsonb(l."pricingType"::text) ELSE NULL END),
      ('hourlyMin', 'MEDIUM'::"FieldConfidence", CASE WHEN l."hourlyMin" IS NOT NULL THEN to_jsonb(l."hourlyMin") ELSE NULL END),
      ('hourlyMax', 'MEDIUM'::"FieldConfidence", CASE WHEN l."hourlyMax" IS NOT NULL THEN to_jsonb(l."hourlyMax") ELSE NULL END),
      ('fixedBudgetMin', 'MEDIUM'::"FieldConfidence", CASE WHEN l."fixedBudgetMin" IS NOT NULL THEN to_jsonb(l."fixedBudgetMin") ELSE NULL END),
      ('fixedBudgetMax', 'MEDIUM'::"FieldConfidence", CASE WHEN l."fixedBudgetMax" IS NOT NULL THEN to_jsonb(l."fixedBudgetMax") ELSE NULL END),
      ('durationText', 'LOW'::"FieldConfidence", CASE WHEN l."durationText" IS NOT NULL THEN to_jsonb(l."durationText") ELSE NULL END),
      ('workloadText', 'LOW'::"FieldConfidence", CASE WHEN l."workloadText" IS NOT NULL THEN to_jsonb(l."workloadText") ELSE NULL END),
      ('experienceLevel', 'HIGH'::"FieldConfidence", CASE WHEN l."experienceLevel" IS NOT NULL THEN to_jsonb(l."experienceLevel") ELSE NULL END),
      ('clientCountry', 'LOW'::"FieldConfidence", CASE WHEN l."clientCountry" IS NOT NULL THEN to_jsonb(l."clientCountry") ELSE NULL END),
      ('clientRating', 'MEDIUM'::"FieldConfidence", CASE WHEN l."clientRating" IS NOT NULL THEN to_jsonb(l."clientRating") ELSE NULL END),
      ('clientSpent', 'LOW'::"FieldConfidence", CASE WHEN l."clientSpent" IS NOT NULL THEN to_jsonb(l."clientSpent") ELSE NULL END),
      ('clientPaymentVerified', 'HIGH'::"FieldConfidence", CASE WHEN l."clientPaymentVerified" IS NOT NULL THEN to_jsonb(l."clientPaymentVerified") ELSE NULL END),
      ('agencyRequired', 'HIGH'::"FieldConfidence", CASE WHEN l."agencyRequired" IS NOT NULL THEN to_jsonb(l."agencyRequired") ELSE NULL END)
  ) AS fields(field_name, confidence, value_json)
  WHERE fields.value_json IS NOT NULL
)
INSERT INTO "LeadFieldProvenance" (
  "id",
  "leadId",
  "fieldName",
  "sourceChannel",
  "parseVersion",
  "confidence",
  "valueJson",
  "extractedAt",
  "createdAt"
)
SELECT
  'lfp_' || md5(
    lead_id || ':' ||
    field_name || ':' ||
    source_channel::text || ':' ||
    COALESCE(parse_version, '') || ':' ||
    value_json::text
  ) AS id,
  lead_id,
  field_name,
  source_channel,
  parse_version,
  confidence,
  value_json,
  extracted_at,
  extracted_at
FROM field_rows;
