"use client";

import { SiteHeader, MobileNav } from "@/components/site-header";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      {children}
      <MobileNav />
    </div>
  );
}