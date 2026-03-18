// Paste this into an n8n Code node that runs after your Yahoo IMAP trigger.
// It normalizes the mail item into the JSON contract expected by POST /api/intake/email.

const PARSE_VERSION = "yahoo-imap-v3";

function pickString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function cleanHeaderValue(value) {
  return pickString(value)?.replace(/^[A-Za-z-]+:\s*/, "");
}

function extractEmail(value) {
  const normalized = cleanHeaderValue(value);
  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/<([^>]+)>/);
  return match ? match[1].trim() : normalized;
}

function toIsoDate(value) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&hellip;/gi, "...")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

function getNonEmptyLines(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => decodeHtmlEntities(line).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseCompactAmount(value) {
  const match = value.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)([KMB])?/i);
  if (!match) {
    return undefined;
  }

  const baseAmount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(baseAmount)) {
    return undefined;
  }

  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === "K"
    ? 1_000
    : suffix === "M"
      ? 1_000_000
      : suffix === "B"
        ? 1_000_000_000
        : 1;

  return baseAmount * multiplier;
}

function normalizeCountry(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const upper = normalized.toUpperCase();
  const aliases = {
    AUS: "Australia",
    BGD: "Bangladesh",
    CAN: "Canada",
    COL: "Colombia",
    DEU: "Germany",
    DNK: "Denmark",
    GBR: "United Kingdom",
    GEO: "Georgia",
    IND: "India",
    ISR: "Israel",
    PAK: "Pakistan",
    UKR: "Ukraine",
    USA: "United States",
    US: "United States",
    VNM: "Vietnam"
  };

  if (upper === "U.S.A.") {
    return "United States";
  }

  if (upper === "UK" || upper === "U.K.") {
    return "United Kingdom";
  }

  if (aliases[upper]) {
    return aliases[upper];
  }

  return normalized;
}

function findFirstUrl(text) {
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[)>.,]+$/, "") : undefined;
}

function canonicalizeUpworkJobUrl(url) {
  if (!url) {
    return undefined;
  }

  const decodedUrl = decodeHtmlEntities(url);

  try {
    const parsed = new URL(decodedUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return decodedUrl;
  }
}

function extractJobUrl(text, html) {
  const directMatch = text.match(/View job details:\s*(https?:\/\/\S+)/i);
  if (directMatch) {
    return canonicalizeUpworkJobUrl(directMatch[1]);
  }

  const snippetMatch = text.match(/more:\s*(https?:\/\/\S+)/i);
  if (snippetMatch) {
    return canonicalizeUpworkJobUrl(snippetMatch[1]);
  }

  return canonicalizeUpworkJobUrl(findFirstUrl(html) ?? findFirstUrl(text));
}

function parseUpworkPath(sourceUrl) {
  if (!sourceUrl) {
    return "";
  }

  try {
    return new URL(sourceUrl).pathname.toLowerCase();
  } catch {
    return sourceUrl.toLowerCase();
  }
}

function isLikelyUpworkJobAlert(subject, title, rawText, sourceUrl) {
  const safeSubject = subject?.trim().toLowerCase() ?? "";
  const safeTitle = title?.trim().toLowerCase() ?? "";
  const safeText = rawText?.trim().toLowerCase() ?? "";
  const path = parseUpworkPath(sourceUrl);

  const hasJobUrl = path.includes("/jobs/~");
  const hasJobSubject = safeSubject.startsWith("new job:") || safeSubject.startsWith("new jobs matching:");
  const hasJobBody =
    safeText.includes("new job alert") ||
    (safeText.includes("view job details:") && /posted on \d{4}-\d{2}-\d{2}/i.test(rawText));

  const hasNegativeSubject = /milestones? have been updated|milestone|workroom|offer|interview|proposal|message/i.test(
    `${safeSubject} ${safeTitle}`
  );
  const hasNegativeBody =
    safeText.includes("your milestones have been updated") ||
    safeText.includes("made updates to your contract") ||
    safeText.includes("workroom");
  const hasNegativeUrl =
    path.includes("/workroom/") ||
    path.includes("/offers/") ||
    path.includes("/messages/") ||
    path.includes("/contracts/");

  return hasJobUrl && (hasJobSubject || hasJobBody) && !hasNegativeSubject && !hasNegativeBody && !hasNegativeUrl;
}

function parsePricing(rawText) {
  const fixedPrefixMatch = rawText.match(/Fixed(?:-price)?:\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?)/i);
  if (fixedPrefixMatch) {
    const fixedBudgetMin = parseCompactAmount(fixedPrefixMatch[1]);
    if (fixedBudgetMin !== undefined) {
      return {
        pricingType: "FIXED",
        fixedBudgetMin
      };
    }
  }

  const fixedTitleMatch = rawText.match(/\(Fixed(?: Price)?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?)\)/i);
  if (fixedTitleMatch) {
    const fixedBudgetMin = parseCompactAmount(fixedTitleMatch[1]);
    if (fixedBudgetMin !== undefined) {
      return {
        pricingType: "FIXED",
        fixedBudgetMin
      };
    }
  }

  const hourlyRangeMatch = rawText.match(/Hourly:\s*\$?(\d+(?:\.\d+)?)\s*-\s*\$?(\d+(?:\.\d+)?)/i);
  if (hourlyRangeMatch) {
    return {
      pricingType: "HOURLY",
      hourlyMin: Number(hourlyRangeMatch[1]),
      hourlyMax: Number(hourlyRangeMatch[2])
    };
  }

  const hourlyMatch = rawText.match(/\$?(\d+(?:\.\d+)?)\s*-\s*\$?(\d+(?:\.\d+)?)\s*\/\s*hr/i);
  if (hourlyMatch) {
    return {
      pricingType: "HOURLY",
      hourlyMin: Number(hourlyMatch[1]),
      hourlyMax: Number(hourlyMatch[2])
    };
  }

  const fixedMatch = rawText.match(/budget[:\s]+\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?)/i);
  if (fixedMatch) {
    const fixedBudgetMin = parseCompactAmount(fixedMatch[1]);
    if (fixedBudgetMin !== undefined) {
      return {
        pricingType: "FIXED",
        fixedBudgetMin
      };
    }
  }

  return {
    pricingType: "UNKNOWN"
  };
}

function normalizeDuration(line) {
  const normalized = line.replace(/\s+/g, " ").trim();

  if (/^(?:<\s*1 month|less than 1 month)$/i.test(normalized)) {
    return {
      value: "less than 1 month"
    };
  }

  if (/^(?:1-3 months|1 to 3 months)$/i.test(normalized)) {
    return {
      value: "1-3 months"
    };
  }

  if (/^(?:3-6 months|3 to 6 months)$/i.test(normalized)) {
    return {
      value: "3-6 months"
    };
  }

  if (/^(?:6\+ months|>\s*6 months|more than 6 months)$/i.test(normalized)) {
    return {
      value: "6+ months"
    };
  }

  return undefined;
}

function parseDuration(rawText) {
  for (const line of getNonEmptyLines(rawText)) {
    const normalized = normalizeDuration(line);
    if (normalized) {
      return normalized.value;
    }
  }

  return undefined;
}

function normalizeWorkload(line) {
  const normalized = line.replace(/\s+/g, " ").trim();

  const lessThanMatch = normalized.match(/^<\s*(\d+)\s*(?:hr\/wk|hrs?\/week)$/i);
  if (lessThanMatch) {
    return `< ${lessThanMatch[1]} hr/wk`;
  }

  const moreThanMatch = normalized.match(/^>\s*(\d+)\s*(?:hr\/wk|hrs?\/week)$/i);
  if (moreThanMatch) {
    return `> ${moreThanMatch[1]} hr/wk`;
  }

  const exactMatch = normalized.match(/^(\d+)\+?\s*(?:hr\/wk|hrs?\/week)$/i);
  if (exactMatch) {
    return normalized.includes("+") ? `${exactMatch[1]}+ hr/wk` : `${exactMatch[1]} hr/wk`;
  }

  return undefined;
}

function parseWorkload(rawText) {
  for (const line of getNonEmptyLines(rawText)) {
    const normalized = normalizeWorkload(line);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function parseExperienceLevel(rawText) {
  const match = rawText.match(/\b(entry|intermediate|expert)\b/i);
  return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : undefined;
}

function extractTitle(subject, rawText) {
  const subjectTitle = pickString(subject)
    ?.replace(/^new jobs matching:\s*/i, "")
    .replace(/^new job:\s*/i, "")
    .trim();
  if (subjectTitle && !/^new job alert$/i.test(subjectTitle)) {
    return subjectTitle;
  }

  const titleLine = getNonEmptyLines(rawText).find((line) =>
    line.length > 12 &&
    !/^new job alert$/i.test(line) &&
    !/^hi,\s/i.test(line) &&
    !/^[-]+$/i.test(line)
  );

  return titleLine ?? "Yahoo job alert";
}

function extractPostedAt(rawText) {
  const match = rawText.match(/Posted on (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/i);
  if (!match) {
    return undefined;
  }

  // Upwork shows this timestamp in UTC in the email HTML tooltip.
  return `${match[1]}T${match[2]}:00.000Z`;
}

function extractVisibleSkills(rawText) {
  const matches = [...rawText.matchAll(/^\s*([A-Za-z0-9.+/#&,'() -]{2,60}):\s+https?:\/\/www\.upwork\.com\/jobs\/~/gim)];
  const excludedLabels = new Set([
    "more",
    "view job details",
    "privacy policy",
    "contact support",
    "manage your alert preferences"
  ]);

  const visibleSkills = [];
  let visibleSkillsExtraCount;

  for (const match of matches) {
    const label = decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim();
    if (excludedLabels.has(label.toLowerCase())) {
      continue;
    }

    if (/^\+\d+$/.test(label)) {
      visibleSkillsExtraCount = Math.max(visibleSkillsExtraCount ?? 0, Number(label.slice(1)));
      continue;
    }

    if (/^\d+$/.test(label) || /\.\.\./.test(label) || /\bmore\b/i.test(label)) {
      continue;
    }

    visibleSkills.push(label);
  }

  return {
    visibleSkills: [...new Set(visibleSkills)],
    visibleSkillsExtraCount
  };
}

function extractClientSpent(rawText) {
  const match = rawText.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?)\s+spent/i);
  return match ? parseCompactAmount(match[1]) : undefined;
}

function extractClientCountry(rawText) {
  const match = rawText.match(
    /\$?\s*\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?\s+spent\s+([A-Za-z][A-Za-z .'-]{1,40})(?=\s+(?:[A-Za-z0-9.+/#&,'() -]{2,60}:\s+https?:\/\/www\.upwork\.com\/jobs\/~|Posted on|View job details))/is
  );

  return match ? normalizeCountry(match[1]) : undefined;
}

function extractClientRating(rawText) {
  const match = rawText.match(
    /Payment (?:verified|unverified)\s+(\d(?:\.\d{1,2})?)(?=\s+\$?\s*\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?\s+spent)/is
  );

  if (!match) {
    return undefined;
  }

  const rating = Number(match[1]);
  return rating > 0 ? rating : undefined;
}

function extractClientSignals(rawText) {
  const lines = getNonEmptyLines(rawText);
  let clientPaymentVerified;
  let clientRating;
  let clientSpent;
  let clientCountry;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^Payment verified\b/i.test(line)) {
      clientPaymentVerified = true;
    } else if (/^Payment unverified\b/i.test(line)) {
      clientPaymentVerified = false;
    }

    if (
      clientRating === undefined &&
      /^\d(?:\.\d{1,2})?$/.test(line) &&
      /^Payment (?:verified|unverified)\b/i.test(lines[index - 1] ?? "")
    ) {
      const rating = Number(line);
      clientRating = rating > 0 ? rating : undefined;
    }

    const spentLineMatch = line.match(/^\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?(?:[KMB])?)\s+spent$/i);
    if (spentLineMatch) {
      clientSpent = parseCompactAmount(spentLineMatch[1]);

      const countryLine = lines[index + 1];
      if (
        countryLine &&
        /^[A-Za-z][A-Za-z .'-]{1,40}$/.test(countryLine) &&
        !/^Posted on\b/i.test(countryLine) &&
        !/^View job details\b/i.test(countryLine)
      ) {
        clientCountry = normalizeCountry(countryLine);
      }
    }
  }

  return {
    agencyRequired: /agency required/i.test(rawText),
    clientCountry: clientCountry ?? extractClientCountry(rawText),
    clientPaymentVerified,
    clientRating: clientRating ?? extractClientRating(rawText),
    clientSpent: clientSpent ?? extractClientSpent(rawText)
  };
}

function isDescriptionTruncated(rawText) {
  return /\.\.\.\s+more:/i.test(rawText);
}

const input = $json;
const headers = input.headers ?? {};
const subject = pickString(
  cleanHeaderValue(input.subject),
  cleanHeaderValue(headers.subject)
) ?? "Yahoo job alert";
const sender = pickString(
  extractEmail(input.from?.text),
  extractEmail(input.from?.address),
  extractEmail(input.from),
  extractEmail(headers.from),
  extractEmail(headers.sender)
) ?? "unknown";
const externalId = pickString(
  cleanHeaderValue(input.messageId),
  cleanHeaderValue(headers["message-id"]),
  input.id
);
const receivedAt = toIsoDate(
  input.date ?? input.receivedAt ?? input.sentDate ?? cleanHeaderValue(headers.date)
);
const html = pickString(input.html, input.htmlBody, input.messageHtml) ?? "";
const text = pickString(input.text, input.textPlain, input.messageText) ?? stripHtml(html);
const title = extractTitle(subject, text);
const sourceUrl = extractJobUrl(text, html);

if (!isLikelyUpworkJobAlert(subject, title, text, sourceUrl)) {
  return [];
}

const postedAt = extractPostedAt(text);
const pricing = parsePricing(text);
const visibleSkillsInfo = extractVisibleSkills(text);
const clientSignals = extractClientSignals(text);

return [{
  json: {
    channel: "EMAIL_ALERT",
    externalId,
    parseVersion: PARSE_VERSION,
    subject,
    sender,
    receivedAt,
    postedAt,
    title,
    sourceUrl,
    rawText: text,
    summary: text.slice(0, 280),
    pricingType: pricing.pricingType,
    hourlyMin: pricing.hourlyMin,
    hourlyMax: pricing.hourlyMax,
    fixedBudgetMin: pricing.fixedBudgetMin,
    durationText: parseDuration(text),
    workloadText: parseWorkload(text),
    experienceLevel: parseExperienceLevel(text),
    visibleSkills: visibleSkillsInfo.visibleSkills,
    clientCountry: clientSignals.clientCountry,
    clientPaymentVerified: clientSignals.clientPaymentVerified,
    clientRating: clientSignals.clientRating,
    clientSpent: clientSignals.clientSpent,
    agencyRequired: clientSignals.agencyRequired,
    rawPayload: {
      source: "yahoo-imap",
      mailbox: pickString(input.mailbox, input.folder) ?? "INBOX",
      originalHtml: html || undefined,
      originalText: text,
      headers,
      derived: {
        agencyRequired: clientSignals.agencyRequired,
        clientCountry: clientSignals.clientCountry,
        clientPaymentVerified: clientSignals.clientPaymentVerified,
        clientRating: clientSignals.clientRating,
        clientSpent: clientSignals.clientSpent,
        descriptionTruncated: isDescriptionTruncated(text),
        visibleSkillsExtraCount: visibleSkillsInfo.visibleSkillsExtraCount,
        postedAt,
        visibleSkills: visibleSkillsInfo.visibleSkills
      }
    }
  }
}];
