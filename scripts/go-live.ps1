# go-live.ps1 — one-command go-live for the Kreg catalog.
#
# ONE confirmation ("PROD"), then everything is automated:
#   1. sanity : clean tree, on a branch (not main)
#   2. gate   : validate-plans / tsc / vitest / eslint / build        (-SkipGate to skip)
#   3. preview: prints the PRODUCTION DB host + plan count (read-only)
#   4. CONFIRM: you type PROD once — it lists exactly what will happen
#   5. publish: flips @/lib/seo SITE_INDEXABLE -> true and commits      (-NoPublish to skip)
#   6. ship   : merge the branch into main and push (deploys the code)  (-SkipMerge to skip)
#   7. LIVE   : migrate + reset + seed the PRODUCTION Neon branch
#
# Photos need no step: R2 is one bucket shared by dev and prod; every plan already
# points at it. Seeding production is what makes the plans live; the publish flip is
# what makes them crawlable. Private routes (print/build/boards/dev/offline/shopping
# -list) stay noindex regardless.
#
# ── ONE-TIME PREP ────────────────────────────────────────────────────────────────────
#   Create  .env.production.local  in the repo root with the PRODUCTION Neon branch:
#       DATABASE_URL="postgresql://...PRODUCTION-pooler...neon.tech/neondb?sslmode=require"
#       DIRECT_URL="postgresql://...PRODUCTION-direct...neon.tech/neondb?sslmode=require"
#   (Neon -> project -> Branches -> production -> Connection Details. Gitignored via
#    .env.* ; your dev .env.local is NEVER touched by this script.)
#
# ── RUN ──────────────────────────────────────────────────────────────────────────────
#   .\scripts\go-live.ps1                      # full go-live (gate + publish + ship + seed)
#   .\scripts\go-live.ps1 -SkipGate            # gate already run this session
#   .\scripts\go-live.ps1 -SkipGate -SkipMerge # only (re-)seed production, no publish
#   .\scripts\go-live.ps1 -NoPublish           # go live but stay noindex for now

param([switch]$SkipGate, [switch]$SkipMerge, [switch]$NoPublish)

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')   # repo root (this script lives in scripts/)

# Native commands don't stop the script on non-zero exit by themselves — run every one
# through this so a red gate or failed merge can't fall through to the production seed.
function Exec([scriptblock]$block) {
  & $block
  if ($LASTEXITCODE -ne 0) { throw "FAILED (exit $LASTEXITCODE): $($block.ToString().Trim())" }
}
function Step($m) { Write-Host "`n== $m ==" -ForegroundColor Cyan }

# 1) sanity ---------------------------------------------------------------------------
Step "Sanity check"
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if (git status --porcelain) { throw "Working tree is not clean — commit or stash first, then re-run." }
if ($branch -eq 'main') { throw "You're on main. Run this from the swap branch (e.g. kreg-swap)." }
Write-Host "branch: $branch — clean." -ForegroundColor Green

# 2) gate -----------------------------------------------------------------------------
if (-not $SkipGate) {
  Step "Gate: validate-plans / tsc / vitest / eslint / build"
  Exec { node scripts/validate-plans.mjs }
  Exec { npx tsc --noEmit }
  Exec { npx vitest run }
  Exec { npx eslint . }
  Exec { npm run build }
  Write-Host "gate green." -ForegroundColor Green
} else { Write-Host "`n(gate skipped)" -ForegroundColor DarkGray }

# 3) production preview (read-only) ---------------------------------------------------
Step "Production target"
if (-not (Test-Path .env.production.local)) {
  throw ".env.production.local not found. Create it with the PRODUCTION Neon branch DATABASE_URL + DIRECT_URL (see the one-time prep at the top of this file), then re-run."
}
Exec { npx dotenv -e .env.production.local -- node scripts/reset-plans-db.mjs }   # dry-run: host + plan count

# 4) ONE confirmation -----------------------------------------------------------------
$willPublish = (-not $NoPublish) -and (-not $SkipMerge)
$actions = @()
if (-not $SkipMerge) { $actions += "  - merge '$branch' into main and DEPLOY the code" }
if ($willPublish)    { $actions += "  - make the site PUBLICLY INDEXABLE (lift noindex on the public pages)" }
$actions += "  - RESET + RESEED the PRODUCTION catalog at the host shown above"
Write-Host "`nThis will:" -ForegroundColor Yellow
$actions | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
$confirm = Read-Host "`nType PROD to go live"
if ($confirm -ne 'PROD') { throw "Aborted — nothing changed." }

# 5) publish: flip the indexing flag and commit (deploys with the merge) --------------
if ($willPublish) {
  Step "Enable indexing"
  $seo = (Resolve-Path 'src/lib/seo.ts').Path
  $c = [System.IO.File]::ReadAllText($seo)
  if ($c -match 'SITE_INDEXABLE = false') {
    [System.IO.File]::WriteAllText($seo, ($c -replace 'SITE_INDEXABLE = false', 'SITE_INDEXABLE = true'))
    Exec { git add src/lib/seo.ts }
    Exec { git commit -m "Public launch: allow search-engine indexing" }
    Write-Host "indexing enabled + committed." -ForegroundColor Green
  } else { Write-Host "indexing already enabled — skipping flip." -ForegroundColor DarkGray }
}

# 6) ship to main ---------------------------------------------------------------------
if (-not $SkipMerge) {
  Step "Ship: merge $branch -> main and push (triggers the production deploy)"
  Exec { git checkout main }
  Exec { git pull --ff-only }
  Exec { git merge --no-ff $branch -m "Go live: Kreg catalog" }
  Exec { git push }
  Exec { git checkout $branch }
  Write-Host "main updated and pushed." -ForegroundColor Green
} else { Write-Host "`n(merge skipped — any indexing flip stays local until you merge)" -ForegroundColor DarkGray }

# 7) seed PRODUCTION ------------------------------------------------------------------
Step "Production seed (schema -> reset -> seed)"
Exec { npx dotenv -e .env.production.local -- prisma migrate deploy }
Exec { npx dotenv -e .env.production.local -- node scripts/reset-plans-db.mjs --yes }
Exec { npx dotenv -e .env.production.local -- tsx prisma/seed.ts }

Step "LIVE — the Kreg catalog is up"
Write-Host "Catalog seeded to production; photos already on R2." -ForegroundColor Green
if ($willPublish) { Write-Host "Site is now publicly indexable (private routes stay noindex)." -ForegroundColor Green }
Write-Host "Verify your production URL (or /api/health)." -ForegroundColor Green
Write-Host "If the seed errored AFTER the reset, re-run just:  npx dotenv -e .env.production.local -- tsx prisma/seed.ts" -ForegroundColor DarkYellow
