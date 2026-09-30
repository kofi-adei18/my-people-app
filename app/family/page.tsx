import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { FamilyView } from "@/components/family/family-view";

export const metadata: Metadata = {
  title: "Ask My Family — My People",
};

export default function FamilyPage() {
  return (
    <PageShell>
      <FamilyView />
    </PageShell>
  );
}
