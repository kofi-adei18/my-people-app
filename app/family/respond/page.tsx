import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { FamilyRespondView } from "@/components/family/family-respond-view";

export const metadata: Metadata = {
  title: "Family Member View — My People",
};

export default function FamilyRespondPage() {
  return (
    <PageShell>
      <FamilyRespondView />
    </PageShell>
  );
}
