"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { MessageCircleHeartIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand";
import { useProfile } from "@/lib/profile-context";
import { CONNECTION_LABELS } from "@/lib/constants";

const NAV = [
  { href: "/journey", label: "My Journey" },
  { href: "/events", label: "Events" },
  { href: "/culture-bank", label: "Culture Bank" },
  { href: "/settings", label: "Settings" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { profile, isCustomized } = useProfile();

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
              pathname === item.href || pathname.startsWith(item.href);
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

        <div className="flex items-center gap-2">
          <Link
            href="/ask"
            aria-label="Ask My People anything about your heritage"
            title="Ask My People"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircleHeartIcon className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href={isCustomized ? "/onboarding" : "/onboarding"}
            className="inline-flex max-w-44 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                isCustomized ? "bg-gold-deep" : "bg-muted-foreground/40",
              )}
            />
            <span className="truncate">
              {isCustomized && profile
                ? CONNECTION_LABELS[profile.culturalConnectionLevel]
                : "Begin your journey"}
            </span>
          </Link>
        </div>
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