import { Check } from 'lucide-react';
import { BoardBar } from '@/components/board-bar';
import {
  costTierSymbol,
  difficultyLabel,
  formatInches,
  formatTimeRange,
} from '@/lib/format';
import { DEFAULT_OPTIONS, type BoardGroup } from '@/lib/cut-optimizer';

/**
 * The landing "plan panel" — the depth card in the hero and the "what a plan looks like"
 * section (QOL-M redesign, 2026-07-20, matching mockups/qol-m/landing.html).
 *
 * It is the whole point of the page made concrete: NOT a photo and a paragraph, but the
 * structured thing — a real cut list on the left and the **real board-buying plan** on the
 * right, drawn with the SAME `BoardBar` + `optimize()` the plan/boards pages use (passed in
 * as `groups`/`boards` so this component does no math and the two views can't drift).
 *
 * Everything here is REAL data for the chosen plan — no fabricated numbers. The caller picks
 * plans whose optimizer result is clean (no impossible part), so the board count is honest.
 */
export function LandingPlanPanel({
  plan,
  groups,
  boards,
  rotate = false,
}: {
  plan: {
    category: { name: string };
    title: string;
    difficulty: number;
    costTier: Parameters<typeof costTierSymbol>[0];
    timeMinMinutes: number;
    timeMaxMinutes: number;
    cutList: Array<{
      id: string;
      part: string;
      quantity: number;
      thicknessIn: number;
      widthIn: number;
      lengthIn: number;
    }>;
    tools: Array<{ essential: boolean; tool: { name: string } }>;
  };
  groups: BoardGroup[];
  boards: number;
  /** Hero panel sits at a slight angle and straightens on hover; the inline one stays flat. */
  rotate?: boolean;
}) {
  const chip =
    'inline-flex items-center text-[0.75rem] border border-border rounded-[999px] px-[0.6rem] py-[0.18rem] text-muted whitespace-nowrap';
  const chipEssential =
    'inline-flex items-center gap-[0.2rem] text-[0.75rem] border border-accent-tint-border rounded-[999px] px-[0.6rem] py-[0.18rem] bg-accent-tint text-accent-fg font-semibold whitespace-nowrap';

  const essential = plan.tools.filter((t) => t.essential).slice(0, 2);
  const optional = plan.tools.filter((t) => !t.essential).slice(0, 2);
  // A few real boards from the optimizer, enough to read as a plan without overflowing.
  const bars = groups
    .flatMap((g) => g.boards.map((b) => ({ board: b, ripped: g.ripsPerBoard > 1 })))
    .slice(0, 3);
  const stockFt = DEFAULT_OPTIONS.stockLengthIn / 12;

  return (
    <div
      className={`landing-panel rounded-[0.85rem] overflow-hidden ${
        rotate
          ? '-rotate-[1.6deg] transition-transform duration-300 hover:rotate-0 motion-reduce:rotate-0 motion-reduce:transition-none'
          : ''
      }`}
    >
      <div className="p-[1rem_1.15rem] border-b border-border">
        <span className="text-[0.7rem] uppercase tracking-[0.07em] text-muted">
          {plan.category.name}
        </span>
        <h3 className="font-display text-[1.18rem] font-semibold mt-[0.25rem] mb-[0.55rem] normal-case tracking-normal text-fg">
          {plan.title}
        </h3>
        <div className="flex flex-wrap gap-[0.35rem]">
          <span className={chip}>{difficultyLabel(plan.difficulty)}</span>
          <span className={chip}>{costTierSymbol(plan.costTier)}</span>
          <span className={chip}>
            {formatTimeRange(plan.timeMinMinutes, plan.timeMaxMinutes)}
          </span>
        </div>
        {essential.length + optional.length > 0 ? (
          <div className="flex flex-wrap gap-[0.35rem] mt-[0.5rem]">
            {essential.map((t) => (
              <span key={t.tool.name} className={chipEssential}>
                <Check size={12} aria-hidden="true" /> {t.tool.name}
              </span>
            ))}
            {optional.map((t) => (
              <span key={t.tool.name} className={chip}>
                {t.tool.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2">
        <div className="p-[0.95rem_1.15rem]">
          <div className="text-[0.7rem] uppercase tracking-[0.07em] text-muted font-semibold mb-[0.5rem]">
            Cut list
          </div>
          <table className="w-full border-collapse text-[0.82rem]">
            <tbody>
              {plan.cutList.slice(0, 4).map((item) => (
                <tr key={item.id}>
                  <td className="py-[0.22rem] border-b border-border">
                    {item.part} ×{item.quantity}
                  </td>
                  <td className="py-[0.22rem] border-b border-border text-right text-muted tabular-nums">
                    {formatInches(item.thicknessIn)} × {formatInches(item.widthIn)} ×{' '}
                    {formatInches(item.lengthIn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-[0.95rem_1.15rem] border-l border-border">
          <div className="text-[0.7rem] uppercase tracking-[0.07em] text-muted font-semibold mb-[0.5rem]">
            Board-buying plan
          </div>
          <div className="flex flex-col gap-[0.4rem]">
            {bars.map(({ board, ripped }, i) => (
              <BoardBar key={i} board={board} number={i + 1} ripped={ripped} />
            ))}
          </div>
          <p className="mt-[0.5rem] mb-0 text-[0.78rem] text-muted">
            Buy <strong>{boards}</strong> {boards === 1 ? 'board' : 'boards'} at {stockFt} ft
            &mdash; kerf included.
          </p>
        </div>
      </div>
    </div>
  );
}
