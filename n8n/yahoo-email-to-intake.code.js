// Paste this into an n8n Code node that runs after your Yahoo IMAP trigger.
// It normalizes the mail item into the JSON contract expected by POST /api/intake/email.

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
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
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

function parsePricing(rawText) {
  const fixedPrefixMatch = rawText.match(/Fixed:\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  if (fixedPrefixMatch) {
    return {
      pricingType: "FIXED",
      fixedBudgetMin: Number(fixedPrefixMatch[1].replace(/,/g, ""))
    };
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

  const fixedMatch = rawText.match(/budget[:\s]+\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  if (fixedMatch) {
    return {
      pricingType: "FIXED",
      fixedBudgetMin: Number(fixedMatch[1].replace(/,/g, ""))
    };
  }

  return {
    pricingType: "UNKNOWN"
  };
}

function parseDuration(rawText) {
  const shortTermMatch = rawText.match(/<\s*(\d+)\s*month/i);
  if (shortTermMatch) {
    return `less than ${shortTermMatch[1]} month`;
  }

  const longTermMatch = rawText.match(/>\s*(\d+)\s*months/i);
  if (longTermMatch) {
    return `${longTermMatch[1]}+ months`;
  }

  const match = rawText.match(
    /(less than 1 month|1 to 3 months|3 to 6 months|6\+ months|more than 6 months)/i
  );

  return match ? match[1] : undefined;
}

function parseWorkload(rawText) {
  const lowWorkloadMatch = rawText.match(/<\s*(\d+)\s*hr\/wk/i);
  if (lowWorkloadMatch) {
    return `< ${lowWorkloadMatch[1]} hr/wk`;
  }

  const shorthandMatch = rawText.match(/>\s*(\d+\+?)\s*hr\/wk/i);
  if (shorthandMatch) {
    return `${shorthandMatch[1]} hr/wk`;
  }

  const match = rawText.match(/(\d+\+?\s*hrs?\/week)/i);
  return match ? match[1] : undefined;
}

function parseExperienceLevel(rawText) {
  const match = rawText.match(/\b(entry|intermediate|expert)\b/i);
  return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : undefined;
}

function extractTitle(subject, rawText) {
  const subjectTitle = pickString(subject)
    ?.replace(/^new jobs matching:\s*/i, "")
    .replace(/^new job:\s*/i, "");
  if (subjectTitle) {
    return subjectTitle;
  }

  const firstSentence = rawText.split(/\r?\n|\.\s/).find((line) => line.trim().length > 12);
  return firstSentence ? firstSentence.trim() : "Yahoo job alert";
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
  const matches = [...rawText.matchAll(/^\s*([A-Za-z0-9.+/# -]{2,40}):\s+https?:\/\/www\.upwork\.com\/jobs\/~/gim)];
  const excludedLabels = new Set([
    "more",
    "view job details",
    "privacy policy",
    "contact support",
    "manage your alert preferences"
  ]);

  return [...new Set(matches
    .map((match) => match[1].trim())
    .filter((label) => !excludedLabels.has(label.toLowerCase()))
    .filter((label) => !/^\+\d+$/.test(label))
    .filter((label) => !/^\d+$/.test(label)))];
}

function extractClientCountry(rawText) {
  const match = rawText.match(
    /\$\d+(?:,\d{3})*(?:\.\d+)?\s+spent\s+([A-Za-z][A-Za-z .'-]{1,40})\s+[A-Za-z0-9.+/# -]{2,40}:\s+https?:\/\/www\.upwork\.com\/jobs\//i
  );

  return match ? match[1].trim() : undefined;
}

function extractClientSpent(rawText) {
  const match = rawText.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)\s+spent/i);
  return match ? Number(match[1].replace(/,/g, "")) : undefined;
}

function extractClientRating(rawText) {
  const match = rawText.match(/Payment verified\s+(\d(?:\.\d{1,2})?)\s+\$\d/i);
  return match ? Number(match[1]) : undefined;
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
const postedAt = extractPostedAt(text);
const pricing = parsePricing(text);
const visibleSkills = extractVisibleSkills(text);

return {
  json: {
    channel: "EMAIL_ALERT",
    externalId,
    subject,
    sender,
    receivedAt,
    postedAt,
    title: extractTitle(subject, text),
    sourceUrl: extractJobUrl(text, html),
    rawText: text,
    summary: text.slice(0, 280),
    pricingType: pricing.pricingType,
    hourlyMin: pricing.hourlyMin,
    hourlyMax: pricing.hourlyMax,
    fixedBudgetMin: pricing.fixedBudgetMin,
    durationText: parseDuration(text),
    workloadText: parseWorkload(text),
    experienceLevel: parseExperienceLevel(text),
    visibleSkills,
    rawPayload: {
      source: "yahoo-imap",
      mailbox: pickString(input.mailbox, input.folder) ?? "INBOX",
      originalHtml: html || undefined,
      originalText: text,
      headers,
      derived: {
        agencyRequired: /agency required/i.test(text),
        clientCountry: extractClientCountry(text),
        clientPaymentVerified: /payment verified/i.test(text),
        clientRating: extractClientRating(text),
        clientSpent: extractClientSpent(text),
        postedAt,
        visibleSkills
      }
    }
  }
};
