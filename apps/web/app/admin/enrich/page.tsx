import { TopNav } from "../../_components/top-nav";
import { EnrichmentForm } from "../_components/enrichment-form";

type AdminEnrichPageProps = {
  searchParams: Promise<{
    leadId?: string;
    title?: string;
  }>;
};

export default async function AdminEnrichPage({ searchParams }: AdminEnrichPageProps) {
  const params = await searchParams;

  return (
    <main className="pageShell">
      <TopNav currentPath="/admin" />
      <EnrichmentForm leadId={params.leadId} leadTitle={params.title} />
    </main>
  );
}
