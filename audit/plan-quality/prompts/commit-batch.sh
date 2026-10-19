#!/bin/bash
# usage: commit-batch.sh <batch> <slug...> — validate records, commit, push
set -e
cd /home/user/Woodworking-Plan
B=$1; shift; F=""
for s in "$@"; do node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1]));if(r.rubric!=="R-2"||!r.reader)throw new Error("not read: "+process.argv[1])' audit/plan-quality/plans/$s.json; F="$F audit/plan-quality/plans/$s.json"; done
node audit/plan-quality/scripts/verdict.mjs --write "$@" >/dev/null
node audit/plan-quality/scripts/tally.mjs --write >/dev/null
git add $F audit/plan-quality/ledger.json
git commit -q -m "Plan-quality audit: Stage 6 batch $B ($# plans).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Jf7kaPFFUHjjoqoD8QhQXN"
git push -q origin ccr-7d9f966e-pae78t 2>&1 | tail -1
node audit/plan-quality/scripts/verdict.mjs "$@" 2>/dev/null | sed -n '/^{/,$p' | tr -d '\n '; echo
