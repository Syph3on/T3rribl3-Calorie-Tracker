# Player Menu — your gym app

A React + Vite site with 5 pages: Character (about you), Fuel Log (calorie
tracker), Training (gym routine), Loadout (gymwear), Support Quest (donate).
Styled like a retro game menu — your sprite art is your character portrait.

## 1. Run it locally

You need [Node.js](https://nodejs.org) installed (get the LTS version).

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Edit any file in
`src/pages/` and the browser updates instantly — that's your main workflow.

## 2. Set up Supabase (your database)

This powers the calorie tracker and sprite upload. Free tier is plenty.

1. Go to [supabase.com](https://supabase.com) → sign up → **New project**.
2. Once it's created, go to **SQL Editor** → **New query**, paste in the
   contents of `supabase-setup.sql` (in this folder), and run it. This
   creates your tables.
3. Go to **Storage** → **New bucket** → name it `sprites` → turn on
   **Public bucket** → create.
4. Go to **Project Settings** → **API**. Copy the **Project URL** and the
   **anon public** key.
5. In this project, copy `.env.example` to a new file called `.env` and
   paste those two values in:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
6. Restart `npm run dev`. The tracker and sprite upload will now work.

`.env` is already in `.gitignore` — it won't get pushed to GitHub, which is
correct (keys stay private).

## 3. Push it to GitHub

1. Go to [github.com](https://github.com) → **New repository** → give it a
   name (e.g. `gymapp`) → **don't** add a README/gitignore (you already have
   them) → **Create repository**.
2. GitHub will show you commands. In this project folder, run:
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/gymapp.git
   git push -u origin main
   ```

## 4. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → sign up with your GitHub account.
2. **Add New** → **Project** → pick your `gymapp` repo → **Import**.
3. Vercel auto-detects Vite. Before clicking Deploy, open **Environment
   Variables** and add the same two keys from your `.env` file
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Click **Deploy**. In about a minute you'll get a live URL like
   `gymapp.vercel.app`.
5. Every time you `git push` to `main` again, Vercel automatically
   redeploys. That's the whole workflow going forward.

## What to customize next

- `src/pages/Home.jsx` — your bio text and stat values
- `src/pages/GymRoutine.jsx` — your real training split
- `src/pages/Gymwear.jsx` — real products + a real store/checkout link
- `src/pages/Donate.jsx` — swap the `href="#"` links for a real Ko-fi /
  Buy Me a Coffee / PayPal.me / Stripe Payment Link
- `tailwind.config.js` — colors and fonts if you want a different look
- Add a real logo/favicon in `public/`

## Ideas to add later

- Auth (Supabase Auth) if you want to log in and lock editing to just you
- A workout log page with sets/reps history, similar structure to the
  calorie tracker
- Charts for calorie trends over time (e.g. `recharts`)
- A blog/progress-log page for photos and updates
