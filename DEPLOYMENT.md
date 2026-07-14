# Sprint 0 — Provisioning Guide

A click-by-click walkthrough to get the app running on Neon + Clerk + Vercel.

**No domain needed.** Vercel gives you a free URL like
`woodworking-plan-abc123.vercel.app`. That is your production URL. Buying a real
domain is a branding decision (`BUILD_PLAN.md` §3, decision #8 — still open) and
is not needed for anything in Sprint 0 or Phase 1.

**No credit card. Anywhere.** All three vendors are on genuine free tiers per the
$0-during-development decision in `DECISIONS_LOG.md`. If any signup screen asks
for a card, **stop and tell me** — that means a free tier changed, and it's a
decision for you, not for me to work around.

**Time:** ~15 minutes total.

---

## ⚠️ Before you launch anything, read this once

Vercel's free **Hobby** tier **prohibits commercial use** — that explicitly
includes taking payments from visitors and showing ads.

You've decided to build on Hobby (fine — no payments, no ads, no public traffic
during the build) and revisit at launch. That carries a **hard gate**:

> **Do not ship billing, ads/affiliate links, or a public launch on Hobby.**
> Move to Vercel Pro (~$20/mo) or another commercial-use-permitted host first.

I will stop and escalate when we reach that line. Full reasoning is in
`DECISIONS_LOG.md`.

---

## Step 0 — Push the code first

Vercel imports from GitHub. If the code isn't on `main` yet, Vercel will deploy
an empty repo and Step 3 will look broken for no reason.

```powershell
cd C:\Users\latar\Desktop\Woodworking-Plan
Get-ChildItem .git -Recurse -Filter *.lock | Remove-Item -Force

npm install          # picks up the postcss security override, rewrites the lockfile
npm audit            # expect: found 0 vulnerabilities
npm run build        # expect: pass

git checkout main
git add -A
git commit -m "Sprint 0: environment and architecture (Next.js + Neon + Clerk + CI)"
git push origin main

git push origin --delete sprint-0/environment-and-architecture
git branch -D sprint-0/environment-and-architecture
```

Confirm the files show up at
<https://github.com/klatar200/Woodworking-Plan> before continuing.

---

## Step 1 — Neon (the database)

**What it is:** your Postgres database. Stores every plan, user, save, and like.

1. Go to <https://neon.com> → **Sign up** → use **Continue with GitHub** (fastest,
   no new password).
2. It drops you into a "Create project" screen.
   - **Project name:** `woodworking-plan` (this is internal, not public — it
     commits you to nothing branding-wise).
   - **Postgres version:** leave the default.
   - **Region:** pick the one closest to you.
   - Click **Create**.
3. You land on the project dashboard. Find the **Connection string** box
   (usually top-right, labeled "Connect" or "Connection Details").
4. **This part matters.** There's a dropdown or toggle for
   **Pooled connection** / **Connection pooling**. Make sure it's **ON**.
   The correct string has **`-pooler`** in the hostname:

   ```
   postgresql://neondb_owner:XXXX@ep-cool-name-12345-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
                                                        ^^^^^^^
   ```

   *Why:* Vercel runs your code as serverless functions that open a flood of
   short-lived connections. The non-pooled endpoint will run out of connections
   and start erroring. The pooled one won't.
5. Click **copy** and paste it somewhere temporary. This is your **`DATABASE_URL`**.

> This string contains your database password. Don't paste it into chat, a
> commit, or a screenshot.

**Free tier check:** 0.5 GB storage, 100 compute-hours/month, sleeps when idle.
Perpetual, not a trial. We will not come close to the limits.

---

## Step 2 — Clerk (login/accounts)

**What it is:** handles sign-up, login, and passwords so we never store them.

1. Go to <https://clerk.com> → **Sign up** (GitHub login is fine).
2. **Create application.**
   - **Name:** `woodworking-plan`.
   - **Sign-in options:** you'll see toggles for Email, Google, GitHub, etc.
     **Leave the defaults alone.** Which login methods we offer is a Sprint 2
     decision — turning them on now just creates work to undo.
   - Click **Create application**.
3. You land on a screen showing **API Keys**. You need two:

   | Key | Starts with | Sensitivity |
   |---|---|---|
   | Publishable key | `pk_test_...` | Public — safe in a browser by design |
   | Secret key | `sk_test_...` | **SECRET** — treat like a password |

4. Copy both somewhere temporary. There's a "show" toggle to reveal the secret key.

> If the secret key ever leaks, rotate it in the Clerk dashboard immediately.
> Rotating takes 10 seconds. Assuming nobody scraped it does not.

**Free tier check:** 50,000 users. We need roughly zero.

---

## Step 2.5 — Clerk user-deletion webhook (do this before launch)

**What it is:** when someone deletes their account in Clerk, Clerk POSTs us a
`user.deleted` event. Our endpoint (`/api/webhooks/clerk`) verifies it and deletes
that person's row and all their data (saves, likes, reviews, build photos). Without
it, deleted users leave their cached email behind in our database forever — a
data-retention problem the moment there are real users.

**This needs the deployed URL, so do it after Step 4 (or come back to it).** Until
the signing secret is set, the endpoint rejects every request (fails closed) and the
rest of the app is unaffected.

1. In the Clerk dashboard → **Configure → Webhooks → Add Endpoint.**
2. **Endpoint URL:** `https://<your-vercel-url>/api/webhooks/clerk`.
3. **Subscribe to events:** tick **`user.deleted`** only. (Creation and updates are
   handled by lazy sign-in sync — no webhook needed.)
4. **Create**, then copy the endpoint's **Signing Secret** (starts with `whsec_`).
5. Add it to Vercel → **Settings → Environment Variables**:
   `CLERK_WEBHOOK_SIGNING_SECRET = whsec_...` (Production). **Redeploy.**
6. Verify: in the webhook's **Testing** tab, send a `user.deleted` event — you should
   see a `200`. A `500` means the secret isn't set on Vercel yet; a `400` means the
   secret in Vercel doesn't match this endpoint's.

> Local testing is optional: put the same `whsec_...` in `.env.local` and forward
> events with the Clerk CLI, or just rely on the automated tests
> (`tests/clerk-webhook.test.ts`, `tests/user-deletion.test.ts`).

---

## Step 3 — Run it locally first

Prove it works on your machine before involving Vercel — that way, if the deploy
breaks, you know it's the deploy and not the code.

```powershell
cd C:\Users\latar\Desktop\Woodworking-Plan
Copy-Item .env.example .env.local
notepad .env.local
```

Paste in your three values, save, close:

```
DATABASE_URL="postgresql://...-pooler...neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

Then:

```powershell
npm run db:generate
npm run dev
```

Open <http://localhost:3000>. You should see three rows, **all green**:

- Next.js (Vercel) — running
- Neon Postgres — connected (42ms)
- Clerk — configured

If Neon says "connection failed," the connection string is wrong — most likely
you grabbed the non-pooled one, or a character got clipped on paste.

`.env.local` is gitignored. Run `git status` and confirm it does **not** appear.

Stop the server with `Ctrl+C`.

---

## Step 4 — Vercel (hosting)

**What it is:** runs the app on the public internet and redeploys on every push
to `main`.

1. Go to <https://vercel.com> → **Sign up** → **Continue with GitHub** (use the
   account that owns the repo).
2. Choose the **Hobby** plan. Free. It will not ask for a card.
3. **Add New… → Project**.
4. Find `klatar200/Woodworking-Plan` in the list → **Import**.
   - If the repo isn't listed, click **Adjust GitHub App Permissions** and grant
     Vercel access to it.
5. On the configure screen:
   - **Framework Preset:** it should auto-detect **Next.js**. Leave it.
   - **Build settings:** leave them. `vercel.json` in the repo already sets the
     correct build command.
   - **Environment Variables** — expand this section and add **all three**, one
     at a time:

     | Name | Value |
     |---|---|
     | `DATABASE_URL` | your Neon pooled string |
     | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | your `pk_test_...` |
     | `CLERK_SECRET_KEY` | your `sk_test_...` |

     Make sure each is applied to **Production, Preview, and Development** (all
     three checkboxes — that's usually the default).

     > Don't skip this. The app deliberately refuses to boot in production with a
     > missing secret, rather than silently serving a half-broken site. If you
     > forget one, the deploy fails loudly — that's by design, not a bug.

6. Click **Deploy**. Wait ~2 minutes.

---

## Step 5 — Verify, and send me the result

Vercel gives you a URL like `https://woodworking-plan-abc123.vercel.app`.

**On your phone** (this is a mobile-first product — check it the way people will
actually use it):

1. Open the URL. Three green rows, same as local.
2. Open `<your-url>/api/health`. You should get:

```json
{
  "status": "ok",
  "services": {
    "database": { "status": "ok", "latencyMs": 42 },
    "clerk": { "configured": true }
  },
  "timestamp": "2026-07-12T..."
}
```

**Send me:** the Vercel URL and that JSON response. **Not** the secrets.

`"database": { "status": "ok" }` from a live URL is the proof Sprint 0 needs:
Vercel → Next.js API route → Neon Postgres, working end to end.

> The very first request after a quiet period may take 1–3 seconds. That's Neon
> waking from sleep on the free tier. Expected, not a bug.

---

## Step 5.5 — Separate the dev database from production (do this before Sprint 2)

Until now, `.env.local` and Vercel both pointed at the **same** Neon database.
That was harmless while the only data was reproducible seed content. It stops
being harmless the moment Sprint 2 creates real user accounts: a routine
`npm run db:seed` from your laptop would then be writing to live users.

Neon's free tier includes **10 branches**. Cost: $0. Time: 5 minutes.

### Create the dev branch

1. Neon dashboard → your project → **Branches** → **New Branch**.
2. Parent branch: `production` (or `main` — whatever your default is called).
3. Name it **`dev`**.
4. Create. Neon copies the schema *and* the current data instantly — copy-on-write,
   so it costs no extra storage.
5. Open the `dev` branch → **Connection Details** → copy the **pooled** string
   (it has `-pooler` in the host, and a *different* endpoint id than production).

### Point local development at it

Edit `.env.local` and replace `DATABASE_URL` with the **dev** branch string.

**Leave Vercel's environment variables alone.** Vercel keeps pointing at
`production`. That is the whole point:

| Environment | Database | Set in |
|---|---|---|
| Your laptop | Neon **`dev`** branch | `.env.local` (gitignored) |
| Vercel (production) | Neon **`production`** branch | Vercel → Settings → Environment Variables |

### Verify the separation

```powershell
npm run db:seed
```

The first line printed is the **target database host**. Confirm the endpoint id
matches your `dev` branch, not production. If it doesn't, stop — `.env.local` is
still pointing at live data.

Then confirm production is untouched: hit `<your-vercel-url>/api/health`. It
should still return `database.status: "ok"`.

> **From here on:** `npm run db:migrate`, `db:seed`, `db:push`, and `migrate reset`
> all hit `dev` only. Production's schema changes exclusively through
> `prisma migrate deploy`, which Vercel runs on every deploy from the committed
> migrations in `prisma/migrations/`. That is the only path to production, and it
> is the one you want.

---

## ⚠️ Schema flows to production. DATA DOES NOT.

Read this before any sprint that adds a **derived** column.

Vercel runs `prisma migrate deploy` on every deploy (via the `vercel-build`
script), so production's **schema** always catches up automatically.

**Production data does not.** The seed only ever runs against the dev branch.

That distinction shipped a real defect in Sprint 4: the `searchVector` column is
*derived data* — a migration creates it empty, and the seed pipeline computes its
value. Production got the column and never got the values, so live search returned
zero results for every query while dev search worked perfectly.

**The rule:** *any migration adding a column whose value must be computed from
existing rows needs a production backfill step.* Creating the column is not the
same as populating it.

### ⚠️ A CONTENT change is a production data change (Sprint 12 revision)

Editing anything in `content/plans/*.json` — a material name, a price, a step — changes
**data, not schema.** It therefore reaches production by **exactly one route: a manual
production seed.** Deploying does nothing to it. CI going green means nothing about it.

This is the same trap that shipped an empty `searchVector` to production in Sprint 4
and went unnoticed for three sprints. The failure looks identical: **dev is perfect,
production is stale, and every check is green.**

The Sprint 12 material-name normalization (`Titebond II wood glue` → `Wood glue`, etc.)
is a content change. **It is not live until the seed below is run against production.**
The seed is idempotent and upserts on `slug`, so re-running it is safe. It also rebuilds
`searchVector`, which is derived from material names — so search would otherwise keep
matching the old names too.

### Backfilling production (deliberate, and rare)

```powershell
cd C:\Users\latar\Desktop\Woodworking-Plan

# Temporarily point .env.local at the PRODUCTION branch (comment dev, uncomment prod)
npm exec -- dotenv -e .env.local -- prisma migrate deploy
npm exec -- dotenv -e .env.local -- tsx prisma/seed.ts

# Then IMMEDIATELY swap .env.local back to the dev branch.
```

The seed prints its target database host as its first line. **Read it.** If it does
not say what you expect, stop.

> Bare `npx prisma` / `npx tsx` do **not** read `.env.local` — only `.env`. That is
> why these commands go through `dotenv-cli`. A command that "should" work will
> otherwise silently target nothing.

> Neon **branches share the role password.** Rotating it invalidates dev *and*
> production — update `.env.local` and Vercel's env vars together.

---

## Step 6 — Repo settings (2 minutes, in GitHub)

Under **Settings → Branches** on the repo:

- Delete the stale merged branches: `claude/woodworking-plans-business-plan-uvnx25`
  and `claude/woodworking-platform-strategy`.

Do **not** add branch protection. We're trunk-based by your decision — CI runs on
every push to `main` as a detector, and we fix forward. (Worth revisiting before
launch, when a broken `main` stops being free. It's logged.)

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Neon row red, "connection failed" | Non-pooled connection string, or a truncated paste | Re-copy with **pooled** enabled; check for `-pooler` in the host |
| Vercel build fails: "Missing required environment variables" | One of the three env vars wasn't saved | Add it in **Settings → Environment Variables**, then **Redeploy** |
| Clerk row red | Only one of the two keys is set | Both `pk_` and `sk_` are required — a half-configured Clerk deliberately does not count |
| Health check very slow on first hit | Neon cold start | Normal. Hit it twice. |
| `npm ci` fails in CI | `package-lock.json` out of sync with `package.json` | Run `npm install`, commit the lockfile |

Stuck anywhere? Tell me the step number and what you see — including the error
text — and I'll sort it.
