import { forwardUpstreamJson, getApiBaseUrl } from "../../../_lib/upstream";
import { getAdminSessionState } from "../../../../_lib/admin-auth";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      leadId: string;
    }>;
  }
) {
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

  const { leadId } = await context.params;
  const body = await request.text();

  return forwardUpstreamJson(`${getApiBaseUrl()}/leads/${leadId}/enrich`, {
    method: "POST",
    body
  });
}
