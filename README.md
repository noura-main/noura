This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment variables

For the dashboard **Nearby Foodspots** map (Stadia Maps tiles), set:

- `NEXT_PUBLIC_STADIA_API_KEY` — API key from [Stadia Maps](https://stadiamaps.com/) (used in the map style URL; safe to expose with the `NEXT_PUBLIC_` prefix).

Add it to `.env.local` in the project root.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase profiles trigger setup

This project includes a database migration at [`supabase/migrations/001_profiles_trigger.sql`](supabase/migrations/001_profiles_trigger.sql).

It creates:

- `public.profiles` table linked to `auth.users`
- Row level security policies for "read/update own profile"
- A trigger on `auth.users` that writes `email`, `full_name`, and `date_of_birth` into `public.profiles` after signup

### Apply in Supabase

1. Open Supabase Dashboard for your project.
2. Go to **SQL Editor**.
3. Paste and run the SQL from `supabase/migrations/001_profiles_trigger.sql`.

### Verify

1. Sign up from `/auth/sign-up` using a new email.
2. Open Supabase **Table Editor** and inspect `public.profiles`.
3. Confirm a row exists with:
   - `id` matching the new `auth.users.id`
   - `email` populated
   - `full_name` and `date_of_birth` copied from signup form metadata
