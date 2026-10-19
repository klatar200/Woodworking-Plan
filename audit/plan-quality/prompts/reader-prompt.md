You are auditing published woodworking plans for followability. Working dir: /home/user/Woodworking-Plan.

First read `docs/PLAN_QUALITY_AUDIT.md` §1–§6 and §9 — they bind you, especially §3 (the importer drops fractions and defaults quantities; such defects are `cause: "import"`, not plan failures) and §4 (evidence rules: quote it or drop it; show arithmetic; absence must be searched and the search stated; never invent a value; only claim image content you opened; `unknown` is a valid answer). The rubric is **R-2** (§6). Measurements are judged on Kreg's corrected sizes: each cut row's `importDiffs[].correctRow` in the record replaces the live value.

Your only questions are "does the plan make sense?" and "are the measurements good?" (§1). Do not rewrite steps, invent values, or judge style.

For each slug: read `content/plans/<slug>.json` and its record `<RECORD_DIR>/<slug>.json` (written by the scripted sweep). Then:
- Resolve every `flagged` / `to-read` check to pass | fail | unknown | n/a: confirm or reject each flagged candidate with evidence. Sweep `pass`/`fail` results on R1–R6 stand unless you quote evidence against them (then add `"readerNote"`).
- Score R8, R9, R14 yourself, and R10 under the widened R-2 text (every position the builder must set, including ones the text never mentions).
- R1 fail level per R-2: Fix if the build can be completed without the missing content, else Unpublish. R14 fail level: Unpublish only when the steps end without making or installing a part the piece cannot be used without (drawers, doors, top, seat), else Fix. Don't double-report what R2/R3/R6 already record.
- Problems in sense or measurement that fit no check go in top-level `gaps: [{path, quote, what}]`.
- Set top-level `humanReview: "<reason>"` only when a check can only be settled with knowledge outside §9 (R9 never counts).

Each failure: `{result:"fail", level:"Fix"|"Unpublish", confidence:"certain"|"likely", cause:"plan"|"import", evidence:[{path, quote(verbatim ≤200 chars)}], arithmetic?(every input quoted), reason}`. `unknown` needs `reason`. `pass` needs a short `reason` or `search`.

Images: open one only for a step the sweep flagged (R1/R10/R11 candidates), or when needed to settle an R10/R14 position or count. Fetch from the R2 URL in the plan JSON with `curl -s -o audit/plan-quality/.img-cache/<file> <url>` (gitignored; reuse a cached file if present), then Read it. Budget ~40k tokens per plan; over that, record `unknown` with the reason and move on.

Write each record back (2-space JSON, valid) with: `"rubric": "R-2"`, `"reader": {"batch": "<BATCH>", "imagesViewed": [<urls or files>]}`, `"measurementsScoredOn": "kreg-corrected"`. Do NOT set `verdict` (a script computes it). Edit nothing else; do not run git.

Return ONLY, per plan, one line: `slug | failed check ids with level/confidence | unknown ids | humanReview y/n`.

Helper scripts/temp files: other readers run in parallel, so put ANY helper or temp file only under `/tmp/claude-0/-home-user-Woodworking-Plan/8ea0321b-b68b-5b45-99f1-6d510073c7a3/scratchpad/<BATCH>/` (create it). Never write elsewhere in the scratchpad.

R14(c) consumables (orchestrator ruling 2026-10-19, pending Keagan): glue and other consumables (glue, tape, sandpaper, wood filler, finish) missing from materials do NOT fail R14. Record each as a `gaps` entry with `"kind": "consumable"` (path + quote + what). R14(c) fails only for hardware/components (hinges, glides, slides, pulls, brackets, staples, anchors, magnets, sheet plastic, fabric/foam etc.).
