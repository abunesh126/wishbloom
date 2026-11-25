# WishBloom — Surprise Website Builder

WishBloom is a full-stack starter for creating personalized birthday / friendship surprise pages and publishing them to shareable URLs.

## Included in this MVP

- Email/password signup and login (Supabase Auth)
- Surprise editor: recipient, sender, date, title, letter, wishes, theme
- Save draft and publish
- User-owned dashboard: edit, delete, copy published link
- Public `/s/[slug]` surprise page with letter reveal and wishes
- Responsive layout for desktop and mobile
- Row-level security policies in `supabase/schema.sql`

## 1. Requirements

- Node.js 20 LTS (or a current supported Node release)
- npm
- A free Supabase project

## 2. Create the database

1. Create a project at https://supabase.com
2. Open **SQL Editor** in your Supabase dashboard.
3. Copy and run all of `supabase/schema.sql`.
4. In **Project Settings → API**, copy the Project URL and publishable key (or legacy anon key).

## 3. Configure and run locally

In the project folder:

```bash
npm install
```

Copy `.env.example` to `.env.local`, then fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Then run:

```bash
npm run dev
```

Open http://localhost:3000

## 4. Test the user flow

1. Sign up with an email and password.
2. If email confirmation is enabled, confirm the email.
3. Log in.
4. Create a surprise, fill in the recipient and letter, and add wishes.
5. Click **Publish surprise**.
6. Copy/open the generated `/s/your-slug` link in a private/incognito window.
7. Confirm the published surprise loads without logging in.
8. Log in again to edit or delete your surprise.

## 5. Deploy publicly

1. Push the project to a private or public GitHub repository.
2. Import the repository into https://vercel.com.
3. Add the two environment variables from `.env.local` in Vercel Project Settings → Environment Variables.
4. Deploy.
5. In Supabase Auth → URL Configuration, set the production Site URL to your Vercel domain and add any local/production redirect URLs needed for email confirmation.

After deployment, published links will look like:

`https://your-domain.vercel.app/s/recipient-surprise-a1b2c3d4`

## Notes / next improvements

This is a functional MVP, not a finished commercial service. Current editor stores text and wishes; photo and audio upload, richer templates, password-protected pages, payment, custom domains, rate limiting, content moderation, and an admin dashboard are not included yet.

The app uses the Supabase anon key in the browser. That is expected; never put a Supabase service-role key in frontend code. Row-level security is required and is included in the SQL setup.
