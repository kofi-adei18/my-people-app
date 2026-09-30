import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { EventPrepCreate } from "@/components/event-prep-create";
import { EventPrepList } from "@/components/event-prep-list";

export const metadata: Metadata = {
  title: "Build a prep journey — My People",
};

export default function EventPrepPage() {
  return (
    <PageShell>
      <EventPrepCreate />
      <div className="mx-auto w-full max-w-2xl px-4 pb-8 sm:px-6">
        <EventPrepList canDelete />
      </div>
    </PageShell>
  );
}
