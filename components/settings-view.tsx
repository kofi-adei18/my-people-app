"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarCheckIcon,
  CalendarOffIcon,
  FileUpIcon,
  KeyRoundIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useEvents } from "@/lib/events-context";
import { EVENT_TYPE_LABELS, LEAD_TIME_OPTIONS } from "@/lib/constants";

export function SettingsView() {
  const {
    settings,
    connection,
    hasGoogleConfig,
    syncStatus,
    syncError,
    events,
    connectGoogle,
    refreshGoogle,
    disconnect,
    importIcs,
    addManualEvent,
    updateSettings,
    clearEventsData,
  } = useEvents();

  const fileRef = useRef<HTMLInputElement>(null);
  const [icsError, setIcsError] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const busy = syncStatus === "syncing" || connecting;

  const handleGoogle = async () => {
    setIcsError(null);
    setConnecting(true);
    try {
      await connectGoogle();
    } catch {
      /* error already surfaced via syncError */
    } finally {
      setConnecting(false);
    }
  };

  const handleIcsFile = async (file: File | undefined) => {
    setIcsError(null);
    setImportResult(null);
    if (!file) return;
    try {
      const text = await file.text();
      const result = importIcs(file.name, text);
      if (result.error) setIcsError(result.error);
      else setImportResult(`Imported ${result.added} event${result.added === 1 ? "" : "s"} from ${file.name}.`);
    } catch {
      setIcsError("That file could not be read.");
    }
  };

  const handleIcsPaste = (text: string) => {
    setIcsError(null);
    setImportResult(null);
    if (!text.trim()) return;
    const result = importIcs("pasted calendar", text);
    if (result.error) setIcsError(result.error);
    else setImportResult(`Imported ${result.added} event${result.added === 1 ? "" : "s"}.`);
  };

  const handleManualAdd = () => {
    setManualError(null);
    if (!manualTitle.trim() || !manualDate) {
      setManualError("An event name and date are both required.");
      return;
    }
    addManualEvent({ title: manualTitle, date: manualDate, location: manualLocation });
    setManualTitle("");
    setManualDate("");
    setManualLocation("");
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="font-display mt-1 text-3xl font-medium tracking-tight text-foreground">
          Calendar &amp; events
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          My People watches your calendar for funerals and weddings and prepares
          you before they arrive. Detection runs on your device — only the
          details you type into a briefing ever reach the tutor.
        </p>
      </header>

      {/* ── Calendar connection ─────────────────────────────────────────── */}
      <section aria-label="Calendar" className="mt-8 rounded-3xl border border-gold/40 bg-card p-6 sm:p-8">
        <h2 className="font-display text-xl font-medium text-foreground">Your calendar</h2>
        {connection ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest-deep">
              <CalendarCheckIcon className="size-3.5" aria-hidden="true" />
              {connection.provider === "google"
                ? "Google Calendar connected"
                : connection.provider === "ics"
                  ? `Imported: ${connection.icsLabel ?? "calendar"}`
                  : "Manual events"}
            </span>
            <span className="text-xs text-muted-foreground">{events.length} event(s) tracked</span>
            {connection.provider === "google" && (
              <Button variant="outline" size="sm" className="rounded-full" onClick={refreshGoogle} disabled={busy}>
                {busy && <Spinner className="size-3.5" />}
                Refresh
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No calendar connected yet. Pick whichever path suits you — they all feed the same event list.
          </p>
        )}

        {syncError && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Google Calendar</AlertTitle>
            <AlertDescription>{syncError}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 grid gap-6">
          <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
            <h3 className="text-sm font-semibold text-foreground">Google Calendar</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Read-only access via a Google popup. Your access token stays in
              this browser tab for about an hour; nothing is stored on a server.
            </p>
            {hasGoogleConfig ? (
              <Button className="mt-3 rounded-full px-5" onClick={handleGoogle} disabled={busy}>
                {busy && <Spinner className="size-4" />}
                {connection?.provider === "google" ? "Reconnect Google Calendar" : "Connect Google Calendar"}
              </Button>
            ) : (
              <Alert className="mt-3">
                <AlertTitle>
                  <KeyRoundIcon className="size-3.5" aria-hidden="true" /> Google Calendar isn&apos;t configured
                </AlertTitle>
                <AlertDescription>
                  Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to{" "}
                  <code className="rounded bg-muted px-1">.env.local</code> and restart the dev server.
                  Until then, use the .ics or manual options below.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
            <h3 className="text-sm font-semibold text-foreground">Import an .ics file</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Export from Google Calendar, Outlook or Apple Calendar and upload it here — no account needed.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".ics,text/calendar"
                className="sr-only"
                onChange={(e) => handleIcsFile(e.target.files?.[0])}
              />
              <Button variant="outline" className="rounded-full px-5" onClick={() => fileRef.current?.click()}>
                <FileUpIcon data-icon="inline-start" />
                Choose .ics file
              </Button>
              <IcsPaste onPaste={handleIcsPaste} />
            </div>
            {icsError && (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>{icsError}</AlertDescription>
              </Alert>
            )}
            {importResult && (
              <p className="mt-3 text-xs font-medium text-forest-deep">{importResult}</p>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
            <h3 className="text-sm font-semibold text-foreground">Add an event manually</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="manual-title" className="text-xs font-semibold">Event name</Label>
                <Input
                  id="manual-title"
                  className="mt-1.5"
                  placeholder="e.g. Uncle Kwabena's funeral"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manual-date" className="text-xs font-semibold">Date</Label>
                <Input
                  id="manual-date"
                  type="date"
                  className="mt-1.5"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="manual-location" className="text-xs font-semibold">Location (optional)</Label>
                <Input
                  id="manual-location"
                  className="mt-1.5"
                  placeholder="e.g. Kumasi family house"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-3 rounded-full px-5"
              onClick={handleManualAdd}
              disabled={!manualTitle.trim() || !manualDate}
            >
              Add event
            </Button>
            {manualError && (
              <p className="mt-2 text-xs font-medium text-destructive">{manualError}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Briefing behaviour ──────────────────────────────────────────── */}
      <section aria-label="Briefing settings" className="mt-6 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <h2 className="font-display text-xl font-medium text-foreground">When briefings appear</h2>

        <div className="mt-5 flex items-start gap-3">
          <Checkbox
            id="events-enabled"
            checked={settings.enabled}
            onCheckedChange={(v) => updateSettings({ enabled: v === true })}
          />
          <div>
            <Label htmlFor="events-enabled" className="cursor-pointer text-sm font-semibold">
              Watch for cultural events
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Detects funerals and weddings ({EVENT_TYPE_LABELS.funeral.toLowerCase()}, {EVENT_TYPE_LABELS.wedding.toLowerCase()}) in your calendar.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Label className="text-sm font-semibold">Lead time</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How far ahead to start preparing you. The default is 7 days.
          </p>
          <RadioGroup
            className="mt-3 grid gap-2 sm:grid-cols-2"
            value={String(settings.leadTimeDays)}
            onValueChange={(v) => updateSettings({ leadTimeDays: Number(v) })}
          >
            {LEAD_TIME_OPTIONS.map((opt) => (
              <Label
                key={opt.value}
                htmlFor={`lead-${opt.value}`}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-background/60 p-4 text-sm font-medium transition-colors ${
                  settings.leadTimeDays === opt.value
                    ? "border-gold-deep/50 bg-gold/5"
                    : "border-border/70 hover:border-foreground/20"
                }`}
              >
                <RadioGroupItem value={String(opt.value)} id={`lead-${opt.value}`} />
                {opt.label}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="mt-6 flex items-start gap-3">
          <Checkbox
            id="events-lowconf"
            checked={settings.showLowConfidence}
            onCheckedChange={(v) => updateSettings({ showLowConfidence: v === true })}
          />
          <div>
            <Label htmlFor="events-lowconf" className="cursor-pointer text-sm font-semibold">
              Show uncertain detections
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Also surface events that only weakly matched a cultural keyword, so you can confirm them yourself.
            </p>
          </div>
        </div>
      </section>

      {/* ── Data ────────────────────────────────────────────────────────── */}
      <section aria-label="Event data" className="mt-6 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <h2 className="font-display text-xl font-medium text-foreground">Your event data</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything here — calendar events, detections and briefings — lives in
          this browser only. Clearing it forgets everything on this page.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="rounded-full px-5"
            onClick={() => {
              if (confirm("Remove all events, detections and briefings from this browser?")) {
                clearEventsData();
              }
            }}
          >
            <Trash2Icon data-icon="inline-start" />
            Clear event data
          </Button>
          {connection && (
            <Button variant="ghost" className="rounded-full px-5" onClick={disconnect}>
              <CalendarOffIcon data-icon="inline-start" />
              Disconnect calendar
            </Button>
          )}
        </div>
      </section>

      <Separator className="my-8" />
      <p className="text-center text-xs text-muted-foreground">
        Your cultural profile is separate —{" "}
        <Link href="/onboarding" className="underline underline-offset-4">
          edit it here
        </Link>
        .
      </p>
    </main>
  );
}

function IcsPaste({ onPaste }: { onPaste: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  if (!open) {
    return (
      <Button variant="ghost" className="rounded-full px-4 text-xs" onClick={() => setOpen(true)}>
        …or paste .ics contents
      </Button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <Textarea
        rows={4}
        placeholder="Paste the contents of an .ics file here"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" className="rounded-full px-4" onClick={() => onPaste(text)} disabled={!text.trim()}>
          Import
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full px-4" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}