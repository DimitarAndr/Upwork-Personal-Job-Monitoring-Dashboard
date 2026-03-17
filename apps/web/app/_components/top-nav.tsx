import Link from "next/link";

const navItems = [
  {
    href: "/",
    label: "Overview"
  },
  {
    href: "/admin",
    label: "Admin"
  },
  {
    href: "/portfolio",
    label: "Portfolio"
  }
];

type TopNavProps = {
  currentPath: string;
};

export function TopNav({ currentPath }: TopNavProps) {
  return (
    <header className="topNav">
      <Link className="brand" href="/">
        <span className="brandMark" aria-hidden="true" />
        <span className="brandCopy">
          <strong>Proposal Intelligence</strong>
          <span>Internal ops + external proof</span>
        </span>
      </Link>

      <nav className="navLinks" aria-label="Primary">
        {navItems.map((item) => {
          const isActive = currentPath === item.href;

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
    </header>
  );
}
