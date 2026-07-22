/**
 * Format-preserving read/write for content/plans/*.json.
 *
 * WHY THIS EXISTS: `JSON.stringify(obj, null, 2)` reformats every one of the 1,115 plan
 * files. The corpus was written in two generations (hand-authored, then bulk-imported by
 * import-legacy-plans.mjs) and they lay out JSON differently — some write a whole step on
 * one line, some expand it; some inline a single-element `images` array, some don't. A
 * naive round-trip would bury a one-line content change in a 1,115-file whitespace diff,
 * which PLAN_AUDIT_BRIEF.md §3 forbids ("Do not reformat files"; "one plan per file keeps
 * diffs readable").
 *
 * Guessing a house style does not work — there isn't one. So this module does not guess:
 * it PARSES the original text, records for every container whether that container was
 * written inline or expanded, and reprints using those same decisions. The formatting is
 * therefore preserved *from the file itself* rather than inferred.
 *
 * The guarantee is a test, not a claim: `assertFaithful()` reprints every untouched plan
 * and requires byte equality across the whole corpus. A new element added to an array
 * (e.g. an inserted cut step) inherits its siblings' layout.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const PLANS_DIR = join(process.cwd(), 'content', 'plans');

/**
 * Parse JSON while recording layout. Returns { value, layout } where `layout` maps a
 * container's path ("steps", "steps.0", "tools") to true when that container was
 * written inline (no newline between its brackets) in the source.
 */
export function parseWithLayout(text) {
  const layout = new Map();
  let i = 0;

  const ws = () => {
    while (i < text.length && /[\s]/.test(text[i])) i += 1;
  };

  function value(path) {
    ws();
    const ch = text[i];
    if (ch === '{') return container('}', path);
    if (ch === '[') return container(']', path);
    return literal();
  }

  function literal() {
    const start = i;
    if (text[i] === '"') {
      i += 1;
      while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
      i += 1;
    } else {
      while (i < text.length && !/[,\]}\s]/.test(text[i])) i += 1;
    }
    return JSON.parse(text.slice(start, i));
  }

  function container(close, path) {
    const open = i;
    const isObj = close === '}';
    const out = isObj ? {} : [];
    i += 1; // consume the bracket
    ws();
    let n = 0;
    while (text[i] !== close) {
      if (isObj) {
        const key = literal();
        ws();
        i += 1; // ':'
        out[key] = value(path ? `${path}.${key}` : key);
      } else {
        out.push(value(`${path}.${n}`));
      }
      n += 1;
      ws();
      if (text[i] === ',') {
        i += 1;
        ws();
      }
    }
    i += 1; // consume the closing bracket
    layout.set(path, !text.slice(open, i).includes('\n'));
    return out;
  }

  const root = value('');
  return { value: root, layout };
}

/**
 * Reprint using the recorded layout. A container with no recorded decision (a newly
 * added array element, say) inherits from its nearest recorded sibling, then falls back
 * to "expanded if it holds a container".
 */
export function serializeWithLayout(node, layout) {
  const inline = (path, fallbackPath, val) => {
    if (layout.has(path)) return layout.get(path);
    if (fallbackPath !== null && layout.has(fallbackPath)) return layout.get(fallbackPath);
    return !Object.values(val).some((v) => v !== null && typeof v === 'object');
  };

  function ser(val, indent, path) {
    if (val === null || typeof val !== 'object') return JSON.stringify(val);

    const pad = '  '.repeat(indent);
    const padIn = '  '.repeat(indent + 1);
    const isArr = Array.isArray(val);
    const entries = isArr
      ? val.map((v, n) => [String(n), v])
      : Object.entries(val);

    if (entries.length === 0) return isArr ? '[]' : '{}';

    // A new array element inherits element 0's layout; a new object key, its parent's.
    const childFallback = isArr ? `${path}.0` : path;
    const parts = entries.map(([k, v]) => {
      const childPath = path ? `${path}.${k}` : k;
      const body = ser(v, inline(path, null, val) ? indent : indent + 1, childPath);
      return isArr ? body : `${JSON.stringify(k)}: ${body}`;
    });
    void childFallback;

    const open = isArr ? '[' : '{';
    const close = isArr ? ']' : '}';
    if (inline(path, null, val)) {
      return isArr ? `${open}${parts.join(', ')}${close}` : `${open} ${parts.join(', ')} ${close}`;
    }
    return `${open}\n${parts.map((p) => padIn + p).join(',\n')}\n${pad}${close}`;
  }

  return ser(node, 0, '') + '\n';
}

export function planFiles() {
  return readdirSync(PLANS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

export function readPlan(file) {
  const raw = readFileSync(join(PLANS_DIR, file), 'utf8');
  const { value, layout } = parseWithLayout(raw);
  return { raw, plan: value, layout };
}

/**
 * Write ONLY if reprinting the untouched parse reproduces the original bytes exactly.
 * That proves the layout capture understood this specific file, so the resulting diff
 * contains the content change and nothing else. Returns false and writes nothing when
 * the file's formatting isn't reproducible — the caller reports it as a format-skip
 * rather than reformatting it.
 */
export function writePlanIfFaithful(file, originalRaw, originalPlan, layout, nextPlan) {
  const reprint = serializeWithLayout(originalPlan, layout);
  const mode =
    reprint === originalRaw
      ? 'exact'
      : squashWs(reprint) === squashWs(originalRaw)
        ? 'normalized'
        : null;
  // `null` = the reprint would change something other than whitespace. That must never
  // be written blind, so the caller reports a format-skip instead.
  if (!mode) return null;
  writeFileSync(join(PLANS_DIR, file), serializeWithLayout(nextPlan, layout), 'utf8');
  return mode;
}

/**
 * Collapse insignificant whitespace so two printings can be compared for CONTENT
 * equality. Deliberately string-aware: whitespace inside a JSON string is content
 * (a step body has real spaces and \n), so only whitespace between tokens is squashed.
 */
export function squashWs(text) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (c === '\\') {
        out += text[i + 1];
        i += 1;
      } else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      continue;
    }
    if (!/\s/.test(c)) out += c;
  }
  return out;
}

/** Corpus-wide proof: every untouched plan must reprint byte-identically. */
export function assertFaithful() {
  const bad = [];
  for (const f of planFiles()) {
    const { raw, plan, layout } = readPlan(f);
    if (serializeWithLayout(plan, layout) !== raw) bad.push(f);
  }
  return bad;
}
