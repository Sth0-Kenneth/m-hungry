# mHungry

English | [日本語](README.ja.md)

mHungry is a mobile-first household food inventory with working Phases 1–5: authentication, inventory and usage, receipt/food/expiration scanning, inventory-aware recipe generation and web search, expiration reminders, web push, and PWA support. The interface can be switched between English and Japanese.

AI results are suggestions only. Users must confirm every scanned value. Expiration dates alone do not establish food safety.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Supabase PostgreSQL, Auth, private Storage, and RLS
- Gemini Interactions API through server routes, with `USE_MOCK_AI` fallback
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
- Server-only Gemini receipt processing with a safe Japanese mock fallback
- Editable store, date, total, original OCR name, normalized name, quantity, unit, and price
- Atomic receipt, purchase, purchase-item, and chosen inventory insertion
- Purchase history and details
- Full initial schema, indexes, foreign keys, RLS, private bucket policies, and RPCs
- Tests for critical business rules, PWA shell, privacy/safety notices
- Food-photo recognition and expiration-label extraction with Zod validation and explicit confirmation
- Inventory-aware AI recipes, missing-ingredient disclosure, saved history, and confirmed cooking deductions
- Dedicated original-source web recipe search with inventory prioritization, ingredient suggestions, short summaries, and direct links
- In-app notifications, FCM device registration/removal, reminder controls, and daily protected cron

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
pnpm dlx supabase@latest login
pnpm dlx supabase@latest link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase@latest db push
```

For a local Supabase stack:

```bash
pnpm dlx supabase@latest start
pnpm dlx supabase@latest db reset
```

The initial migration creates the schema, RLS, buckets, and policies. The `20260901020407_phase_3_5_features.sql` migration adds recipe indexes and an authenticated atomic recipe-usage function. Run all migrations with `pnpm dlx supabase@latest db push`. Do not make either image bucket public.

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

The browser uses only the anon key. RLS is the security boundary. The service-role/secret key is used only by the protected reminder cron to query multiple users.

## Language support

Use the **EN / 日本語** control in the header, sidebar, authentication pages, or Settings. The choice is stored in the `foodtrack-locale` cookie for immediate server-rendered localization. When signed in, the locale endpoint also updates `profiles.language` through the user's normal RLS-protected Supabase session; no admin key is involved.

Translations live in `src/lib/i18n/dictionaries.ts`. Database enum values and route paths remain language-neutral, so changing the interface language never duplicates or rewrites inventory data. Dates and currency values use the selected locale for display.

## Gemini and mock mode

Development defaults to deterministic samples for receipts, food, expiration labels, generated recipes, and web recipe results:

```text
USE_MOCK_AI=true
```

To use live extraction:

```text
USE_MOCK_AI=false
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-2.5-flash
```

Gemini is called only from authenticated server routes. The Interactions API uses structured JSON schemas and multimodal image input. Recipe search accepts only URLs returned as Google Search grounding citations before Gemini creates short summaries. Signed image URLs expire after 60 seconds, requests time out after 45 seconds, malformed structured responses are retried once, and images/secrets are never logged. `GEMINI_API_KEY` belongs in `.env.local` or Vercel Environment Variables—not in the Settings page or any `NEXT_PUBLIC_` variable.

Gemini's free tier has usage limits and Google states that free-tier content may be used to improve its products. Review the current Google AI terms before processing real receipts or food images; keep `USE_MOCK_AI=true` if you do not want images sent to Gemini.

## Firebase Cloud Messaging

1. Create a Firebase project and web app.
2. Enable Cloud Messaging and create a Web Push certificate/VAPID key.
3. Add all `NEXT_PUBLIC_FIREBASE_*` values from `.env.example`.
4. Create a Firebase Admin service account and add `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` as server-only secrets.
5. Redeploy, then enable the current device from Settings. Unsupported/denied browsers still receive in-app notification records.

## LINE Login and push messages

The codebase includes an optional LINE foundation: Supabase custom OIDC login, safe account linking for existing email users, signed follow/unfollow webhooks, per-user opt-in, test messages, and LINE delivery from the expiration reminder cron. It stays hidden until configured.

1. In LINE Developers, create a provider, a **LINE Login** channel, and a **Messaging API** channel. Both channels must be under the same LINE provider so their user IDs match.
2. Link the LINE Official Account to the LINE Login channel under **Basic settings → Linked LINE Official Account**.
3. In Supabase Dashboard, open **Authentication → Providers → New Provider**, choose **Auto-discovery (OIDC)**, and configure:
   - Identifier: `custom:line`
   - Issuer: `https://access.line.me`
   - Client ID / secret: the LINE Login channel ID and channel secret
   - Scopes: `openid profile`
   - Email optional: enabled (unless LINE has approved your channel for the email scope)
4. Copy the read-only callback URL shown by Supabase into the LINE Login channel's **Callback URL**. Keep PKCE enabled.
5. In Supabase Authentication settings, enable manual identity linking. Existing email users should sign in normally and use **Settings → Link LINE account**; this avoids creating a duplicate account.
6. Apply the latest migration with `pnpm dlx supabase@latest db push`.
7. Add these variables locally and in Vercel:

```dotenv
NEXT_PUBLIC_LINE_LOGIN_ENABLED=true
NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL=https://lin.ee/your-add-friend-id
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=your-long-lived-channel-access-token
LINE_MESSAGING_CHANNEL_SECRET=your-messaging-channel-secret
```

8. Set the Messaging API webhook URL to `https://your-domain.example/api/line/webhook`, enable webhooks, and click **Verify** in LINE Developers.
9. Redeploy. Sign in or link LINE, add the Official Account, enable LINE messages in Settings, and send a test message.

The webhook validates `x-line-signature` against the untouched request body before processing it. LINE user IDs and friendship state are server-managed; authenticated browser clients can only read their own connection row.

## Environment variables

See `.env.example`. Public variables are limited to non-secret browser configuration. Never prefix Gemini, Firebase Admin, LINE channel credentials, cron, or Supabase service-role secrets with `NEXT_PUBLIC_`.

## Validation

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Vercel deployment

1. Import the repository into Vercel.
2. Add the required variables from `.env.example` under Project Settings → Environment Variables. Never paste `.env.local` wholesale if it contains local-only or obsolete secrets.
3. Add the production URL to Supabase Authentication redirect URLs.
4. Deploy with the default Next.js build command, or run:

```bash
pnpm dlx vercel@latest login
pnpm dlx vercel@latest
pnpm dlx vercel@latest --prod
```

`vercel.json` schedules `/api/cron/expiration-reminders` daily at 00:00 UTC. Add a strong `CRON_SECRET` to Vercel; Vercel Cron sends it as `Authorization: Bearer $CRON_SECRET`. Also add a server-only Supabase service-role or secret key. The endpoint accepts GET for Vercel and POST for Supabase Cron/manual verification.

## Security notes

- Every owned table has RLS policies for select, insert, update, and delete.
- All mutations include `auth.uid()` ownership checks; multi-record receipt and usage mutations run atomically in PostgreSQL.
- Storage is private, limited to 15 MB and approved image MIME types, and restricted to the authenticated user's first path segment.
- Receipt input is schema-validated and rate-limited. The in-memory limiter is an MVP abstraction; production multi-region deployments should replace it with Redis/Upstash.
- Private API responses are not cached by the service worker.
- Keep dependency lockfiles reviewed and enable platform secret scanning.

## Known limitations

- Live AI, FCM, and LINE delivery require external credentials; mock AI and in-app notification fallbacks remain available without them.
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
