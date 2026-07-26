import { TEMPLATES } from '@/lib/board-designer/templates';
import { cloneConfig } from '@/lib/board-designer/history';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import { btnGhost } from '@/lib/ui';

export function TemplatePicker({
  onLoad,
}: {
  onLoad: (config: BoardDesignConfig) => void;
}) {
  return (
    <section className="rounded-[0.75rem] border border-border bg-surface p-[1rem]">
      <h2 className="!mt-0 text-[1.125rem]">Templates</h2>
      <div className="flex flex-wrap gap-[0.5rem]">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className={btnGhost}
            onClick={() => onLoad(cloneConfig(template.config))}
          >
            {template.config.name}
          </button>
        ))}
      </div>
    </section>
  );
}
