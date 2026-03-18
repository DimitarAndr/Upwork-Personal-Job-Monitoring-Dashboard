import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE_NAME = "admin_session";

const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const ADMIN_SESSION_PURPOSE = "internal-admin";
const ADMIN_SESSION_VERSION = "v1";

type AdminAuthConfig = {
  adminToken: string;
  missingVars: string[];
  sessionSecret: string;
};

function hashAdminToken(adminToken: string) {
  return createHash("sha256").update(adminToken).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signPayload(payload: string, sessionSecret: string) {
  return createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

export function getAdminAuthConfig(): AdminAuthConfig {
  const adminToken = process.env.ADMIN_AUTH_TOKEN?.trim() ?? "";
  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
  const missingVars: string[] = [];

  if (!adminToken) {
    missingVars.push("ADMIN_AUTH_TOKEN");
  }

  if (!sessionSecret) {
    missingVars.push("ADMIN_SESSION_SECRET");
  }

  return {
    adminToken,
    missingVars,
    sessionSecret
  };
}

export function isValidAdminToken(inputToken: string, adminToken: string) {
  return safeEqual(inputToken, adminToken);
}

export function createAdminSessionValue(adminToken: string, sessionSecret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  const tokenFingerprint = hashAdminToken(adminToken);
  const payload = [
    ADMIN_SESSION_VERSION,
    ADMIN_SESSION_PURPOSE,
    String(expiresAt),
    tokenFingerprint
  ].join(".");

  return `${payload}.${signPayload(payload, sessionSecret)}`;
}

export function isValidAdminSession(
  sessionValue: string | undefined,
  adminToken: string,
  sessionSecret: string
) {
  if (!sessionValue) {
    return false;
  }

  const parts = sessionValue.split(".");
  if (parts.length !== 5) {
    return false;
  }

  const [version, purpose, expiresAtRaw, tokenFingerprint, signature] = parts;

  if (version !== ADMIN_SESSION_VERSION || purpose !== ADMIN_SESSION_PURPOSE) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedTokenFingerprint = hashAdminToken(adminToken);
  if (!safeEqual(tokenFingerprint, expectedTokenFingerprint)) {
    return false;
  }

  const payload = [version, purpose, expiresAtRaw, tokenFingerprint].join(".");
  const expectedSignature = signPayload(payload, sessionSecret);

  return safeEqual(signature, expectedSignature);
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

export async function getAdminSessionState() {
  const { adminToken, missingVars, sessionSecret } = getAdminAuthConfig();

  if (missingVars.length > 0) {
    return {
      isAuthenticated: false,
      missingVars
    };
  }

  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  return {
    isAuthenticated: isValidAdminSession(sessionValue, adminToken, sessionSecret),
    missingVars
  };
}
