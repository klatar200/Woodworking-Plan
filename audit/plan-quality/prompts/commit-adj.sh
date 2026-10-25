#!/bin/bash
# usage: commit-adj.sh <batch> <slugs...> — recompute round-1 verdicts after adjudication, commit, push
cd /home/user/Woodworking-Plan
B=$1; shift; F=""
for s in "$@"; do node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1]));if(!r.adjudication)throw new Error("no adjudication: "+process.argv[1])' audit/plan-quality/plans/$s.json || exit 1; F="$F audit/plan-quality/plans/$s.json"; done
node audit/plan-quality/scripts/verdict.mjs --write "$@" | grep -- '->'
node audit/plan-quality/scripts/tally.mjs --write >/dev/null
git add $F audit/plan-quality/ledger.json
git commit -q -m "Plan-quality audit round 2: adjudication $B ($# plans).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Jf7kaPFFUHjjoqoD8QhQXN"
git push -q origin HEAD:main HEAD:ccr-7d9f966e-pae78t 2>&1 | tail -1
