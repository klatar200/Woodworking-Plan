/** Split a verifier packet into per-slug chunk files of N plans each. */
import { readFileSync, writeFileSync } from 'node:fs';

const [src, prefix, per] = process.argv.slice(2);
const text = readFileSync(src, 'utf8');
const sections = text.split(/\n(?=## )/).filter((s) => s.startsWith('## '));
const n = Number(per || 5);
let i = 0;
for (let k = 0; k < sections.length; k += n) {
  i += 1;
  const chunk = sections.slice(k, k + n);
  writeFileSync(`${prefix}${i}.md`, chunk.join('\n'));
  console.log(
    `${prefix}${i}.md  ${chunk.length} plans  ${chunk.join('').length} chars  ${chunk
      .map((s) => s.slice(3).split(/\s/)[0])
      .join(' ')}`,
  );
}
