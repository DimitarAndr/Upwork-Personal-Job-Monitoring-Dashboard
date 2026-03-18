"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST"
      });
    } finally {
      router.push("/internal-ops/login");
      router.refresh();
      setIsPending(false);
    }
  }

  return (
    <button
      className={className ?? "buttonGhost navButton"}
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      {isPending ? "Signing out..." : "Log out"}
    </button>
  );
}
