import type { CalendarEvent } from "@/lib/types";
import { GOOGLE_SCOPE } from "@/lib/constants";

/**
 * Read-only Google Calendar access, fully client-side.
 *
 * Uses Google Identity Services' token model (implicit flow): no client
 * secret, no backend, no refresh token — the access token lives in memory
 * only and expires in about an hour. Events are cached in localStorage by
 * the events provider, so detection and briefings keep working after the
 * token is gone; the user simply reconnects to refresh.
 *
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID and the app's origin registered in
 * the Google Cloud Console (Authorized JavaScript origins).
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";

export class GoogleCalendarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCalendarError";
  }
}

export function googleClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  return id && id.trim() ? id : null;
}

interface TokenClientOptions {
  client_id: string;
  scope: string;
  callback: (response: { access_token?: string; error?: string }) => void;
  error_callback?: (error: { type?: string; message?: string }) => void;
}

interface TokenClient {
  requestAccessToken: (hint?: { prompt?: string }) => void;
}

interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient: (options: TokenClientOptions) => TokenClient;
      revoke: (token: string, done?: () => void) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleGlobal;
  }
}

let gsiLoad: Promise<GoogleGlobal> | null = null;

/** Load (once) the Google Identity Services script. */
export function loadGoogleIdentity(): Promise<GoogleGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new GoogleCalendarError("Google sign-in requires a browser."));
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google);
  }
  if (gsiLoad) return gsiLoad;

  gsiLoad = new Promise<GoogleGlobal>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) resolve(window.google);
      else reject(new GoogleCalendarError("Google Identity Services failed to initialise."));
    };
    script.onerror = () =>
      reject(new GoogleCalendarError("Could not reach Google sign-in. Check your connection."));
    document.head.appendChild(script);
  });
  return gsiLoad;
}

/** Ask the user for a read-only calendar access token (popup). */
export async function requestGoogleToken(): Promise<string> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new GoogleCalendarError(
      "Google Calendar is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local.",
    );
  }
  const google = await loadGoogleIdentity();
  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new GoogleCalendarError(response.error ?? "Google sign-in was cancelled."));
      },
      error_callback: (err) =>
        reject(new GoogleCalendarError(err.message ?? "Google sign-in failed.")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export function revokeGoogleToken(token: string): void {
  if (typeof window === "undefined" || !window.google?.accounts?.oauth2) return;
  try {
    window.google.accounts.oauth2.revoke(token, () => {});
  } catch {
    /* best effort */
  }
}

interface GoogleCalendarItem {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
}

/** Fetch upcoming primary-calendar events (now → now + horizonDays). */
export async function fetchGoogleEvents(
  accessToken: string,
  horizonDays = 60,
): Promise<CalendarEvent[]> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + horizonDays * 86_400_000).toISOString();
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new GoogleCalendarError("Could not reach Google Calendar.");
  }
  if (!res.ok) {
    if (res.status === 401) {
      throw new GoogleCalendarError("Google access expired — reconnect to refresh.");
    }
    throw new GoogleCalendarError(`Google Calendar error ${res.status}.`);
  }
  const json = (await res.json()) as { items?: GoogleCalendarItem[] };
  const items = json.items ?? [];

  const events: CalendarEvent[] = [];
  for (const item of items) {
    if (item.status === "cancelled" || !item.summary?.trim() || !item.start) continue;
    const allDay = Boolean(item.start.date);
    const startRawValue = item.start.dateTime ?? item.start.date;
    if (!startRawValue) continue;
    const startMs = item.start.dateTime
      ? new Date(item.start.dateTime).getTime()
      : new Date(`${item.start.date}T00:00:00`).getTime();
    if (!Number.isFinite(startMs)) continue;
    const endMs = item.end?.dateTime
      ? new Date(item.end.dateTime).getTime()
      : item.end?.date
        ? new Date(`${item.end.date}T00:00:00`).getTime() - 86_400_000
        : undefined;
    events.push({
      id: item.id ? `gcal-${item.id}` : googleFallbackId(item),
      title: item.summary.trim(),
      description: item.description?.trim() || undefined,
      location: item.location?.trim() || undefined,
      start: startMs,
      end: endMs && Number.isFinite(endMs) ? endMs : undefined,
      allDay: allDay,
      source: "google",
    });
  }
  return events.sort((a, b) => a.start - b.start);
}

function startRawSafe(item: GoogleCalendarItem): string | undefined {
  return item.start?.dateTime ?? item.start?.date;
}

function googleFallbackId(item: GoogleCalendarItem): string {
  const basis = `${item.summary}|${startRawSafe(item)}`;
  let h = 0;
  for (let i = 0; i < basis.length; i++) {
    h = (h * 31 + basis.charCodeAt(i)) | 0;
  }
  return `gcal-${(h >>> 0).toString(36)}`;
}