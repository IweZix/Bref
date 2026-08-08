# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint:check   # Run Biome linter checks
npm run format       # Format code with Biome
npm run generate-translation  # Regenerate src/localization/tKeys.ts from locale JSON files
npm test             # Run Vitest (some tests need a local Supabase stack — see README's "Tests" section)
```

## Architecture

**Framework**: Next.js (App Router) with TypeScript. Path alias `@/*` maps to `src/*`.

**Linting/Formatting**: Biome only (no ESLint, no Prettier). Single quotes, 2-space indent, auto-organize imports.

### Routing & Internationalization

The app lives under `src/app/[locale]/`. Two locales are supported: `fr` (default) and `en`.

- `src/localization/routing.ts` — locale list and default locale
- `src/localization/navigation.ts` — locale-aware `Link`/`useRouter`/`redirect` from `next-intl/navigation`; **use these, not raw `next/link`**, for any internal navigation — a plain relative `href` does not reliably resolve against the current locale prefix
- `src/localization/request.ts` — next-intl server config (imports locale JSON dynamically)
- `src/proxy.ts` — next-intl middleware, **plus** a pre-check that rewrites bare-root short-link paths (e.g. `/aB3xY9z`) straight to `/api/r/[slug]` before next-intl ever sees the request (see `src/lib/shortener/is-short-link-path.ts`), and refreshes the Supabase session cookie via `src/lib/supabase/middleware.ts`
- `src/localization/locales/` — translation JSON files (`en.json`, `fr.json`)
- `src/localization/tKeys.ts` — **auto-generated** type-safe translation key constants

**Always run `npm run generate-translation` after editing locale JSON files.** Use the generated `tKeys` constants when calling `useTranslations()`:

```typescript
const t = useTranslations();
t(tKeys.homepage.title); // type-safe, autocomplete-friendly
```

> **Known gap**: the URL-shortener UI (`src/components/shortener/`, the home/dashboard/detail pages) has hardcoded French copy rather than going through `tKeys`/`useTranslations()`. See the README's "What I'd do differently" section — this was a deliberate scope cut, not an oversight, and is the natural next thing to fix if you're asked to add English support.

### Key Utilities

- `src/lib/env.ts` — `requireEnv(value, name)`: throws a clear error for a missing required env var instead of a bare non-null assertion (Biome's `noNonNullAssertion` rule forbids `!`)
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge) — present but effectively unused; the UI is built on Chakra UI, not Tailwind (see "UI" below)
- `src/utils/custom-instance.ts` — Axios instance factory; reads Bearer token from localStorage and base URL from `NEXT_PUBLIC_BACKEND_URL`. Unrelated to Supabase — nothing in the shortener feature uses this
- `src/hooks/useLocalStorage.ts` — Generic localStorage hook with cross-tab sync; `StorageKeys` enum lives here

### Supabase (`src/lib/supabase/`)

Three separate client contexts — use the right one:

- `client.ts` — browser client (`createBrowserClient`), for Client Components
- `server.ts` — cookie-authenticated server client (`createServerClient`), for Server Components and Route Handlers acting on behalf of the current session. RLS-scoped: this is what enforces that a session can only read/write its own `links`/`clicks`
- `service.ts` — service-role client, guarded by the `server-only` package so it can't accidentally end up in client code. **Bypasses RLS entirely.** Only for code that must act across all users: slug resolution (`src/lib/shortener/resolve-slug.ts`), click recording (`record-click.ts`), rate limiting, cron-adjacent functions
- `middleware.ts` — `updateSession()`, called from `src/proxy.ts`; refreshes an existing session cookie, does **not** create anonymous sessions (that happens client-side in `src/components/core/providers/supabase-session-provider.tsx`, so a visitor who only ever follows a short link never gets a session created for them)

**Two separate HMAC secrets, never interchange them**: `VISITOR_HASH_SECRET` (`visitor-hash.ts`) rotates daily for click-privacy; `RATE_LIMIT_HASH_SECRET` (`ip-hash.ts`) is deliberately stable so a rate limit doesn't reset every day.

### URL shortener domain logic (`src/lib/shortener/`)

Slug generation/validation, bot detection, device/geo/referrer parsing, the resolution cache, and rate limiting all live here as small single-purpose modules — see the README for the reasoning behind the non-obvious ones (redirect status code, `after()`, bot filtering, the two HMAC secrets).

`resolve-slug.ts` wraps its DB read in `unstable_cache`, tagged `link:${slug}`; `src/app/api/links/[id]/route.ts` calls `revalidateTag(tag, { expire: 0 })` (not `'max'` — that's stale-while-revalidate and could still serve the old destination once) on any edit. `unstable_cache` requires a live Next.js request context — it throws if called directly outside one, which is why the tests that exercise it spawn a real `next dev` rather than importing the function directly (`tests/helpers/next-test-server.ts`).

### Database (`supabase/`)

Imperative migrations in `supabase/migrations/`, applied in order via `supabase db push` (remote) or `supabase db reset` (local). Key things to know before touching this:

- **New tables/functions are not auto-exposed to the Data API.** Every table needs explicit `grant` statements per role (`anon`/`authenticated`/`service_role`) — RLS policies alone don't make a table reachable at all. This bit us twice during development (service_role needing `SELECT` in addition to what seemed like the obviously-needed `INSERT`/`UPDATE` on `clicks_daily`) — if a Data API call fails with `permission denied for table X`, check grants before assuming an RLS policy is wrong.
- `pg_cron` jobs (`*_schedule_nightly_cron.sql`) run as a privileged role, not via the Data API — they don't need the grants above. `aggregate_clicks_daily` is `SECURITY INVOKER` on purpose (see the security checklist in the `supabase` skill: don't reach for `SECURITY DEFINER` just to dodge a grant), which is exactly why it needed the extra grants to be callable via `service_role.rpc(...)` for testing and manual re-aggregation.
- Test the local stack with `supabase start` + `supabase db advisors --local --type all` before pushing anything — it catches missing-RLS and other issues immediately.

### UI

**Chakra UI v3** (`@chakra-ui/react`), not Tailwind/shadcn — despite earlier drafts of this file (and the presence of `@tailwindcss/postcss` as a dependency) suggesting otherwise. `src/theme/system.ts` defines the custom `createSystem` config (monospace type via `next/font`'s JetBrains Mono, the `brand` color scale, `app-bg`/`app-dot`/`app-border` semantic tokens for the dotted-grid look) — `src/components/ui/provider.tsx` wires it in place of `defaultSystem`. Reusable shortener-specific components live under `src/components/shortener/`.

### Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_ENV` | Controls env banner color: `local` (purple), `dev` (red), `prod` (green) |
| `NEXT_PUBLIC_BACKEND_URL` | Base URL for the Axios custom instance (unrelated to Supabase) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client config, safe to expose to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS — server-only, never prefix with `NEXT_PUBLIC_` |
| `POSTGRES_URL_NON_POOLING` | Direct (non-pooled) connection, used for migrations |
| `VISITOR_HASH_SECRET`, `RATE_LIMIT_HASH_SECRET` | Two distinct secrets — see "Supabase" above |

Copy `.env.config` to `.env.local` to bootstrap local environment values (or `vercel env pull .env.local` if the Vercel project is linked). **Anonymous sign-ins must be enabled in the Supabase dashboard** (Authentication → Providers → Anonymous) — this is off by default and has no code-level flag, so the app silently fails to create sessions without it.

### CI/CD

GitHub Actions (`.github/workflows/main.yaml`) runs on every push: lint → format → test → build. A second workflow, `.github/workflows/keep-alive.yaml`, pings `/api/health` every 3 days on a schedule to keep the Supabase free-tier project from auto-pausing after 7 days of inactivity — see the README for why this exists and why it can't just be a `pg_cron` job.
