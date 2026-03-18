import Link from "next/link";
import { getAdminSessionState } from "../_lib/admin-auth";
import { UserMenu } from "./user-menu";

const navItems = [
  {
    href: "/",
    label: "Overview"
  },
  {
    href: "/portfolio",
    label: "Portfolio"
  }
];

type TopNavProps = {
  currentPath: string;
};

export async function TopNav({ currentPath }: TopNavProps) {
  const { isAuthenticated, missingVars } = await getAdminSessionState();
  const authReady = missingVars.length === 0;
  const userName = isAuthenticated
    ? "Admin"
    : authReady
      ? "Guest"
      : "Authentication";
  const userShortLabel = isAuthenticated ? "Admin" : authReady ? "Guest" : "Auth";
  const userRole = isAuthenticated
    ? "Internal account"
    : authReady
      ? "Public view"
      : "Unavailable";
  const userInitial = isAuthenticated ? "A" : authReady ? "G" : "?";

  return (
    <header className="topNav">
      <nav className="navLinks" aria-label="Primary">
        {navItems.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href !== "/" && currentPath.startsWith(`${item.href}/`));

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "navLink navLinkActive" : "navLink"}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="topNavActions">
        <UserMenu
          authReady={authReady}
          isAuthenticated={isAuthenticated}
          userInitial={userInitial}
          userName={userName}
          userRole={userRole}
          userShortLabel={userShortLabel}
        />
      </div>
    </header>
  );
}
