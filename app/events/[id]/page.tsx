import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { EventBriefingView } from "@/components/event-briefing-view";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Route params arrive URL-encoded (e.g. "@" → "%40"); decode for lookup.
  let eventId = id;
  try {
    eventId = decodeURIComponent(id);
  } catch {
    /* keep raw value */
  }
  if (!eventId) notFound();

  return (
    <PageShell>
      <EventBriefingView eventId={eventId} />
    </PageShell>
  );
}