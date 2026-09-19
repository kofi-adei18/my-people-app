# My People — 5-Minute Demo Script

**Focus:** Calendar event briefings (one main feature) + one follow-up question in Ask (combined).
**Total spoken words:** ~600 → ~4:45 at a relaxed pace with pauses.

---

## Setup before the audience arrives

- `npm run dev`, open `http://localhost:3000`
- Have `public/sample-calendar.ics` ready (no keys needed for this flow)
- Be logged into nothing — start clean so localStorage state doesn't leak in

---

## 1. Problem — one sentence (~0:00–0:20)

> "Young Ghanaians growing up abroad — like my cousins — dread family events back home, because one wrong greeting at a funeral or wedding makes them feel like outsiders in their own family."

*(pause — let it land)*

## 2. Solution — one sentence (~0:20–0:40)

> "My People is a cultural companion that watches your calendar, spots the event coming up, and briefs you on exactly what to say, wear, and do — grounded in real Akan sources, never invented."

## 3. The story — Kofi's funeral invitation (~0:40–4:20)

### Beat 1 — The phone buzzes (~0:40–1:10)

> "So meet my cousin Kofi. He's 22, lives in London, and last week his phone buzzed — a calendar invite: **'Final funeral rites — Auntie Akosua, family house, Kumasi.'**
>
> His first thought wasn't grief. It was panic. *What do I even say when I walk in? Do I shake hands? What do I wear?*
>
> This is where My People takes over."

**ACTION:** Open `/events`. Point at the empty state — "No calendar connected yet."

### Beat 2 — Connecting the calendar (~1:10–1:50)

> "First, Kofi connects his calendar. For the demo I'll just import a file — no keys, nothing to break."

**ACTION:** Go to `/settings` → **Import .ics** → upload `public/sample-calendar.ics` → return to `/events`.

> "And there it is. My People scanned his calendar and flagged what it recognized: Auntie Akosua's final funeral rites, coming up in Kumasi."

**ACTION:** Point at the detected funeral event. Read the title aloud.

### Beat 3 — Confirm and answer honestly (~1:50–2:30)

> "But here's the part I care about most: My People doesn't assume. It asks Kofi to confirm — yes, this is a funeral — and then a short questionnaire. Because a briefing for a niece who barely visits is not the same as one for the eldest son of the family."

**ACTION:** Confirm the event type, fill 2–3 questionnaire answers (mention he's a younger relative, first time attending the family house), submit.

*(pause while it generates — say nothing for 2–3 seconds)*

### Beat 4 — The briefing (~2:30–3:30)

> "And here's Kofi's briefing. Days before he even boards the flight, he knows:
> - the greeting to use when he walks in,
> - what to wear,
> - and how to conduct himself around the elders."

**ACTION:** Scroll slowly through the briefing. Read ONE greeting phrase aloud in Twi — slowly. Then point at the **Sources** section and the badge.

> "And notice — every line carries its source. The corpus is provisional, and the app says so honestly. If My People doesn't know, it says *'this isn't in my sources.'* It never invents Twi, never invents tradition. That honesty is the whole product."

### Beat 5 — One follow-up question (~3:30–4:05)

> "Kofi has one question the briefing didn't cover. So he just asks."

**ACTION:** Open `/ask`, type the follow-up (e.g., *"What should I say to the elders when I first arrive at the funeral?"*), show the grounded answer + sources.

*(pause — 2 seconds)*

> "Grounded answer, sources again. One feature, one story, no rabbit holes."

## 4. Close (~4:20–4:50)

> "Two weeks later, Kofi walks into that family house in Kumasi, greets the elders properly, and his grandmother says — *'yɛ w'abusuafoɔ'* — **he is one of us.**
>
> That's My People. Not a chatbot that guesses at your culture — a companion that knows exactly what it knows, and admits what it doesn't.
>
> Thank you."

---

## Timing checkpoints (glance at clock at these moments)

| Checkpoint | Should be at |
|---|---|
| End of Beat 1 | ~1:10 |
| Briefing on screen | ~2:35 |
| End of Beat 5 | ~4:10 |
| Done | ~4:50 |

**If running long:** cut Beat 5 (the Ask follow-up) entirely — the story stands without it.
**If running short:** read the greeting phrase twice — once in Twi, once translated.
