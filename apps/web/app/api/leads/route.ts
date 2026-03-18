import { forwardUpstreamJson, getApiBaseUrl } from "../_lib/upstream";
import { getAdminSessionState } from "../../_lib/admin-auth";

export async function GET(request: Request) {
  const { isAuthenticated, missingVars } = await getAdminSessionState();

  if (missingVars.length > 0) {
    return Response.json(
      { error: `Missing auth configuration: ${missingVars.join(", ")}` },
      { status: 500 }
    );
  }

  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.toString();
  const upstreamUrl = `${getApiBaseUrl()}/leads${search ? `?${search}` : ""}`;

  return forwardUpstreamJson(upstreamUrl, {
    method: "GET"
  });
}
