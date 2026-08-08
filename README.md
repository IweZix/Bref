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

## What I'd do differently

- **i18n.** The app's copy is hardcoded French rather than routed through `next-intl`'s `useTranslations()`, despite the rest of the codebase (and `CLAUDE.md`) documenting that as the convention. It was a deliberate scope cut to keep the core mechanics (redirect semantics, RLS, caching) the focus rather than touching every component twice. Rewiring ~15 components plus the `en.json` entries is the natural next PR.
- **Detailed click history in the UI.** The mockups sketch a per-event timeline ("clicked from France, mobile, via slack.com, 18 min ago"); the shipped detail page aggregates into a day-of-week chart and country/referrer/device breakdowns instead. The data (`public.clicks`) already supports the richer view — it just wasn't built.
- **Custom domains.** Explicitly out of scope for this pass, but the redirect route doesn't assume the app's own hostname anywhere except the self-redirect-loop check at creation time, so it wouldn't require restructuring.
- **Anonymous → permanent account.** Supabase supports attaching an email to an anonymous session without losing its data. Worth offering as an opt-in once someone actually asks for it — never as a requirement, since that would undercut point 4 above.

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

- **RLS isolation, aggregation idempotence, rate-limit, and redirect/cache tests** need a local Supabase stack: `npx supabase start` (requires Docker), then `npx supabase status -o env` to populate `.env.test.local` (gitignored; see that file's own header comment for the exact format).
- A couple of those tests spawn a real `next dev` on a fixed port to exercise the redirect route end-to-end — Vitest is configured with `fileParallelism: false` so two of those never run concurrently and fight over the same `.next` build cache.

## Database

Schema and RLS policies live in `supabase/migrations/`, applied in order. Three pg_cron jobs run nightly (`supabase/migrations/*_schedule_nightly_cron.sql`): aggregating the previous day's clicks into `clicks_daily` (idempotent — re-running on an already-processed day recomputes and overwrites rather than incrementing), purging click detail past 90 days, and purging anonymous sessions with no links after 30 days.
