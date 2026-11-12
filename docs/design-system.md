# Design system

Open `/styleguide` to see every token and component in light and dark mode. The system follows the Receipts (sp1) design system, with cost-specific additions.

```tsx
import { Button, DataTable, StatTile, StatusPill } from "@/design-system/components";
```

## Tokens

All colours are CSS variables in `src/design-system/tokens.css`, with a light set, a dark set (`[data-theme="dark"]`) and a print set. `src/app/globals.css` maps them to Tailwind classes: `bg-paper`, `bg-surface`, `text-ink`, `text-ink-muted`, `bg-brand`, `border-line`, `bg-pass-soft`, `text-watch-ink` and so on. Never write a hex value in a component.

Type: Bricolage Grotesque for headings (`font-heading`), Inter for body text, JetBrains Mono for numbers (`font-mono tabular`).

## Components

| Component | Use it for |
| --- | --- |
| `Button`, `ButtonLink` | Actions. `variant`: primary, secondary, ghost. `size`: sm, md, lg |
| `Card`, `Badge` | Surfaces and small labels |
| `StatTile`, `DeltaPill` | A headline number with context; change against the previous period |
| `StatusPill` | One of three statuses, always with an icon and a word |
| `BudgetGauge` | Spend against a budget; amber at the alert share, red over 100% |
| `DataTable` | Any table. Columns are `{ key, header, align, render }` |
| `EvidenceCard`, `Stamp` | The receipt-paper motif: a source behind a figure, a stamped mark |
| `Field`, `Input`, `Select`, `ChoiceCard`, `Segmented` | Forms |
| `Modal`, `Drawer` | Dialogs and side panels |
| `Stepper` | Wizard progress |
| `toast` | Confirmation after an action |
| `Term`, `GlossaryText` | A technical word with a plain explanation on hover |
| `EmptyState`, `Penny` | Empty pages, with the coin mascot |
| `CodeBlock`, `Accordion`, `PlanCard`, `Logo`, `ThemeToggle`, `Confetti` | As named |

Page building blocks for app screens live in `src/screens/app/parts.tsx`: `Page`, `PageHeader`, `SectionCard`, `SourceNote`, `BarList`, `DailyBars`.

## Conventions

- **Three statuses only:** *On track*, *Keep an eye on it*, *Needs action* (`pass`, `watch`, `fix`). Never colour alone.
- **For cost, up is the direction to watch.** `DeltaPill` is amber when a number rises and green when it falls.
- **Numbers are monospaced and tabular**, right-aligned in tables.
- **One primary button per screen.**
- **Every usage page ends with a `SourceNote`** naming the system tables it reads and linking to the Databricks reference.
- **Charts** use one hue for one series, print the value in a tooltip, and carry an `aria-label` listing the data.
- **Words** are plain and short. Technical terms get a `Term` tooltip; definitions are in `src/content/glossary.ts`.

## Adding a page

1. Add a screen in `src/screens/app/`, built from `Page`, `PageHeader` and `SectionCard`.
2. Add a route file in `src/app/(workspace)/<name>/page.tsx` that renders it.
3. Add it to the `groups` list in `src/screens/app/AppShell.tsx`.
4. If it shows usage, call `useUsage()` and put `<RangePicker />` in the header.

Not every screen is on the design system yet: Budget, Pricing and the Setup guide still use hand-written markup.
