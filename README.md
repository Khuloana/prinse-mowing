# Prinse Mowing — Supabase setup

Every booking now saves to a Supabase database *and* opens WhatsApp. Follow
these steps once to wire it up.

## 1. Create the Supabase project

1. Go to https://supabase.com, sign in, click **New project**.
2. Pick an organization, name the project (e.g. `prinse-mowing`), set a
   database password (save it somewhere), choose a region close to your
   customers, and click **Create new project**. Wait ~2 minutes for it to
   provision.

## 2. Create the tables (this *is* your API)

Supabase auto-generates a REST API for every table you create — there's no
separate step to "build" an API beyond this.

1. In the left sidebar, open **SQL Editor**.
2. Click **New query**, paste in the contents of `supabase/schema.sql`
   (included in this folder), and click **Run**.
3. Open **Table Editor** and confirm you now see `customers` and
   `bookings` tables.

That SQL also turns on Row Level Security (RLS) and adds policies that let
the public website *insert* records, but not read, edit, or delete them —
only you can do that from the dashboard.

## 3. Get your API credentials

1. Go to **Settings > API**.
2. Copy the **Project URL** and the **anon / public** key (not the
   `service_role` key — that one must never go in client-side code).
3. Open `src/supabase.ts` and paste them in at the top:

   ```ts
   const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
   ```

## 4. Rebuild the JavaScript after any change to supabase.ts

The site is plain HTML/CSS/JS with no bundler, so `src/supabase.ts` is
compiled once into `dist/supabase.js`, which `index.html` loads directly:

```bash
npm install --no-save typescript
npx tsc -p tsconfig.json
```

This regenerates `dist/supabase.js`. Re-run it any time you edit
`src/supabase.ts` — `index.html` never needs to change again after that.

## 5. Test it

Open `index.html`, pick a service, fill in the form, and click
**Book Now via WhatsApp**. Then check **Table Editor > bookings** in
Supabase — a new row (linked to a row in `customers`) should appear
within a second or two, right before WhatsApp opens.

If a save fails (e.g. wrong keys, or the customer is offline), the
booking still proceeds to WhatsApp as normal — check the browser console
for a "Booking was not saved to the database" warning to debug.

## Files added for this

- `src/supabase.ts` — typed source, edit this
- `dist/supabase.js` — compiled output, loaded by index.html, don't edit
  by hand
- `supabase/schema.sql` — run once in the Supabase SQL Editor
- `tsconfig.json` — compiler settings
