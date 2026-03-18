import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionValue,
  getAdminAuthConfig,
  getAdminSessionCookieOptions,
  isValidAdminToken
} from "../../../_lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    const { adminToken, missingVars, sessionSecret } = getAdminAuthConfig();

    if (missingVars.length > 0) {
      return NextResponse.json(
        { error: `Missing auth configuration: ${missingVars.join(", ")}` },
        { status: 500 }
      );
    }

    if (!token || !isValidAdminToken(token, adminToken)) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(
      ADMIN_SESSION_COOKIE_NAME,
      createAdminSessionValue(adminToken, sessionSecret),
      getAdminSessionCookieOptions()
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
