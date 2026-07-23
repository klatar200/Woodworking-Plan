/**
 * Runtime step-body formatter — Sprint 46 (Workstream F).
 *
 * Step bodies in content/plans/*.json are authored as dense, blank-line-separated
 * paragraphs. Read on a phone at the bench they run together — "they read like a
 * notepad" (sprint brief). This turns a paragraph that is CLEARLY a sequence of
 * discrete actions into a bulleted action list, and bolds fastener sizes, WITHOUT
 * touching the JSON. It is a small deterministic parser over plain text + the
 * existing `**bold**` convention — NOT a markdown dependency (no new XSS surface,
 * per the brief).
 *
 * THE ONE RULE THAT MATTERS: fail soft. Any body that does not clearly match the
 * heuristics renders exactly as today — one `<p>` per paragraph. The formatter may
 * only ever ADD structure it is confident about; it must never garble the text.
 * Every branch below biases toward "leave it as a paragraph".
 *
 * The output is a list of blocks with `**…**` already injected for fastener sizes,
 * so the whole transform is a pure string→structure function that the unit tests
 * (tests/step-format.test.ts) exercise directly. The component (Prose/StepProse in
 * src/components/prose.tsx) only turns blocks into elements and `**…**` into
 * <strong>, sharing the SAME inline renderer the plain descriptions use.
 */

export type StepBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

/**
 * Leading words that mark a sentence as an ACTION (an instruction), as opposed to a
 * reasoning / "why this matters" clause. Deliberately a closed vocabulary of common
 * woodworking imperatives + sequence connectors: an unrecognised lead word is treated
 * as prose, which biases the whole thing toward the safe "leave it a paragraph" path.
 * A word not on this list can only ever UNDER-format (miss a list), never garble.
 */
const ACTION_LEADS = new Set<string>([
  // sequence connectors
  'then', 'next', 'also', 'first', 'finally', 'now', 'once',
  // cutting / milling
  'cut', 'rip', 'crosscut', 'miter', 'notch', 'bevel', 'chamfer', 'plane',
  'joint', 'trim', 'bore', 'drill', 'predrill', 'countersink', 'rout', 'ease',
  // assembly
  'attach', 'screw', 'glue', 'assemble', 'join', 'fasten', 'nail', 'pin',
  'clamp', 'stagger', 'seat', 'insert', 'slide', 'cap', 'tap', 'hang',
  // layout / prep
  'mark', 'measure', 'lay', 'position', 'place', 'center', 'align', 'square',
  'set', 'add', 'build', 'space', 'line', 'flip', 'stand', 'repeat',
  // finishing
  'sand', 'fill', 'round', 'apply', 'wipe', 'seal', 'stain', 'prime', 'paint',
  'wax', 'oil', 'clean', 'flatten', 'spread',
  // checks / soft imperatives that still open an action line
  'check', 'confirm', 'test', 'adjust', 'take', 'leave', 'remove', 'work',
  'predrill', 'dry-fit', 'level', 'tuck', 'pull', 'start', 'finish',
]);

/**
 * Split a paragraph into sentences. A boundary is `.`/`!`/`?` followed by whitespace
 * and an uppercase letter, a quote, or a digit (a new sentence) — or end of string.
 *
 * Woodworking dimensions are tape-measure FRACTIONS, never decimals (design brief §5),
 * so there are no in-token periods to trip over. Colons introduce inline lists
 * ("crosscut the carcass: the top at 88\"…") and are deliberately NOT split on — that
 * clause is one action.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    buf += c;
    if (c === '.' || c === '!' || c === '?') {
      const rest = text.slice(i + 1);
      if (/^\s+["“']?[A-Z0-9]/.test(rest) || /^\s*$/.test(rest)) {
        out.push(buf.trim());
        buf = '';
      }
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function leadWord(sentence: string): string {
  const m = sentence.match(/^["“']?([A-Za-z-]+)/);
  return m?.[1]?.toLowerCase() ?? '';
}

function isAction(sentence: string): boolean {
  return ACTION_LEADS.has(leadWord(sentence));
}

/**
 * Bold fastener SIZES only — the "what screw / what nail" a builder scans a step for.
 * A `#`-gauge (`#8`, `#8 x 1-1/4"`) or an inch token immediately followed by a
 * fastener noun (`1-1/4" pocket hole screws`). Deliberately narrow: bolding every cut
 * dimension turns a cut-list step into a wall of bold, so only fastener-adjacent sizes
 * qualify. If the author already used `**…**`, their emphasis wins and this is skipped.
 */
export function boldFasteners(text: string): string {
  if (text.includes('**')) return text;
  const inch = '\\d+(?:-\\d+\\/\\d+)?(?:\\/\\d+)?"';
  const fastener =
    '(?:pocket[- ]hole |finish |brad |deck |construction |wood |lag |trim |exterior |cabinet )*' +
    '(?:screws?|nails?|brads?|staples?|bolts?|lag screws?)';
  const re = new RegExp(`(#\\d+(?:\\s*[x×]\\s*${inch})?|${inch}\\s+${fastener})`, 'g');
  return text.replace(re, (m) => `**${m}**`);
}

/**
 * One paragraph → one block. A paragraph becomes a bulleted action list ONLY when it
 * is genuinely a dense sequence: at least THREE sentences and at least TWO of them
 * opening with an action verb. A reasoning sentence attaches to the action line above
 * it, so the "why" stays welded to the step it explains. Everything else — short
 * paragraphs, narrative, a single action + its reason — stays a `<p>`, unchanged.
 */
function formatParagraph(paragraph: string): StepBlock {
  const p = paragraph.trim();
  if (!p) return { kind: 'paragraph', text: paragraph };

  const sentences = splitSentences(p);
  const actionCount = sentences.filter(isAction).length;

  if (sentences.length >= 3 && actionCount >= 2) {
    const items: string[] = [];
    for (const s of sentences) {
      if (isAction(s) || items.length === 0) {
        items.push(s);
      } else {
        const prev = items[items.length - 1] ?? '';
        items[items.length - 1] = `${prev} ${s}`;
      }
    }
    // Two real bullets is the minimum that reads as a list rather than a lone item
    // with a dangling reason — below that, keep the paragraph.
    if (items.length >= 2) {
      return { kind: 'list', items: items.map(boldFasteners) };
    }
  }

  return { kind: 'paragraph', text: boldFasteners(p) };
}

/**
 * Format an authored step body into render-ready blocks. Pure and total: on any
 * unexpected input it degrades to the plain paragraph split the app has always done,
 * so a caller can render the result without a guard.
 */
export function formatStepBody(text: string): StepBlock[] {
  try {
    const paragraphs = text.split(/\n\n+/);
    return paragraphs.map(formatParagraph);
  } catch {
    // Never garble: fall all the way back to today's behaviour.
    return text.split(/\n\n+/).map((t) => ({ kind: 'paragraph', text: t }));
  }
}
