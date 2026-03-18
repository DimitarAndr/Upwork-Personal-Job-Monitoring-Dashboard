import { redirect } from "next/navigation";
import { getAdminSessionState } from "../_lib/admin-auth";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, missingVars } = await getAdminSessionState();

  if (missingVars.length > 0) {
    return (
      <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
        <h1>Configuration Error</h1>
        <p>
          Missing auth configuration in your <code>.env</code>: {missingVars.join(", ")}.
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    redirect("/internal-ops/login");
  }

  return <>{children}</>;
}
