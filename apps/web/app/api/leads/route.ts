import { forwardUpstreamJson, getApiBaseUrl } from "../_lib/upstream";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.toString();
  const upstreamUrl = `${getApiBaseUrl()}/leads${search ? `?${search}` : ""}`;

  return forwardUpstreamJson(upstreamUrl, {
    method: "GET"
  });
}
