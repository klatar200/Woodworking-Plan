#!/bin/bash
# usage: commit-r2.sh <batch> — validate finished round-2 records of a batch, verdict, commit, push
cd /home/user/Woodworking-Plan
B=$1; S=$(node -e 'const l=require("./audit/plan-quality/round2/ledger.json");console.log(l.filter(e=>e.batch===process.argv[1]).map(e=>e.slug).join(" "))' $B)
keep=""; for s in $S; do f=audit/plan-quality/round2/plans/$s.json; node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1]));const ok=r.rubric==="R-2"&&r.reader&&r.reader.batch&&["R8","R9","R14"].every(k=>r.checks[k])&&!Object.values(r.checks).some(c=>["flagged","to-read"].includes(c.result));process.exit(ok?0:1)' $f 2>/dev/null && keep="$keep $s" || echo "NOT DONE: $s"; done
[ -z "$keep" ] && exit 0
node audit/plan-quality/scripts/verdict.mjs --write --dir audit/plan-quality/round2/plans $keep >/dev/null
git add $(for s in $keep; do echo audit/plan-quality/round2/plans/$s.json; done)
git commit -q -m "Plan-quality audit round 2: batch $B ($(echo $keep|wc -w) plans).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Jf7kaPFFUHjjoqoD8QhQXN"
git push -q origin HEAD:main HEAD:ccr-7d9f966e-pae78t 2>&1 | tail -1
node audit/plan-quality/scripts/verdict.mjs --dir audit/plan-quality/round2/plans $keep 2>/dev/null | sed -n '/^{/,$p' | tr -d '\n '; echo
