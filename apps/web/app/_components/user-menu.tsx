"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type UserMenuProps = {
  authReady: boolean;
  isAuthenticated: boolean;
  userName: string;
  userRole: string;
  userShortLabel: string;
  userInitial: string;
};

export function UserMenu({
  authReady,
  isAuthenticated,
  userName,
  userRole,
  userShortLabel,
  userInitial
}: UserMenuProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST"
      });
    } finally {
      router.push("/internal-ops/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <DropdownMenu.Root>
      <div className={authReady ? "userMenu" : "userMenu userMenuMuted"}>
        <DropdownMenu.Trigger className="userMenuTrigger">
          <span aria-hidden="true" className="userMenuAvatar">
            {userInitial}
          </span>
          <span className="userMenuTriggerText">
            <strong>{userShortLabel}</strong>
            <span>{userRole}</span>
          </span>
          <span aria-hidden="true" className="userMenuChevron">
            ▾
          </span>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="userMenuContent"
            collisionPadding={16}
            sideOffset={12}
          >
            <DropdownMenu.Label className="userMenuHeader">
              <p className="userMenuName">{userName}</p>
              <p className="userMenuRole">{userRole}</p>
            </DropdownMenu.Label>

            <DropdownMenu.Separator className="userMenuDivider" />

            <div className="userMenuActions">
              {isAuthenticated ? (
                <>
                  <DropdownMenu.Item asChild>
                    <Link className="userMenuItem" href="/admin">
                      Admin workspace
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    asChild
                    disabled={isLoggingOut}
                    onSelect={(event) => {
                      event.preventDefault();
                      void handleLogout();
                    }}
                  >
                    <button className="userMenuItem userMenuItemLogout" type="button">
                      {isLoggingOut ? "Logging out..." : "Log out"}
                    </button>
                  </DropdownMenu.Item>
                </>
              ) : authReady ? (
                <p className="userMenuHint">Public view.</p>
              ) : (
                <p className="userMenuHint">Authentication is not configured.</p>
              )}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </div>
    </DropdownMenu.Root>
  );
}
