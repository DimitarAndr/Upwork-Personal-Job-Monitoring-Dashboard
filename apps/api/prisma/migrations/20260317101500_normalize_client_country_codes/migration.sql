UPDATE "Lead"
SET "clientCountry" = CASE "clientCountry"
  WHEN 'AUS' THEN 'Australia'
  WHEN 'BGD' THEN 'Bangladesh'
  WHEN 'CAN' THEN 'Canada'
  WHEN 'COL' THEN 'Colombia'
  WHEN 'DEU' THEN 'Germany'
  WHEN 'DNK' THEN 'Denmark'
  WHEN 'GBR' THEN 'United Kingdom'
  WHEN 'GEO' THEN 'Georgia'
  WHEN 'IND' THEN 'India'
  WHEN 'ISR' THEN 'Israel'
  WHEN 'PAK' THEN 'Pakistan'
  WHEN 'UKR' THEN 'Ukraine'
  WHEN 'USA' THEN 'United States'
  WHEN 'US' THEN 'United States'
  WHEN 'VNM' THEN 'Vietnam'
  ELSE "clientCountry"
END
WHERE "clientCountry" IN (
  'AUS',
  'BGD',
  'CAN',
  'COL',
  'DEU',
  'DNK',
  'GBR',
  'GEO',
  'IND',
  'ISR',
  'PAK',
  'UKR',
  'USA',
  'US',
  'VNM'
);
