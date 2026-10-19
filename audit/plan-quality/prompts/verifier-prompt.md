Your job is to REFUTE audit findings. Working dir: /home/user/Woodworking-Plan. Read `docs/PLAN_QUALITY_AUDIT.md` §3, §4, §6 (rubric R-2) and §9 first.

For each finding listed below: open `audit/plan-quality/plans/<slug>.json`, take the check's evidence (path, quote, arithmetic, reason), then open `content/plans/<slug>.json`. Confirm each quote is verbatim at that path, redo any arithmetic, check whether §3's importer rule explains it (measurements are judged on Kreg-corrected sizes in the record's `importDiffs[].correctRow`), and search the WHOLE plan for anything that resolves it (the part made/installed in another step, the item in materials under another name, the size in the description, an image). You may open plan images from their R2 URLs (`curl -s -o audit/plan-quality/.img-cache/<file> <url>`, reuse cached files) to look for a resolution. Also confirm the stated fail level is right under R-2 (e.g. R14 Unpublish only when the steps end without making or installing a part the piece cannot be used without).

Return per finding: `upheld` or `refuted`, with one-line evidence; if upheld but the level or confidence is wrong, say which it should be. Add no new findings. Judge nothing outside the finding. Do not run git or edit any file.

Finally output a JSON block in exactly this shape (only plans listed below):
{"run": "<RUN>", "plans": {"<slug>": {"upheld": ["R14"], "refuted": [], "confidence": {"R10": "likely"}, "notes": {"R14": "<one line>"}}}}
(`confidence` only for a downgrade; for a refuted finding add `"refutedTo": {"<id>": {"result": "pass"|"unknown", "reason": "<one line>"}}`; for a wrong level add `"level": {"<id>": "Fix"}`.)
