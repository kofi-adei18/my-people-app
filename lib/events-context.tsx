"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { EVENTS_STORAGE_KEY } from "@/lib/constants";
import { emptyEventsStore } from "@/lib/types";
import type {
  CalendarConnection,
  CalendarEvent,
  CalendarPrepJourney,
  DetectedEvent,
  EventBriefing,
  EventBriefingSettings,
  EventPrepJourney,
  EventReflection,
  EventType,
  EventsStore,
  PrepProgress,
  PrepStepContent,
  PrepStepId,
} from "@/lib/types";
import { parseIcs } from "@/lib/calendar/ics";
import {
  fetchGoogleEvents,
  requestGoogleToken,
  revokeGoogleToken,
} from "@/lib/calendar/google";
import { detectEvents } from "@/lib/calendar/detect";

/**
 * Client-side state for the cultural-events feature.
 *
 * All state lives in one localStorage key (`my-people:events:v1`). The
 * Google access token is deliberately NOT persisted — it lives in memory
 * for about an hour; cached events keep detection and briefings working
 * offline. The "7 days before" trigger is evaluated on every app open:
 * there is no server scheduler, so the window check runs whenever this
 * provider mounts.
 */

export type SyncStatus = "idle" | "syncing" | "error";

export interface UpcomingEvent {
  event: CalendarEvent;
  detection: DetectedEvent | null;
  briefing: EventBriefing | null;
  /** Calendar prep journey for this event, if started. */
  journey: CalendarPrepJourney | null;
  /** Post-event reflection, if saved. */
  reflection: EventReflection | null;
  /** Set when the event falls inside the current lead window. */
  due: boolean;
  /** Derived lifecycle status for list UIs. */
  status:
    | "needs-details"
    | "start-preparing"
    | "preparing"
    | "ready"
    | "briefing-ready"
    | "reflect"
    | "done";
}

interface EventsContextValue {
  store: EventsStore | null;
  settings: EventBriefingSettings;
  connection: CalendarConnection | null;
  events: CalendarEvent[];
  detections: Record<string, DetectedEvent>;
  briefings: EventBriefing[];
  /** Ready-to-prepare events inside the lead window, soonest first. */
  dueEvents: UpcomingEvent[];
  /** All detected upcoming events (for the events page), soonest first. */
  upcomingEvents: UpcomingEvent[];
  /** Events with an active or completed prep journey. */
  journeyEvents: UpcomingEvent[];
  hasGoogleConfig: boolean;
  googleTokenLive: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  /** Detection ran over the current events yet (first-load guard). */
  hydrated: boolean;
  connectGoogle: () => Promise<void>;
  refreshGoogle: () => Promise<void>;
  disconnect: () => void;
  importIcs: (label: string, text: string) => { added: number; error?: string };
  addManualEvent: (input: {
    title: string;
    date: string;
    location?: string;
    description?: string;
  }) => void;
  removeEvent: (eventId: string) => void;
  confirmEventType: (eventId: string, eventType: EventType | null) => void;
  dismissEvent: (eventId: string) => void;
  saveBriefing: (briefing: EventBriefing) => void;
  updateSettings: (patch: Partial<EventBriefingSettings>) => void;
  /** Calendar prep journeys (keyed by eventId). */
  calendarJourneys: Record<string, CalendarPrepJourney>;
  saveCalendarJourney: (journey: CalendarPrepJourney) => void;
  completeCalendarStep: (eventId: string, stepId: PrepStepId) => void;
  updateCalendarStep: (eventId: string, stepId: PrepStepId, step: PrepStepContent) => void;
  saveEventReflection: (eventId: string, reflection: EventReflection) => void;
  /** Prep journeys */
  prepJourneys: EventPrepJourney[];
  prepProgress: Record<string, PrepProgress>;
  savePrepJourney: (journey: EventPrepJourney) => void;
  removePrepJourney: (journeyId: string) => void;
  updatePrepProgress: (journeyId: string, patch: Partial<PrepProgress>) => void;
  clearEventsData: () => void;
}

const EventsContext = createContext<EventsContextValue | null>(null);

function readStore(): EventsStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EventsStore;
    // Merge with defaults so older stores survive settings additions.
    return { ...emptyEventsStore(), ...parsed, settings: { ...emptyEventsStore().settings, ...parsed.settings } };
  } catch {
    return null;
  }
}

function writeStore(store: EventsStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — state still works in memory */
  }
}

export function EventsProvider({ children }: { children: React.ReactNode }) {
  // Lazily hydrated on the client (same pattern as ProfileProvider); on the
  // server this stays null and consumers render their empty states.
  const [store, setStore] = useState<EventsStore | null>(() => {
    if (typeof window === "undefined") return null;
    const base = readStore() ?? emptyEventsStore();
    if (Object.keys(base.detections).length === 0 && base.events.length > 0) {
      base.detections = detectEvents(base.events);
    }
    return base;
  });
  const [token, setToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  const hasGoogleConfig = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  /** Merge a batch of incoming events, replacing same-source events. */
  const mergeEvents = useCallback(
    (
      incoming: CalendarEvent[],
      source: "google" | "ics" | "manual",
    ) => {
      setStore((prev) => {
        const base = prev ?? emptyEventsStore();
        const kept = base.events.filter((e) => e.source !== source);
        const byId = new Map<string, CalendarEvent>();
        for (const ev of [...kept, ...incoming]) {
          byId.set(ev.id, ev);
        }
        const events = [...byId.values()].sort((a, b) => a.start - b.start);
        // Fresh detection over new events only; keep confirmations intact.
        const fresh = detectEvents(incoming);
        const detections: Record<string, DetectedEvent> = { ...base.detections };
        for (const [id, det] of Object.entries(fresh)) {
          if (!detections[id]) detections[id] = det;
        }
        // Drop detections whose events no longer exist.
        const eventIds = new Set(events.map((e) => e.id));
        for (const id of Object.keys(detections)) {
          if (!eventIds.has(id)) delete detections[id];
        }
        return { ...base, events, detections };
      });
    },
    [],
  );

  const connectGoogle = useCallback(async () => {
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      const accessToken = await requestGoogleToken();
      setToken(accessToken);
      const events = await fetchGoogleEvents(accessToken);
      mergeEvents(events, "google");
      setStore((prev) => {
        const base = prev ?? emptyEventsStore();
        const connection: CalendarConnection = { provider: "google", connectedAt: Date.now() };
        const next = { ...base, connection };
        writeStore(next);
        return next;
      });
      setSyncStatus("idle");
    } catch (err) {
      setSyncStatus("error");
      setSyncError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [mergeEvents]);

  const refreshGoogle = useCallback(async () => {
    if (!token) {
      await connectGoogle();
      return;
    }
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      const events = await fetchGoogleEvents(token);
      mergeEvents(events, "google");
      setSyncStatus("idle");
    } catch {
      // Token likely expired — fall back to a fresh consent request.
      setToken(null);
      setSyncStatus("idle");
      await connectGoogle();
    }
  }, [connectGoogle, mergeEvents, token]);

  const disconnect = useCallback(() => {
    if (token) revokeGoogleToken(token);
    setToken(null);
    setStore((prev) => {
      const base = prev ?? emptyEventsStore();
      const next: EventsStore = {
        ...base,
        connection: null,
        events: base.events.filter((e) => e.source === "manual"),
      };
      writeStore(next);
      return next;
    });
  }, [token]);

  const importIcs = useCallback(
    (label: string, text: string) => {
      try {
        const parsed = parseIcs(text);
        if (parsed.length === 0) {
          return { added: 0, error: "No events were found in that file." };
        }
        mergeEvents(parsed, "ics");
        setStore((prev) => {
          const base = prev ?? emptyEventsStore();
          const connection: CalendarConnection = {
            provider: "ics",
            connectedAt: Date.now(),
            icsLabel: label,
            icsText: text,
          };
          const next = { ...base, connection };
          writeStore(next);
          return next;
        });
        return { added: parsed.length };
      } catch {
        return { added: 0, error: "That file could not be read as a calendar (.ics) file." };
      }
    },
    [mergeEvents],
  );

  const addManualEvent = useCallback(
    (input: { title: string; date: string; location?: string; description?: string }) => {
      const start = new Date(`${input.date}T09:00:00`).getTime();
      if (!Number.isFinite(start) || !input.title.trim()) return;
      const ev: CalendarEvent = {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        location: input.location?.trim() || undefined,
        start,
        allDay: true,
        source: "manual",
      };
      mergeEvents([ev], "manual");
    },
    [mergeEvents],
  );

  const removeEvent = useCallback((eventId: string) => {
    setStore((prev) => {
      if (!prev) return prev;
      const calendarJourneys = Object.fromEntries(
        Object.entries(prev.calendarJourneys ?? {}).filter(([id]) => id !== eventId),
      );
      const reflections = Object.fromEntries(
        Object.entries(prev.reflections ?? {}).filter(([id]) => id !== eventId),
      );
      const next: EventsStore = {
        ...prev,
        events: prev.events.filter((e) => e.id !== eventId),
        detections: Object.fromEntries(
          Object.entries(prev.detections).filter(([id]) => id !== eventId),
        ),
        briefings: prev.briefings.filter((b) => b.eventId !== eventId),
        dismissedEventIds: prev.dismissedEventIds.filter((id) => id !== eventId),
        calendarJourneys,
        reflections,
      };
      writeStore(next);
      return next;
    });
  }, []);

  const confirmEventType = useCallback((eventId: string, eventType: EventType | null) => {
    setStore((prev) => {
      if (!prev) return prev;
      const existing = prev.detections[eventId];
      if (!eventType) {
        const detections = { ...prev.detections };
        delete detections[eventId];
        const next = { ...prev, detections };
        writeStore(next);
        return next;
      }
      const detection: DetectedEvent = {
        eventId,
        eventType,
        confidence: "high",
        matchedKeywords: existing?.matchedKeywords ?? [],
        userConfirmed: true,
      };
      const next = { ...prev, detections: { ...prev.detections, [eventId]: detection } };
      writeStore(next);
      return next;
    });
  }, []);

  const dismissEvent = useCallback((eventId: string) => {
    setStore((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        dismissedEventIds: [...new Set([...prev.dismissedEventIds, eventId])],
      };
      writeStore(next);
      return next;
    });
  }, []);

  const saveBriefing = useCallback((briefing: EventBriefing) => {
    setStore((prev) => {
      if (!prev) return prev;
      const briefings = [
        ...prev.briefings.filter((b) => b.eventId !== briefing.eventId),
        briefing,
      ];
      const next = { ...prev, briefings };
      writeStore(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<EventBriefingSettings>) => {
    setStore((prev) => {
      const base = prev ?? emptyEventsStore();
      const next = { ...base, settings: { ...base.settings, ...patch } };
      writeStore(next);
      return next;
    });
  }, []);

  const savePrepJourney = useCallback((journey: EventPrepJourney) => {
    setStore((prev) => {
      const base = prev ?? emptyEventsStore();
      const prepJourneys = [
        ...base.prepJourneys.filter((j) => j.id !== journey.id),
        journey,
      ];
      // Carry over any progress that already exists for a regenerated journey.
      const prepProgress = { ...base.prepProgress };
      if (!prepProgress[journey.id]) prepProgress[journey.id] = {
        journeyId: journey.id,
        checkedItems: [],
        quizAnswers: [],
        completed: false,
        updatedAt: Date.now(),
      };
      const next = { ...base, prepJourneys, prepProgress };
      writeStore(next);
      return next;
    });
  }, []);

  const removePrepJourney = useCallback((journeyId: string) => {
    setStore((prev) => {
      if (!prev) return prev;
      const prepProgress = { ...prev.prepProgress };
      delete prepProgress[journeyId];
      const next: EventsStore = {
        ...prev,
        prepJourneys: prev.prepJourneys.filter((j) => j.id !== journeyId),
        prepProgress,
      };
      writeStore(next);
      return next;
    });
  }, []);

  const updatePrepProgress = useCallback(
    (journeyId: string, patch: Partial<PrepProgress>) => {
      setStore((prev) => {
        const base = prev ?? emptyEventsStore();
        const existing = base.prepProgress[journeyId] ?? {
          journeyId,
          checkedItems: [],
          quizAnswers: [],
          completed: false,
          updatedAt: Date.now(),
        };
        const prepProgress = {
          ...base.prepProgress,
          [journeyId]: { ...existing, ...patch, updatedAt: Date.now() },
        };
        const next = { ...base, prepProgress };
        writeStore(next);
        return next;
      });
    },
    [],
  );

  const saveCalendarJourney = useCallback((journey: CalendarPrepJourney) => {
    setStore((prev) => {
      const base = prev ?? emptyEventsStore();
      const next = {
        ...base,
        calendarJourneys: { ...base.calendarJourneys, [journey.eventId]: journey },
        // Keep the standalone briefings list in sync for briefing-only views.
        briefings: base.briefings.some((b) => b.eventId === journey.eventId)
          ? base.briefings
          : [...base.briefings, journey.briefing],
      };
      writeStore(next);
      return next;
    });
  }, []);

  const completeCalendarStep = useCallback((eventId: string, stepId: PrepStepId) => {
    setStore((prev) => {
      if (!prev) return prev;
      const journey = prev.calendarJourneys[eventId];
      if (!journey || journey.completedSteps.includes(stepId)) return prev;
      const next = {
        ...prev,
        calendarJourneys: {
          ...prev.calendarJourneys,
          [eventId]: {
            ...journey,
            completedSteps: [...journey.completedSteps, stepId],
          },
        },
      };
      writeStore(next);
      return next;
    });
  }, []);

  const updateCalendarStep = useCallback(
    (eventId: string, stepId: PrepStepId, step: PrepStepContent) => {
      setStore((prev) => {
        if (!prev) return prev;
        const journey = prev.calendarJourneys[eventId];
        if (!journey) return prev;
        const next = {
          ...prev,
          calendarJourneys: {
            ...prev.calendarJourneys,
            [eventId]: { ...journey, steps: { ...journey.steps, [stepId]: step } },
          },
        };
        writeStore(next);
        return next;
      });
    },
    [],
  );

  const saveEventReflection = useCallback((eventId: string, reflection: EventReflection) => {
    setStore((prev) => {
      const base = prev ?? emptyEventsStore();
      const next = { ...base, reflections: { ...base.reflections, [eventId]: reflection } };
      writeStore(next);
      return next;
    });
  }, []);

  const clearEventsData = useCallback(() => {
    setToken(null);
    const fresh = emptyEventsStore();
    setStore(fresh);
    writeStore(fresh);
  }, []);

  // ─── Derived views ────────────────────────────────────────────────────────

  const statusFor = (
    event: CalendarEvent,
    detection: DetectedEvent | null,
    briefing: EventBriefing | null,
    journey: CalendarPrepJourney | null,
    reflection: EventReflection | null,
    confirmed: boolean,
  ): UpcomingEvent["status"] => {
    if (reflection) return "done";
    if (journey) {
      const allDone = journey.stepIds.every((s) => journey.completedSteps.includes(s));
      if (allDone) {
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now();
        return now > event.start + 86_400_000 ? "reflect" : "ready";
      }
      return "preparing";
    }
    if (briefing) return "briefing-ready";
    if (!confirmed) return "needs-details";
    return "start-preparing";
  };

  const upcomingEvents = useMemo<UpcomingEvent[]>(() => {
    if (!store) return [];
    // Wall-clock "now" — intentionally re-evaluated when the store changes
    // (app open). The purity lint rule is acknowledged here.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const windowEnd = now + store.settings.leadTimeDays * 86_400_000;
    return store.events
      .filter((e) => {
        const detection = store.detections[e.id] ?? null;
        if (!detection) return false;
        const confirmed = detection.userConfirmed || detection.confidence === "high";
        if (!confirmed && !store.settings.showLowConfidence) return false;
        const hasJourney = Boolean(store.calendarJourneys[e.id]);
        const hasBriefing = store.briefings.some((b) => b.eventId === e.id);
        if (store.dismissedEventIds.includes(e.id) && !hasJourney && !hasBriefing) {
          return false;
        }
        return e.start >= now - 86_400_000 && e.start <= windowEnd + 30 * 86_400_000;
      })
      .sort((a, b) => a.start - b.start)
      .map((event) => {
        const detection = store.detections[event.id] ?? null;
        const briefing = store.briefings.find((b) => b.eventId === event.id) ?? null;
        const journey = store.calendarJourneys[event.id] ?? null;
        const reflection = store.reflections[event.id] ?? null;
        const confirmed = Boolean(detection && (detection.userConfirmed || detection.confidence === "high"));
        return {
          event,
          detection,
          briefing,
          journey,
          reflection,
          due: event.start <= windowEnd,
          status: statusFor(event, detection, briefing, journey, reflection, confirmed),
        };
      });
  }, [store]);

  const dueEvents = useMemo(
    () =>
      upcomingEvents.filter(
        (u) =>
          u.due &&
          u.detection &&
          !u.journey &&
          !u.briefing &&
          u.status !== "done" &&
          store?.settings.enabled !== false,
      ),
    [upcomingEvents, store],
  );

  /** Events with an active or completed prep journey, soonest first. */
  const journeyEvents = useMemo(
    () => upcomingEvents.filter((u) => u.journey !== null),
    [upcomingEvents],
  );

  const value = useMemo<EventsContextValue>(
    () => ({
      store,
      settings: store?.settings ?? emptyEventsStore().settings,
      connection: store?.connection ?? null,
      events: store?.events ?? [],
      detections: store?.detections ?? {},
      briefings: store?.briefings ?? [],
      dueEvents,
      upcomingEvents,
      journeyEvents,
      hasGoogleConfig,
      googleTokenLive: token !== null,
      syncStatus,
      syncError,
      hydrated: true,
      connectGoogle,
      refreshGoogle,
      disconnect,
      importIcs,
      addManualEvent,
      removeEvent,
      confirmEventType,
      dismissEvent,
      saveBriefing,
      updateSettings,
      calendarJourneys: store?.calendarJourneys ?? {},
      saveCalendarJourney,
      completeCalendarStep,
      updateCalendarStep,
      saveEventReflection,
      prepJourneys: store?.prepJourneys ?? [],
      prepProgress: store?.prepProgress ?? {},
      savePrepJourney,
      removePrepJourney,
      updatePrepProgress,
      clearEventsData,
    }),
    [
      store,
      upcomingEvents,
      dueEvents,
      journeyEvents,
      hasGoogleConfig,
      token,
      syncStatus,
      syncError,
      connectGoogle,
      refreshGoogle,
      disconnect,
      importIcs,
      addManualEvent,
      removeEvent,
      confirmEventType,
      dismissEvent,
      saveBriefing,
      updateSettings,
      saveCalendarJourney,
      completeCalendarStep,
      updateCalendarStep,
      saveEventReflection,
      savePrepJourney,
      removePrepJourney,
      updatePrepProgress,
      clearEventsData,
    ],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within EventsProvider");
  return ctx;
}