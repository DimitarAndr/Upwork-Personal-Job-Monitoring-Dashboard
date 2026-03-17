ALTER TABLE "Lead"
ADD COLUMN "clientCountry" TEXT,
ADD COLUMN "clientRating" DECIMAL(65,30),
ADD COLUMN "clientSpent" DECIMAL(65,30),
ADD COLUMN "clientPaymentVerified" BOOLEAN,
ADD COLUMN "agencyRequired" BOOLEAN;

UPDATE "Lead" AS lead
SET
  "clientCountry" = CASE
    WHEN backfill."clientCountry" = 'USA' THEN 'United States'
    ELSE backfill."clientCountry"
  END,
  "clientRating" = backfill."clientRating",
  "clientSpent" = backfill."clientSpent",
  "clientPaymentVerified" = backfill."clientPaymentVerified",
  "agencyRequired" = backfill."agencyRequired"
FROM (
  SELECT DISTINCT ON (record."leadId")
    record."leadId",
    NULLIF(record."rawPayload"->'derived'->>'clientCountry', '') AS "clientCountry",
    CASE
      WHEN jsonb_typeof(record."rawPayload"->'derived'->'clientRating') = 'number'
        AND (record."rawPayload"->'derived'->>'clientRating')::numeric > 0
      THEN (record."rawPayload"->'derived'->>'clientRating')::numeric
      ELSE NULL
    END AS "clientRating",
    CASE
      WHEN jsonb_typeof(record."rawPayload"->'derived'->'clientSpent') = 'number'
      THEN (record."rawPayload"->'derived'->>'clientSpent')::numeric
      ELSE NULL
    END AS "clientSpent",
    CASE
      WHEN jsonb_typeof(record."rawPayload"->'derived'->'clientPaymentVerified') = 'boolean'
      THEN (record."rawPayload"->'derived'->>'clientPaymentVerified')::boolean
      ELSE NULL
    END AS "clientPaymentVerified",
    CASE
      WHEN jsonb_typeof(record."rawPayload"->'derived'->'agencyRequired') = 'boolean'
      THEN (record."rawPayload"->'derived'->>'agencyRequired')::boolean
      ELSE NULL
    END AS "agencyRequired"
  FROM "IntakeRecord" AS record
  ORDER BY record."leadId", record."createdAt" DESC
) AS backfill
WHERE lead."id" = backfill."leadId";
