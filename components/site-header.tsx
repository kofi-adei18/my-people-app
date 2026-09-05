"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { BrandLogo } from "@/components/brand";
import { useProfile } from "@/lib/profile-context";
import { INTEREST_LABELS, LEVEL_LABELS } from "@/lib/constants";

const NAV = [
  { href: "/journey", label: "My Journey" },
  { href: "/ask", label: "Ask My People" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { profile } = useProfile();

  const interests = profile.interests
    .map((i) => INTEREST_LABELS[i] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLogo />

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 sm:flex"
        >
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-muted text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/onboarding"
          className="inline-flex max-w-40 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-label="View or edit your cultural profile"
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-gold-deep"
          />
          <span className="truncate">
            {LEVEL_LABELS[profile.knowledgeLevel]}
            {interests ? ` · ${interests}` : ""}
          </span>
        </Link>
      </div>
    </header>
  );
}

export function MobileNav() {
  return (
    <nav
      aria-label="Mobile"
      className="grid grid-cols-2 gap-2 border-t border-border/70 bg-background/80 p-2 backdrop-blur-md sm:hidden"
    >
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-lg bg-muted/60 px-3 py-2 text-center text-sm font-medium text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}