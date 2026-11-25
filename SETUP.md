# WishBloom setup

## Requirements

- Node.js 20 LTS (or a current supported Node.js release)
- npm
- A Supabase project

## Supabase database and storage

1. In Supabase **SQL Editor**, run the complete `supabase/schema.sql` file.
2. Then run `supabase/migrations/20261125230000_birthday_experience.sql`.
   This additive migration adds `surprises.experience`, creates the private
   `surprise-assets` bucket, and adds owner/published-surprise storage policies.
   Existing surprise rows and their text remain intact.
3. The bucket accepts MP3, M4A, WAV, OGG, and WebM audio (up to 12 MB), and
   JPG, PNG, and WebP images (up to 8 MB each). The app enforces an eight-photo
   limit. Published recipient pages receive short-lived signed URLs; the bucket
   itself remains private.
4. No service-role key is needed. Never put one in a `NEXT_PUBLIC_*` variable.

The storage policies allow an authenticated owner to manage files only beneath
their own surprise. Anonymous recipient reads are allowed only for a published
surprise and an asset path currently referenced by an enabled song or memory
page. Review the policies in the migration before applying them to a production
project.

## Environment and local run

Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Then run:

```bash
npm install
npm run dev
```

Open http://localhost:3000, create an account, and configure a birthday surprise.
Save a draft before uploading media if you are creating a new surprise; the
editor creates its database row before uploading associated assets.

## Publishing and checking

Publish a surprise and open its `/s/<slug>` URL in a private browser window.
The recipient journey hides optional pages that are disabled or do not have
their required content. Song playback requires a user gesture. Candle sound
detection runs locally in the browser and does not record or upload microphone
audio; the press-and-hold interaction remains available if microphone permission
is denied.

For Vercel, configure the same two public environment variables. Set the
production Site URL and appropriate redirect URLs under Supabase Auth URL
Configuration.

The page sequence, media limits, bucket, migration, and required environment
variables are also summarized in `setup.yaml`.
