/**
 * @vitest-environment jsdom
 *
 * Sprint 81 — the designer shell never sends a design the server would reject, never nests a form,
 * keeps unsaved work for the life of the tab, and warns before the tab is left with it.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesignerShell } from '@/components/designer/designer-shell';
import { draftKey } from '@/lib/board-designer/draft-store';
import { parseConfig } from '@/lib/board-designer/serialize';
import { getTemplate } from '@/lib/board-designer/templates';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const noop = async () => {};

beforeEach(() => {
  // The shell's undo/redo shortcut reads matchMedia; jsdom has none.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
  window.sessionStorage.clear();
});

afterEach(() => cleanup());

const checker = (): BoardDesignConfig => getTemplate('checkerboard')!.config;
const parsed = (config: BoardDesignConfig): BoardDesignConfig => {
  const result = parseConfig(config);
  if (!result.ok) throw new Error(result.error);
  return result.config;
};

function renderShell(initialConfig: BoardDesignConfig, designId: string | null = 'd1') {
  return render(
    <DesignerShell
      designId={designId}
      initialConfig={initialConfig}
      saveAction={noop}
      updateAction={noop}
      copyAction={noop}
    />,
  );
}

const nameInput = () => screen.getByRole('textbox', { name: 'Board name' }) as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
const copyButton = () => screen.getByRole('button', { name: 'Save a copy' }) as HTMLButtonElement;

describe('Save is blocked, with the reason, when the server would reject the design', () => {
  it('an empty name disables Save and Save a copy and says why', () => {
    renderShell({ ...checker(), name: '' });
    expect(saveButton().disabled).toBe(true);
    expect(copyButton().disabled).toBe(true);
    const alerts = screen.getAllByRole('alert').map((el) => el.textContent ?? '');
    const block = alerts.find((text) => text.includes("Can't save yet:"));
    expect(block).toBeDefined();
    expect(block).toContain('Give the board a name.');
  });

  it('a valid design shows no blocker and an enabled Save', () => {
    const { container } = renderShell(checker());
    expect(container.textContent).not.toContain("Can't save yet:");
    expect(saveButton().disabled).toBe(false);
  });
});

describe('no form inside a form', () => {
  it('the copy form is a sibling of the save form, reached through the button form attribute', () => {
    const html = renderToStaticMarkup(
      <DesignerShell
        designId="d1"
        initialConfig={checker()}
        saveAction={noop}
        updateAction={noop}
        copyAction={noop}
      />,
    );
    const start = html.indexOf('id="designer-save-form"');
    expect(start).toBeGreaterThan(-1);
    // Walk from the save form's opening tag to its matching close; count forms opened inside.
    const re = /<form\b|<\/form>/g;
    re.lastIndex = html.indexOf('>', start) + 1;
    let depth = 1;
    let nested = 0;
    for (let m = re.exec(html); m; m = re.exec(html)) {
      if (m[0] === '</form>') {
        depth -= 1;
        if (depth === 0) break;
      } else {
        depth += 1;
        nested += 1;
      }
    }
    expect(nested).toBe(0);

    const copyId = html.match(/<button[^>]*form="([^"]+)"[^>]*>Save a copy<\/button>/)?.[1];
    expect(copyId).toBe('designer-copy-form');
    const copyForm = html.match(/<form[^>]*id="designer-copy-form"[^>]*>([\s\S]*?)<\/form>/)?.[1] ?? '';
    for (const name of ['designId', 'config', 'returnTo']) {
      expect(copyForm).toMatch(new RegExp(`type="hidden" name="${name}"`));
    }
  });
});

describe('drafts', () => {
  it('restores a different draft and can discard it', () => {
    window.sessionStorage.setItem(
      draftKey('d1'),
      JSON.stringify(parsed({ ...checker(), name: 'Draft name' })),
    );
    renderShell(checker());
    expect(nameInput().value).toBe('Draft name');
    expect(screen.getByText('Restored unsaved changes from earlier in this tab.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Discard them' }));
    expect(nameInput().value).toBe('Checkerboard');
    expect(window.sessionStorage.getItem(draftKey('d1'))).toBeNull();
    expect(screen.queryByText('Restored unsaved changes from earlier in this tab.')).toBeNull();
  });

  it('drops a draft identical to the saved design, and a "new" draft this design was saved from', () => {
    window.sessionStorage.setItem(draftKey('d1'), JSON.stringify(parsed(checker())));
    window.sessionStorage.setItem(draftKey(null), JSON.stringify(parsed(checker())));
    renderShell(checker());
    expect(screen.queryByText('Restored unsaved changes from earlier in this tab.')).toBeNull();
    expect(window.sessionStorage.getItem(draftKey('d1'))).toBeNull();
    expect(window.sessionStorage.getItem(draftKey(null))).toBeNull();
  });

  it('keeps an edit in the tab, and Reset clears it', () => {
    renderShell(checker());
    fireEvent.change(nameInput(), { target: { value: 'Edited board' } });
    const stored = window.sessionStorage.getItem(draftKey('d1'));
    expect(stored && JSON.parse(stored).name).toBe('Edited board');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(window.sessionStorage.getItem(draftKey('d1'))).toBeNull();
  });
});

describe('leaving with unsaved changes', () => {
  const leave = () => {
    const event = new Event('beforeunload', { cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    return event.defaultPrevented;
  };

  it('asks only once there is something to lose', () => {
    renderShell(checker());
    expect(leave()).toBe(false);
    fireEvent.change(nameInput(), { target: { value: 'Edited board' } });
    expect(leave()).toBe(true);
  });
});
