import type { CalendarEvent } from "@/lib/types";

/**
 * Minimal client-side .ics (iCalendar) parser — the zero-key calendar path.
 *
 * Handles what cultural-event detection actually needs: VEVENT blocks with
 * SUMMARY, DTSTART/DTEND (with or without TZID, plus all-day VALUE=DATE),
 * DESCRIPTION, LOCATION and UID. Line unfolding, escaping and UTC/basic
 * timestamps are handled per RFC 5545. Recurrence is intentionally out of
 * scope: recurring cultural events are rare in practice and confirmed
 * occurrences are what the learner prepares for.
 */

interface IcsProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Unfold continuation lines (a CRLF followed by a space or tab). */
function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Split "NAME;PARAM=x:value" — the value itself may contain ':'. */
function parseProperty(line: string): IcsProperty | null {
  const colon = findValueColon(line);
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.split(";");
  const name = (parts[0] ?? "").trim().toUpperCase();
  if (!name) return null;
  const params: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq > 0) params[part.slice(0, eq).trim().toUpperCase()] = part.slice(eq + 1).trim().replace(/^"|"$/g, "");
  }
  return { name, params, value };
}

/** The colon that starts the value — ignores colons inside quoted params. */
function findValueColon(line: string): number {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ":" && !inQuotes) return i;
  }
  return -1;
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Parse an ICS date-time property value into epoch ms. */
function parseIcsDate(value: string, allDay: boolean): number | null {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (allDay || !hh) {
    // All-day dates are interpreted in the viewer's local time.
    return new Date(Number(y), Number(mo) - 1, Number(d)).getTime();
  }
  if (z) {
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  }
  // Floating local time — treat as local.
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
}

function stableId(uid: string | undefined, ev: Omit<CalendarEvent, "id">): string {
  if (uid) return `ics-${uid}`;
  const basis = `${ev.title}|${ev.start}|${ev.location ?? ""}`;
  let h = 0;
  for (let i = 0; i < basis.length; i++) {
    h = (h * 31 + basis.charCodeAt(i)) | 0;
  }
  return `ics-${(h >>> 0).toString(36)}`;
}

export function parseIcs(raw: string): CalendarEvent[] {
  const lines = unfold(raw);
  const events: CalendarEvent[] = [];
  let current: {
    uid?: string;
    summary?: string;
    description?: string;
    location?: string;
    start?: number;
    end?: number;
    allDay: boolean;
  } | null = null;

  const flush = () => {
    if (!current || current.start === undefined || !current.summary?.trim()) {
      current = null;
      return;
    }
    const ev: Omit<CalendarEvent, "id"> = {
      title: current.summary.trim(),
      description: current.description?.trim() || undefined,
      location: current.location?.trim() || undefined,
      start: current.start,
      end: current.end,
      allDay: current.allDay,
      source: "ics",
    };
    events.push({ id: stableId(current.uid, ev), ...ev });
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      current = { allDay: false };
      continue;
    }
    if (trimmed === "END:VEVENT") {
      flush();
      continue;
    }
    if (!current) continue;

    const prop = parseProperty(trimmed);
    if (!prop) continue;

    switch (prop.name) {
      case "UID":
        current.uid = unescapeText(prop.value);
        break;
      case "SUMMARY":
        current.summary = unescapeText(prop.value);
        break;
      case "DESCRIPTION":
        current.description = unescapeText(prop.value);
        break;
      case "LOCATION":
        current.location = unescapeText(prop.value);
        break;
      case "DTSTART": {
        current.allDay = prop.params.VALUE === "DATE";
        const parsed = parseIcsDate(prop.value, current.allDay);
        if (parsed !== null) current.start = parsed;
        break;
      }
      case "DTEND": {
        const parsed = parseIcsDate(prop.value, prop.params.VALUE === "DATE");
        if (parsed !== null) {
          // All-day DTEND is exclusive; pull it back one day for a sane end.
          current.end = prop.params.VALUE === "DATE" ? parsed - 86_400_000 : parsed;
        }
        break;
      }
    }
  }

  return events.sort((a, b) => a.start - b.start);
}