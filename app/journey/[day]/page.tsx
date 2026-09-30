import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { DayExperience } from "@/components/day-experience";
import { journeyDay } from "@/lib/journey";

export default async function DayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  const n = Number(day);
  if (!Number.isInteger(n) || n < 1 || n > 7 || !journeyDay(n)) notFound();

  return (
    <PageShell>
      <DayExperience day={n} />
    </PageShell>
  );
}