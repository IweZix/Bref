# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint:check   # Run Biome linter checks
npm run format       # Format code with Biome
npm run generate-translation  # Regenerate src/localization/tKeys.ts from locale JSON files
```

> There is no test suite yet — `npm test` is a placeholder.

## Architecture

**Framework**: Next.js (App Router) with TypeScript. Path alias `@/*` maps to `src/*`.

**Linting/Formatting**: Biome only (no ESLint, no Prettier). Single quotes, 2-space indent, auto-organize imports.

### Routing & Internationalization

The app lives under `src/app/[locale]/`. Two locales are supported: `fr` (default) and `en`.

- `src/localization/routing.ts` — locale list and default locale
- `src/localization/request.ts` — next-intl server config (imports locale JSON dynamically)
- `src/proxy.ts` — next-intl middleware (exported as `middleware` with a matcher)
- `src/localization/locales/` — translation JSON files (`en.json`, `fr.json`)
- `src/localization/tKeys.ts` — **auto-generated** type-safe translation key constants

**Always run `npm run generate-translation` after editing locale JSON files.** Use the generated `tKeys` constants when calling `useTranslations()`:

```typescript
const t = useTranslations();
t(tKeys.homepage.title); // type-safe, autocomplete-friendly
```

### Key Utilities

- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/utils/custom-instance.ts` — Axios instance factory; reads Bearer token from localStorage and base URL from `NEXT_PUBLIC_BACKEND_URL`
- `src/hooks/useLocalStorage.ts` — Generic localStorage hook with cross-tab sync; `StorageKeys` enum lives here

### UI

Tailwind CSS v4 + shadcn/ui (radix-nova style, neutral base color, lucide icons). Add shadcn components via `npx shadcn@latest add <component>`.

### Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_ENV` | Controls env banner color: `local` (purple), `dev` (red), `prod` (green) |
| `NEXT_PUBLIC_BACKEND_URL` | Base URL for the Axios custom instance |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |

Copy `.env.config` to `.env` to bootstrap local environment values.

### CI/CD

GitHub Actions (`.github/workflows/main.yaml`) runs on every push: lint → format → test → build.
