// kreg-source.mjs — load the Kreg scrape the catalog was imported from, straight from git.
//
// The dump (`kreg-plans.json`) is not in the working tree: it was committed in 5ac40db,
// used by the import commit efb0c79 "Swap catalog to Kreg import", and deleted in a36c48c.
// Reading the blob at efb0c79 gives the exact input the importer saw, with no file copy.
import { execFileSync } from 'node:child_process';

export const SOURCE_REV = 'efb0c79';

export function loadKregSource() {
  const raw = execFileSync('git', ['show', `${SOURCE_REV}:kreg-plans.json`], { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' });
  return JSON.parse(raw);
}

// Run directly: print the dump's shape.
if (process.argv[1] && process.argv[1].endsWith('kreg-source.mjs')) {
  const d = loadKregSource();
  console.log(`entries: ${d.length}`);
  const keys = {};
  for (const e of d) for (const k of Object.keys(e)) keys[k] = (keys[k] || 0) + 1;
  console.log(keys);
  const slug = process.argv[2];
  if (slug) console.log(JSON.stringify(d.find((e) => e.slug === slug), null, 1));
}
