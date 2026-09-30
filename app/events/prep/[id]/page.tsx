import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { EventPrepPlayer } from "@/components/event-prep-player";

export default async function EventPrepJourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let journeyId = id;
  try {
    journeyId = decodeURIComponent(id);
  } catch {
    /* keep raw value */
  }
  if (!journeyId) notFound();

  return (
    <PageShell>
      <EventPrepPlayer journeyId={journeyId} />
    </PageShell>
  );
}
