type UpworkJobAlertCandidate = {
  subject?: string | null;
  title?: string | null;
  rawText?: string | null;
  sourceUrl?: string | null;
};

function parseUpworkPath(sourceUrl?: string | null) {
  if (!sourceUrl) {
    return "";
  }

  try {
    return new URL(sourceUrl).pathname.toLowerCase();
  } catch {
    return sourceUrl.toLowerCase();
  }
}

export function isCanonicalUpworkJobUrl(sourceUrl?: string | null) {
  return parseUpworkPath(sourceUrl).includes("/jobs/~");
}

export function isLikelyUpworkJobAlert(candidate: UpworkJobAlertCandidate) {
  const subject = candidate.subject?.trim() ?? "";
  const title = candidate.title?.trim() ?? "";
  const rawText = candidate.rawText?.trim() ?? "";
  const lowerSubject = subject.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerText = rawText.toLowerCase();
  const path = parseUpworkPath(candidate.sourceUrl);

  const hasJobUrl = path.includes("/jobs/~");
  const hasJobSubject =
    lowerSubject.startsWith("new job:") || lowerSubject.startsWith("new jobs matching:");
  const hasJobBody =
    lowerText.includes("new job alert") ||
    (lowerText.includes("view job details:") && /posted on \d{4}-\d{2}-\d{2}/i.test(rawText));

  const hasNegativeSubject =
    /milestones? have been updated|milestone|workroom|offer|interview|proposal|message/i.test(
      `${lowerSubject} ${lowerTitle}`
    );
  const hasNegativeBody =
    lowerText.includes("your milestones have been updated") ||
    lowerText.includes("made updates to your contract") ||
    lowerText.includes("workroom");
  const hasNegativeUrl =
    path.includes("/workroom/") ||
    path.includes("/offers/") ||
    path.includes("/messages/") ||
    path.includes("/contracts/");

  return hasJobUrl && (hasJobSubject || hasJobBody) && !hasNegativeSubject && !hasNegativeBody && !hasNegativeUrl;
}
