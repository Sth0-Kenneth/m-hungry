# mHungry

mHungry is a mobile-first household food inventory. This repository contains the working Phase 1 and Phase 2 MVP: Supabase email/password authentication, per-user inventory, expiration status, usage logs, dashboard summaries, private camera uploads, Japanese-capable receipt extraction, editable confirmation, purchases, and selected receipt items added to inventory. The complete interface can be switched between English and Japanese.

AI results are suggestions only. Users must confirm every scanned value. Expiration dates alone do not establish food safety.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Supabase PostgreSQL, Auth, private Storage, and RLS
- OpenAI Responses API through a server route, with `USE_MOCK_AI` fallback
- Zod, React Hook Form-ready form architecture, Lucide icons, Vitest
- PWA manifest and conservative offline service worker
- Vercel-compatible deployment

## Implemented in this milestone

- Public landing page and email/password registration, login, logout, persistent sessions
- English/Japanese interface switcher on public and authenticated pages, with cookie persistence and authenticated profile synchronization
- Protected application route group and user-scoped queries
- Inventory create/read/update/delete, search and storage filtering
- Expiration states: expired, today, tomorrow, within three days, safe, or missing
- Atomic usage logging and inventory reduction through a PostgreSQL function
- Dashboard active count, expiration summaries, recent additions, today's usage, waste value
- Reusable rear-camera/gallery capture with image resizing and permission/error states
- Private receipt upload under `{userId}/{year}/{month}/{uuid}.jpg`
- Server-only OpenAI receipt processing with a safe Japanese mock fallback
- Editable store, date, total, original OCR name, normalized name, quantity, unit, and price
- Atomic receipt, purchase, purchase-item, and chosen inventory insertion
- Purchase history and details
- Full initial schema, indexes, foreign keys, RLS, private bucket policies, and RPCs
- Tests for critical business rules, PWA shell, privacy/safety notices

Phase 3 scanning and Phase 4 recipes have protected route placeholders so navigation is stable; they are intentionally not represented as completed functionality in this Phase 1–2 milestone. Firebase reminders are Phase 5.

## Local setup

Requirements: Node.js 20.9+ and pnpm 10+.

```bash
git clone <repository-url>
cd <repository-folder>
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a Supabase project.
2. Install the Supabase CLI and authenticate:

```bash
pnpm add -D supabase
pnpm supabase login
pnpm supabase link --project-ref YOUR_PROJECT_REF
pnpm supabase db push
```

For a local Supabase stack:

```bash
pnpm supabase start
pnpm supabase db reset
```

The migration at `supabase/migrations/202607220001_initial_schema.sql` creates every requested table, enum, index, trigger, transaction function, RLS policy, private bucket, and storage-object policy. Run it once. Do not manually make either image bucket public.

In Supabase Dashboard → Authentication → URL Configuration:

- Set **Site URL** to the canonical production URL, such as `https://mhungry.vercel.app`.
- Add `https://mhungry.vercel.app/**` and `http://localhost:3000/**` to **Redirect URLs**.
- For Vercel previews, optionally add `https://*-your-team-slug.vercel.app/**`.

Set `NEXT_PUBLIC_SITE_URL` to the canonical production URL in Vercel. For local
development, keep it as `http://localhost:3000`.

Supabase's hosted default confirmation template works with this project without
editing it. Registration intentionally requests the implicit email confirmation
flow, and the browser callback at `/auth/confirm` validates the returned session,
stores it in secure Supabase cookies, and redirects to `/dashboard`. The callback
also accepts older PKCE links.

If custom SMTP is configured and you want a token-hash template instead, update
Authentication → Email Templates → Confirm signup so its confirmation link is:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
  Confirm email address
</a>
```

The `/auth/confirm` page accepts implicit, PKCE, and token-hash callback formats.
Do not put access or refresh tokens in logs or server-rendered page output.

### Production confirmation email delivery

Supabase's hosted default email service is only for initial testing. It sends
only to email addresses that are members of the Supabase organization and is
limited to two auth emails per hour. To register public testers:

1. Create SMTP credentials with Resend, Postmark, SendGrid, Amazon SES, Brevo,
   or another SMTP provider.
2. Open Supabase Dashboard → Authentication → Emails → SMTP Settings.
3. Enable custom SMTP and enter the sender address, host, port, username, and
   password.
4. Keep **Confirm email** enabled.
5. Submit one new registration and use the newest confirmation link.

The app displays a specific error for unauthorized recipient addresses and for
the built-in provider's email rate limit.

Copy Project Settings → API values into `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

The browser uses only the anon key. RLS is the security boundary. The service-role key is not used by Phases 1–2.

## Language support

Use the **EN / 日本語** control in the header, sidebar, authentication pages, or Settings. The choice is stored in the `foodtrack-locale` cookie for immediate server-rendered localization. When signed in, the locale endpoint also updates `profiles.language` through the user's normal RLS-protected Supabase session; no admin key is involved.

Translations live in `src/lib/i18n/dictionaries.ts`. Database enum values and route paths remain language-neutral, so changing the interface language never duplicates or rewrites inventory data. Dates and currency values use the selected locale for display.

## OpenAI and mock mode

Development defaults to free, deterministic receipt samples, including Japanese receipt text:

```text
USE_MOCK_AI=true
```

To use live extraction:

```text
USE_MOCK_AI=false
OPENAI_API_KEY=YOUR_KEY
OPENAI_MODEL=gpt-4.1-mini
```

OpenAI is called only from `POST /api/ai/process-receipt`. Signed receipt URLs expire after 60 seconds. Requests time out after 45 seconds. Image bytes and secrets are never logged. Live-model availability and structured-output behavior can change; test the configured model before production.

## Firebase Cloud Messaging

FCM belongs to Phase 5 and is not active in this milestone. The environment placeholders are included so deployment configuration will not need to be renamed. Later setup requires a Firebase web app, VAPID key, Admin service account values, notification permission UI, token registration/removal, and a Firebase messaging service worker.

## Environment variables

See `.env.example`. Public variables are limited to Supabase anon configuration and Firebase's public web-app configuration. Never prefix OpenAI, Firebase Admin, cron, or Supabase service-role secrets with `NEXT_PUBLIC_`.

## Validation

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Vercel deployment

1. Import the repository into Vercel.
2. Add the contents of `.env.local` under Project Settings → Environment Variables.
3. Add the production URL to Supabase Authentication redirect URLs.
4. Deploy with the default Next.js build command, or run:

```bash
pnpm vercel
pnpm vercel --prod
```

No cron is enabled in this Phase 1–2 build. In Phase 5, configure a daily Vercel Cron request to `/api/cron/expiration-reminders` and validate `Authorization: Bearer $CRON_SECRET`; set the same strong random `CRON_SECRET` in Vercel. Avoid adding an unprotected cron schedule.

## Security notes

- Every owned table has RLS policies for select, insert, update, and delete.
- All mutations include `auth.uid()` ownership checks; multi-record receipt and usage mutations run atomically in PostgreSQL.
- Storage is private, limited to 15 MB and approved image MIME types, and restricted to the authenticated user's first path segment.
- Receipt input is schema-validated and rate-limited. The in-memory limiter is an MVP abstraction; production multi-region deployments should replace it with Redis/Upstash.
- Private API responses are not cached by the service worker.
- Keep dependency lockfiles reviewed and enable platform secret scanning.

## Known limitations

- Phases 3–5 are not implemented yet: barcode/OFF lookup, food and label vision, recipes/search, push notifications, and cron reminders.
- HEIC is accepted by Storage where the browser supplies the correct MIME type, but browser decoding varies; the capture component reports unsupported decoding and asks for JPEG/PNG.
- Receipt extraction quality depends on lighting, crop, receipt layout, and the selected model. Receipts normally do not include expiration dates.
- The rate limiter is per server process. Image deletion is available through storage policies but a dedicated receipt-delete UI is deferred.
- Offline mode provides only a safe shell; it deliberately does not cache private inventory or API data.

## Start commands

```bash
pnpm install
cp .env.example .env.local
# Fill in Supabase variables, then:
pnpm dev
```
