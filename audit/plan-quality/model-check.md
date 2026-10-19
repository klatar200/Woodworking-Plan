# Model check — Sonnet vs Opus readers (2026-10-19)

Keagan (Stage 5 Q4): "Stage 6 readers on Sonnet with Opus verifiers after a 10-plan check".
Same 10 unread plans (`scripts/pick-model-check.mjs`: 5 sweep-flagged, 5 clean, across categories),
same brief (`prompts/reader-R2.md`), rubric R-2. Sonnet wrote the records; Opus returned its scoring
as text only.

| Plan | Opus counted failures → verdict | Sonnet counted failures → verdict | Same verdict? |
|---|---|---|---|
| large-bread-board | none → Ship (R5 pass) | none → Ship (unverified) (R5 unknown) | class differs (Ship vs Ship-unverified) |
| lego-table | R10, R14 → Fix | R10, R11, R14 → Fix | yes |
| outdoor-bar-stool | none → Ship | none → Ship | yes |
| miter-saw-dust-hood | R14 → Fix | R14 → Fix | yes |
| kreg-precision-router-table-upgrade | R2, R8, R10, R14 → Fix | R2, R8, R10, R14 → Fix | yes (same four) |
| play-stand | R5, R6 → Fix | R5, R6, R10 (+R14 after correction) → Fix | yes |
| hot-cocoa-bar | none → Ship (unverified) | none → Ship (unverified) | yes |
| modern-outdoor-chair | R14 → Fix | R10, R14 → Fix | yes (one defect filed under R10 by Sonnet, R14 by Opus) |
| x-arbor-with-bench | none → Ship | none → Ship | yes |
| rolling-storage-cart | R3, R14 → Fix | R3, R14 → Fix | yes |

**Result:** verdict agreement 9/10 (the tenth is Ship vs Ship-unverified on one R5 judgment).
Sonnet missed no failure Opus found; it found two Opus passed (`lego-table` R11, `play-stand` R10),
so it errs strict, not lenient — no false Ship relative to Opus. Keagan's condition is met; Stage 6
uses Sonnet readers with fresh Opus verifiers on every Unpublish-level finding.

**What changed in the reader brief because of it:** Sonnet added an "inferred" `importDiffs` entry to
`play-stand` from step text; Kreg's own source says `1" x 4" x 4"`, so it was a plan error, not
import damage. The entry was removed (fidelity script re-run) and the brief now says never to edit
`importDiffs`/`importAffected` and to read Kreg's text with `kreg-source.mjs`. It also now says which
check a contradiction goes under (position → R10; count/size → R14(a)), the one place the two models
filed the same defect differently.

Tokens (sub-agent totals): Opus 238k, Sonnet 386k for the 10 plans — Sonnet used more tokens (it
opened more images) at a much lower price per token.
