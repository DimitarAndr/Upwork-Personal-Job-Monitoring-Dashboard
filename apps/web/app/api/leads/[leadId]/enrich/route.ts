import { forwardUpstreamJson, getApiBaseUrl } from "../../../_lib/upstream";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      leadId: string;
    }>;
  }
) {
  const { leadId } = await context.params;
  const body = await request.text();

  return forwardUpstreamJson(`${getApiBaseUrl()}/leads/${leadId}/enrich`, {
    method: "POST",
    body
  });
}
