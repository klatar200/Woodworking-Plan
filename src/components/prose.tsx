/**
 * Renders authored plan/step copy — descriptions and step bodies.
 *
 * Content authors write two conventions in `content/plans/*.json` (all 24 plans use
 * both): blank-line-separated paragraphs, and `**bold**` for emphasis on the one
 * detail that changes the outcome (a depth, an orientation, a warning). Before this
 * component existed, every render site (`plans/[slug]/page.tsx` description and step
 * body, `plans/[slug]/print/page.tsx` step body) did a raw `text.split('\n\n')` with
 * no markdown step at all — so `**1/8" of walnut remains**` rendered as the literal
 * asterisks, visible to every reader of every plan. `.prose strong` in globals.css
 * already existed for this and had nothing driving it.
 *
 * Deliberately NOT a full markdown renderer — no links, lists, or headings. Content
 * has never used anything beyond bold; adding a real markdown dependency (and its
 * XSS-sanitization surface) for one inline rule would be solving a problem nobody has.
 */
function renderInline(text: string, keyPrefix: string) {
  // Split on **bold** runs, keeping the delimiters so we know which pieces to wrap.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    // Plain strings don't need a wrapper — React only requires `key` on elements,
    // not on bare text nodes in an array. Empty strings show up between adjacent
    // ** matches; return null rather than render an empty fragment for those.
    return part || null;
  });
}

export function Prose({ text, className = 'prose' }: { text: string; className?: string }) {
  const paragraphs = text.split('\n\n');

  return (
    <div className={className}>
      {paragraphs.map((para, i) => (
        <p key={i}>{renderInline(para, `p${i}`)}</p>
      ))}
    </div>
  );
}
