# Woodworking Plan — design system

A small, mobile-first visual system (Tailwind CSS v4) for a woodworking-plan
PWA. Warm off-white light theme, warm dark theme, one orange accent. Every
colour is a CSS token, so light↔dark is a token flip — build with the tokens
and both themes work for free.

## Theming — no wrapper needed

Colours come from CSS custom properties on `:root`. **Dark mode = add `class="dark"`
to a high-level ancestor** (the app puts it on `<html>`); the `.dark {}` block
flips the same tokens and everything re-themes. There is **no provider component
to wrap**. Print is auto-forced to high-contrast light.

## Styling idiom — Tailwind utilities bound to tokens

This is a **utility-class** system. Never hardcode a hex value — use the token
utilities so themes and print keep working. The colour vocabulary:

| Utility family | Tokens (use as `bg-*`, `text-*`, `border-*`, `outline-*`) |
|---|---|
| Surfaces | `bg` (app background), `surface` (cards/header) |
| Text | `fg` (primary ink), `muted` / `muted-2` (secondary) |
| Lines | `border`, `border-strong` |
| Accent (orange) | `accent`, `accent-strong`, `accent-tint`, `accent-tint-border`, `accent-soft` |
| On-accent ink | `accent-fg` — text/icons sitting **on** an `accent` fill (stays dark ink in both themes; never put `text-fg` on an orange fill) |
| Functional | `danger`, `ok` (also the focus-ring colour), `pending`, `err` |

Spacing/typography use Tailwind's normal utilities plus a custom `xs` (34rem)
breakpoint; the app's defaults line up with `sm`/`lg`/`xl`/`2xl` = 40/64/80/96rem.
Focus rings are `focus-visible:outline-2 outline-ok outline-offset-2`. Touch
targets are ≥44px (`min-h-[2.75rem]`).

## Components (all in `window.WoodworkingUI`)

`Button` (variant: `ghost`|`primary`|`danger`|`liked`|`bare` — one `primary`
CTA per view), `Chip` (`active` pill), `CheckboxPill` (`:has()`-driven filter
pill), `TextInput`, `Select` (`fullWidth`), `CategoryLabel` (uppercase eyebrow),
`PageContainer` (`width: default`|`wide`|`catalog` — the centred page shell).

## Where the truth lives

Read `styles.css` and its `@import` closure (`_ds_bundle.css`) for the compiled
utilities + token definitions, and each component's `<Name>.d.ts` / `<Name>.prompt.md`
for its API and usage examples.

## Idiomatic snippet

```jsx
<PageContainer>
  <CategoryLabel>Outdoor</CategoryLabel>
  <h1 className="text-fg text-[1.5rem]">Cedar Raised Garden Bed</h1>
  <p className="text-muted">A weekend build in rot-resistant cedar.</p>
  <div className="flex gap-3 mt-4">
    <Button variant="primary">Start building</Button>
    <Button variant="ghost">Save</Button>
  </div>
</PageContainer>
```
