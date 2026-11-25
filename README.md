# WishBloom — Surprise Website Builder

WishBloom lets a creator build and publish a personal birthday journey with a
countdown, letter, wishes, optional dedicated song, candle-blowing interaction,
and optional memory photos.

## Features

- Supabase email/password authentication and user-owned surprise management
- Draft and publish flow with shareable `/s/<slug>` pages
- Configurable page order and optional birthday journey pages
- Recipient countdown, wishes, candle interaction, song playback, photo memories,
  and a personalized final greeting
- Responsive cream, peach, pink, and pastel design
- Private Supabase Storage bucket with owner-managed uploads and published-only
  recipient access to signed asset URLs
- Row-level security for surprise records and media

## Quick start

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Then run `supabase/migrations/20261125230000_birthday_experience.sql`.
4. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Run `npm install` and `npm run dev`.

The migration is additive and preserves existing surprise rows. It adds the
experience configuration and the private `surprise-assets` bucket/policies.
Audio uploads are limited to 12 MB; each image is limited to 8 MB, with up to
eight photos. Supported formats and all setup steps are documented in
[`SETUP.md`](./SETUP.md) and [`setup.yaml`](./setup.yaml).

Do not expose a Supabase service-role key to the browser. The app uses the
publishable key and Supabase row-level/storage policies.

## Build and verification

```bash
npm run build
```

`npm run lint` is present in `package.json`; Next.js prompts to configure ESLint
because this starter does not include an ESLint configuration.
