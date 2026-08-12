# bref.

A URL shortener with click analytics — no accounts, no passwords, no tracking cookies.

**Live**: https://bref-six.vercel.app

Paste a long URL, get a short one, watch who clicks it (country, referrer, device, human vs. bot) — all without ever asking for an email address. The surface is deliberately small; what it's actually about is five things most weekend-project shorteners get wrong. Each is covered below with the reasoning, not just the decision.

## Stack

Next.js (App Router) + TypeScript + Supabase (Postgres, Auth, pg_cron), deployed on Vercel's free tier. Chakra UI v3, Biome for lint/format, Vitest for tests.

## 1. The redirect never blocks on the write

A visitor clicking a short link should not wait for a database write. The click is recorded **after** the redirect response has already been sent, using `after()` from `next/server`:

```ts
export async function GET(request: Request, { params }) {
  const link = await resolveSlug(slug)
  after(() => recordClick(link.id, request))
  return NextResponse.redirect(link.targetUrl, 307)
}
```

The tempting shortcut is to just not `await` the write. Don't — in a serverless environment, the function instance can freeze the moment the response is sent, silently abandoning any unawaited promise. The clicks don't error, they just don't happen, and the counters look "a little low" for reasons nobody can reproduce. `after()` exists specifically to guarantee the callback runs after the response, on the same instance. Its own errors are caught and logged inside `recordClick` — a failed write must never surface to the visitor.

## 2. The redirect is 307, never 301 or 308

This is the single most common mistake in this kind of project, and it's costly precisely because it's invisible until it's too late.

A **301 (permanent)** redirect gets cached by the browser — sometimes indefinitely. Three consequences follow directly:

1. **Clicks stop being counted.** Once a browser has cached the redirect, it never asks the server again. The second, third, and every subsequent visit from that browser silently bypasses your server entirely.
2. **Editing a link's destination has no effect** for anyone who already visited it — their browser is still redirecting from its own cache.
3. **Disabling a link doesn't actually disable it**, for the same reason.

**307 (temporary)** is re-validated with the server on every visit — which is exactly the behavior a link shortener needs, since links can be edited or disabled at any time. `src/app/api/r/[slug]/route.ts` and its regression test (`tests/redirect-status.test.ts`) both exist specifically to keep this from regressing.

## 3. Link-preview bots are filtered, not ignored

Paste a short link into Slack, WhatsApp, or iMessage and the platform fetches it immediately to generate a preview card — before any human opens it. Unfiltered, a link shared once shows several clicks before anyone has actually clicked it. This is why the stats on most amateur shorteners are simply wrong.

`src/lib/shortener/bot-detection.ts` matches the user-agent against a hand-maintained list of known preview generators, crawlers, and CLI tools (plus a missing/empty user-agent, which is never a browser). A match sets `is_bot = true` — **the click is still recorded, just flagged**, since "this link was previewed" is itself useful information. The dashboard shows human clicks by default with a toggle to include bots.

## 4. Isolation without accounts

There is no login page. On first visit, the app opens a Supabase anonymous session (`signInAnonymously()`) — a real row in `auth.users`, no email or password, persisted via cookie. Every link a visitor creates is tied to `auth.uid()`.

The reason this matters: **`auth.uid()` still works**, so Row Level Security policies are exactly what they'd be with real accounts —

```sql
create policy "links_select_own" on public.links for select
to authenticated
using ((select auth.uid()) = user_id);
```

— which means isolation between two visitors' links is enforced **by the database**, not by application code that a direct API call could bypass. `tests/rls-isolation.test.ts` verifies this by hitting the raw PostgREST endpoint with one session's token and asserting it can't read another's data, RLS policies and all.

**The trade-off, stated plainly**: your links are tied to this browser. Clear your cookies, switch devices, or open a private window, and the dashboard can no longer find them — though the links themselves keep redirecting regardless, since resolving a slug never depends on who's asking. The dashboard has a dismissible notice about this and an export button, so you always have an out-of-band copy of your own links.

The lower barrier to entry (one request, no verification) also means the abuse surface is larger than with real accounts — which is why rate limiting (§8 below) checks the session **and** a hashed IP fingerprint, not the session alone.

## 5. No personal data to protect

Rather than add a cookie-consent banner, the system is built to have nothing in it worth protecting:

- **No IP addresses are stored.** Unique-visitor counting uses `visitor_hash`, an HMAC of the IP, user-agent, link id, and the current UTC date — it rotates daily (so it can't be correlated across days) and is scoped per link (so it can't be correlated across links either).
- **The referrer is reduced to its host.** `github.com`, never the full URL — a complete referrer can leak session tokens or search terms.
- **Only a two-letter country code** is stored, from the hosting platform's geo header. No city, no coordinates.
- **The only cookie is the session cookie itself** — strictly necessary for the app to function, so it's outside the consent regime entirely.

No accounts means no email address or password is ever collected in the first place, which is the strongest form of this argument.

The rate-limit IP hash (`src/lib/shortener/ip-hash.ts`) is a **separate, non-rotating** hash from a different secret — deliberately not reused from the click-privacy hash above, because a rotating key would reset everyone's rate limit every day.

## 6. Staying alive on the free tier

Supabase's free tier pauses a project after 7 days with no activity. A portfolio project can easily go quiet for a week between interviews — and a paused database means every short link in the world stops redirecting, mid-interview, with no warning.

`.github/workflows/keep-alive.yaml` pings `/api/health` (which does one trivial database read) every 3 days via a scheduled GitHub Action. It deliberately runs from **outside** Supabase — a `pg_cron` job running inside the database being pinged is not obviously going to register as "activity" for the pause detector, and this isn't a bet worth making. This was built and verified in the same pass as the dashboard UI, not left for later, on the theory that a paused project during a job search is a dead link on a résumé.

## 7. Custom slugs turn the namespace public — and reuse-after-deletion is the trap

Random slugs (`aB3xY9z`) live in a private, effectively infinite space: nobody wants a specific one, so nobody collides. Letting a user pick their own slug (`bref.link/portfolio`) changes that instantly — the space becomes public and scarce, and it opens problems a random-only shortener never has to think about: squatting, visual confusability (`paypa1` vs `paypal`), and — the least obvious, most dangerous one — **what happens when a claimed slug is deleted**.

**Normalize once, enforce everywhere.** `src/lib/shortener/normalize-slug.ts` (NFKC + lowercase) is the one function creation, the availability-check endpoint, and redirect resolution all call — mirrored exactly in SQL by a `slug_normalized` generated column carrying the actual unique constraint. Two separate implementations of "what counts as the same slug" would eventually drift and produce an unresolvable link; one function used everywhere can't.

```sql
alter table public.links add column slug_normalized text
  generated always as (lower(normalize(slug, nfkc))) stored;
create unique index links_slug_normalized_key on public.links (slug_normalized);
```

That closes the case-sensitivity gap directly — `MonCV` and `moncv` can't both be claimed, and both resolve the same link. A second generated column, `degarnished_slug`, strips separators and folds the digits a shortener's own random-slug alphabet already avoids for being visually ambiguous (`0`→`o`, `1`→`l`, `5`→`s`), so `paypa1-secure` is rejected outright if `paypalsecure` already exists — a namespace-wide check, not a per-user one.

**Deletion doesn't free a custom slug.** This is the trap: if a deleted slug went straight back into circulation, a stranger could claim it the moment it's freed and inherit the residual real-world traffic from posters, emails, or old shares that already went out under the original owner's name — without hacking anything. `retired_slugs` records every deleted custom slug permanently; creation checks it in addition to the live uniqueness constraint, and blocks anyone except the original retiring session. The dead slug itself resolves to a genuine HTTP **410**, not a 404 — it existed and won't come back to anyone else, which is a different fact than "never existed" and worth saying so on the page a visitor lands on. `tests/slug-reclaim.test.ts` is the test worth reading here: it's the one non-obvious failure mode a naive implementation gets wrong.

**Concurrent claims resolve cleanly, not with a 500.** Two requests for the same slug always race eventually — a pre-check `SELECT` followed by an `INSERT` just moves the race instead of closing it. Creation always inserts directly and treats a unique-violation (`23505`) as an expected outcome, not an error path: one request succeeds, the other gets a clean, actionable conflict. `tests/concurrent-custom-slug-creation.test.ts` fires two genuinely concurrent inserts at the same slug and asserts exactly one wins.

A public, human-chosen slug also raises the ceiling on how convincing a phishing link can look (`bref.link/paypal-secure` reads as official in a way a random string never does) — `src/lib/shortener/brand-mismatch.ts` flags a slug that names a brand but points somewhere that isn't the brand's real domain, an optional pre-redirect interstitial can show the real destination before following it, and a `reports` table with a link on the 404/410/interstitial pages gives anyone a way to flag a link for manual review.

## 8. QR codes are computed on demand, nothing is stored

Both the SVG (generated client-side, zero server round-trip) and the PNG (generated per-request by a small server route) are derived straight from the short URL at request time — there's no QR image table, no storage bucket, and no cached asset to invalidate when a link's destination or active state changes. Regenerating from a slug is cheaper and strictly safer than storing one: a disabled or expired link's QR starts refusing to render (`404` from `/api/qr/[slug]`) the instant its status flips, with no stale file anywhere to clean up. The PNG route is cached aggressively at the CDN layer for performance, but that's a *staleness window*, not a state store — the actual redirect always re-checks the link's live status on every real visit regardless of what any cached QR image says.

A QR scan leaves exactly one signal: the code encodes the short URL with `?s=qr` appended, and the redirect route records that as a `source` dimension (`'web'` or `'qr'`) on the existing `clicks`/`clicks_daily` tables — not a parallel logging system, so it inherits the same bot-filtering, 90-day retention, and RLS scoping the rest of the click pipeline already has. This makes the QR scan count a **floor, not an exact figure**: any client that strips query strings from a shared/scanned URL (some in-app browsers do this) causes an undercount, never an overcount, and there's no way to independently confirm "a camera pointed at this code" beyond that query parameter surviving the trip.

One more deliberate constraint: the QR's dark-module/light-background colors are hardcoded hex values in `src/lib/shortener/qr-options.ts`, never read from Chakra's theme tokens or `useColorMode()`. A QR code's black/white contrast is a scanning-reliability requirement, not a branding choice — it must render identically regardless of the visitor's OS or app theme.

## What I'd do differently

- **i18n.** The app's copy is hardcoded French rather than routed through `next-intl`'s `useTranslations()`, despite the rest of the codebase (and `CLAUDE.md`) documenting that as the convention. It was a deliberate scope cut to keep the core mechanics (redirect semantics, RLS, caching) the focus rather than touching every component twice. Rewiring ~15 components plus the `en.json` entries is the natural next PR.
- **Detailed click history in the UI.** The mockups sketch a per-event timeline ("clicked from France, mobile, via slack.com, 18 min ago"); the shipped detail page aggregates into a day-of-week chart and country/referrer/device breakdowns instead. The data (`public.clicks`) already supports the richer view — it just wasn't built.
- **Custom domains.** Explicitly out of scope for this pass, but the redirect route doesn't assume the app's own hostname anywhere except the self-redirect-loop check at creation time, so it wouldn't require restructuring.
- **Anonymous → permanent account.** Supabase supports attaching an email to an anonymous session without losing its data. Worth offering as an opt-in once someone actually asks for it — never as a requirement, since that would undercut point 4 above.
- **Report moderation.** `public.reports` collects abuse reports on custom slugs (§7), but there's no admin UI — reviewing them today means reading the table directly with SQL. The point was to prove the data-capture path exists (and that the underlying risk was thought through), not to build a moderation console for a portfolio project's low real-world volume.
- **A reserved-word offensive-terms list.** `src/lib/shortener/reserved-slugs.ts` blocks app routes and impersonation-prone brand/financial terms, but deliberately carries no profanity list — a real one needs proper locale coverage and false-positive tuning, and a handful of hardcoded words would give a false sense of coverage without actually providing it.

## Running it locally

```bash
npm install
```

Copy `.env.config` to `.env.local` and fill in the Supabase values (`vercel env pull .env.local` if you have the Vercel project linked). Two things are easy to miss:

1. **Anonymous sign-ins are off by default** in a new Supabase project. Enable them under **Authentication → Providers → Anonymous**, or nothing in this app will work — there's no code-level flag for this, it's purely a dashboard setting.
2. `VISITOR_HASH_SECRET` and `RATE_LIMIT_HASH_SECRET` must be two **different** random values (`openssl rand -hex 32`) — see §5's note on why they're deliberately not the same secret.

```bash
npm run dev                   # local dev server
npm run generate-translation  # after editing locale JSON files
npm run lint:check            # Biome
npm run format                # Biome
```

### Tests

```bash
npm test
```

Most tests are plain unit tests and run with no setup. A few need infrastructure they'll skip themselves without:

- **RLS isolation, aggregation idempotence, rate-limit, redirect/cache, custom-slug, and QR-code tests** (normalization collision, similarity, reclaim, retired-slug status, concurrent creation, cache non-segmentation, click-source recording) need a local Supabase stack: `npx supabase start` (requires Docker), then `npx supabase status -o env` to populate `.env.test.local` (gitignored; see that file's own header comment for the exact format).
- A couple of those tests spawn a real `next dev` on a fixed port to exercise the redirect route end-to-end — Vitest is configured with `fileParallelism: false` so two of those never run concurrently and fight over the same `.next` build cache.

## Database

Schema and RLS policies live in `supabase/migrations/`, applied in order. Three pg_cron jobs run nightly (`supabase/migrations/*_schedule_nightly_cron.sql`): aggregating the previous day's clicks into `clicks_daily` (idempotent — re-running on an already-processed day recomputes and overwrites rather than incrementing), purging click detail past 90 days, and purging anonymous sessions with no links after 30 days.
