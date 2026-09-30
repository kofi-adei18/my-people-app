/**
 * Demo calendar generator.
 *
 * Examiners/demo users won't have a real calendar to connect, and a static
 * .ics file goes stale (events drift outside the lead window). This builds
 * the same demo events as public/sample-calendar.ics but with dates
 * relative to "now" so detection and briefing flows always have something
 * inside the 7-day window.
 */

function icsDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function stamp(d: Date): string {
  return `${icsDate(d)}T090000Z`;
}

interface DemoEventSpec {
  uid: string;
  /** Offset in days from today (negative = past). */
  offsetDays: number;
  summary: string;
  description?: string;
  location?: string;
}

const DEMO_EVENTS: DemoEventSpec[] = [
  {
    uid: "sample-akosua-one-week@my-people",
    offsetDays: -5,
    summary: "One week observance — Akosua Mansa",
    description: "Adua at the family house",
    location: "Kumasi",
  },
  {
    uid: "sample-akosua-funeral@my-people",
    offsetDays: 4,
    summary: "Final funeral rites — Akosua Mansa (Auntie Akosua)",
    description:
      "One-week observance completed last month, final rites at the family house in Kumasi. Wear black cloth.",
    location: "Family house, Kumasi",
  },
  {
    uid: "sample-birthday@my-people",
    offsetDays: 10,
    summary: "Dinner with Adwoa",
    location: "Accra",
  },
  {
    uid: "sample-wedding@my-people",
    offsetDays: 14,
    summary: "Engagement ceremony — Ama & Kwabena",
    description:
      "Traditional marriage at Maame Efua's house, followed by reception. Colour theme: gold and green.",
    location: "Cape Coast",
  },
];

/** Build an .ics string with demo events anchored around `now`. */
export function buildDemoIcs(now: Date = new Date()): string {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dtStamp = stamp(today);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//My People//Demo Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const spec of DEMO_EVENTS) {
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() + spec.offsetDays);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${spec.uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${icsDate(start)}`,
      `DTEND;VALUE=DATE:${icsDate(end)}`,
      `SUMMARY:${spec.summary}`,
    );
    if (spec.description) {
      // Escape per RFC 5545 (commas, semicolons, backslashes).
      lines.push(`DESCRIPTION:${spec.description.replace(/([,;\\])/g, "\\$1")}`);
    }
    if (spec.location) {
      lines.push(`LOCATION:${spec.location.replace(/([,;\\])/g, "\\$1")}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Number of demo events produced by buildDemoIcs (for UI copy). */
export const DEMO_EVENT_COUNT = DEMO_EVENTS.length;
