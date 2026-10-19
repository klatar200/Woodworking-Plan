// show.mjs — print a published plan compactly (paths included) for reading.
//   node audit/plan-quality/scripts/show.mjs <slug> [...slug]
import { readFileSync } from 'node:fs';

for (const slug of process.argv.slice(2)) {
  const p = JSON.parse(readFileSync(`content/plans/${slug}.json`, 'utf8'));
  const imgSteps = new Set(p.steps.map((s) => s.image).filter(Boolean));
  console.log(`# ${p.slug} — ${p.title} [${p.category}] published=${p.published}`);
  console.log(`description: ${p.description}`);
  p.materials.forEach((m, i) => console.log(`materials[${i}]: ${m.name} | ${m.quantity} ${m.unit}${m.note ? ' | ' + m.note : ''}`));
  p.cutList.forEach((c, i) => console.log(`cutList[${i}]: ${c.part} | qty ${c.quantity} | ${c.thicknessIn} x ${c.widthIn} x ${c.lengthIn}${c.note ? ' | ' + c.note : ''}`));
  p.steps.forEach((s, i) => console.log(`steps[${i}] ${s.title}${s.image ? ' [img]' : ''}: ${s.body}`));
  const loose = p.images.filter((im) => !imgSteps.has(im.url));
  console.log(`images: ${p.images.length}, unattached: ${loose.length}`);
  console.log('');
}
