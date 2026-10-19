You are applying a rubric ruling to existing audit records. Working dir: /home/user/Woodworking-Plan. Read `docs/PLAN_QUALITY_AUDIT.md` §4 and §6 (R14 row) first.

Ruling (Keagan 2026-10-19, DECISIONS_LOG): glue and other consumables (glue, tape, sandpaper, wood filler, finish/stain/paint/sealer, caulk) used in steps but missing from materials do NOT fail R14(c). They are recorded in top-level `gaps` as `{ "kind": "consumable", "path", "quote", "what" }`. R14 fails only on (a) count/size mismatches and numbers that don't add up, (b) parts made but never installed, (c) hardware/components not in materials (hinges, slides, pulls, brackets, staples, anchors, magnets, fabric, foam, sheet plastic…), (d) the steps not reaching the finished piece.

For each slug below, open `audit/plan-quality/plans/<slug>.json` (and `content/plans/<slug>.json` only if needed to judge). Look ONLY at `checks.R14`:
- If it contains no consumable element: leave the record untouched.
- Otherwise: move each consumable element to `gaps` (kind consumable, with its path + verbatim quote). Keep every non-consumable element in R14 (evidence + reason rewritten to only those). If nothing non-consumable remains, set R14 to `{ "result": "pass", "reason": "Only consumables were missing (moved to gaps per 2026-10-19 ruling)", "previous": <old R14> }`. If R14 stays a fail, keep its level/confidence unless they were driven only by the removed consumable part (then fix them and say why in `rescoreNote`). If R14 becomes pass and `verifier.upheld` contains "R14", remove "R14" from `verifier.upheld`.
- Add `"consumableCleanup": "2026-10-19"` at top level of every record you changed. Do not touch `verdict` or any other check. Do not run git. Put helper/temp files only under /tmp/claude-0/-home-user-Woodworking-Plan/8ea0321b-b68b-5b45-99f1-6d510073c7a3/scratchpad/<BATCH>/.

Write records back as valid 2-space JSON. Return ONLY one line per CHANGED plan: `slug | R14 fail→fail|pass | consumables moved`.
