import { redirect } from "next/navigation";

type AdminEnrichPageProps = {
  searchParams: Promise<{
    leadId?: string;
    title?: string;
  }>;
};

export default async function AdminEnrichPage({ searchParams }: AdminEnrichPageProps) {
  const params = await searchParams;

  const query = new URLSearchParams();

  if (params.leadId) {
    query.set("leadId", params.leadId);
  }

  if (params.title) {
    query.set("title", params.title);
  }

  const suffix = query.toString();
  redirect(suffix ? `/admin/enrich?${suffix}` : "/admin/enrich");
}
