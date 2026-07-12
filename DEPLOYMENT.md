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
