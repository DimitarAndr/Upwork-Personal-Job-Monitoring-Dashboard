import { TopNav } from "../_components/top-nav";
import { AdminLeadDesk } from "./_components/admin-lead-desk";

export default function AdminPage() {
  return (
    <main className="pageShell pageShellWide">
      <TopNav currentPath="/admin" />

      <AdminLeadDesk />
    </main>
  );
}
