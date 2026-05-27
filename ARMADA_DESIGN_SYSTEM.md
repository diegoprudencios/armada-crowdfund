# Armada Design System Reference

This document is the single source of truth for building Armada interfaces.
It is written for AI agents (Claude, Cursor, etc.) and human developers alike.
Read this before designing or building anything for Armada.

---

## 1. What Armada is

Armada is privacy infrastructure for USDC — shielded payment rails for DAOs,
protocols, and payment apps. The consumer product is called Borderless (now
Armada App). There is also a governance token (ARM) and a crowdfund.

**Brand positioning:** Critical infrastructure with taste. Not cypherpunk. Not
corporate. Signal and Stripe are tonal references. DuckDuckGo for approachability.
The subversiveness is in the structure (crowdfund, wind-down, governance), not
the aesthetic.

**What to avoid:** Shield/military/hacker visual language. Fake friendliness.
Generic crypto aesthetics. Anything that reads as underground or dangerous.

---

## 2. Products and pages

| Product | Description | Status |
|---|---|---|
| Project page | One-pager explaining Armada | Existing, redesign later |
| Crowdfund | Public participation dashboard + 3D graph | Active — `CrowdfundExperience` |
| Participate flow | Multi-step join (modal or inline) | Active — Path 1 & Path 2 (see §8) |
| Invite flow | Entry via invite link | Active — `/invite`, Path 1 inline flow |
| My Position | Post-participation view (invites, position) | Active — panel in `CrowdfundExperience` |
| Armada App | Consumer payments app (was Borderless) | Planned |

---

## 3. Tech stack

- **Framework:** React + Vite + TypeScript
- **Styling:** CSS Modules + global CSS custom properties. No Tailwind.
- **Tokens:** Token Studio JSON (`armada-tokens.json`) → auto-generated
  `src/styles/tokens.css`. Never import tokens in TypeScript — only CSS sees them.
- **Build:** `tsc && vite build`. Always run `npm run build` locally before
  pushing. `npm run dev` skips TypeScript, so type errors only surface on build.
- **Deploy:** Vercel. Entry points include `hero.html`, `invite.html`,
  `dashboard.html`, `showcase.html`, `myposition.html`, `myposition-hero.html`.
  Add matching routes in `vercel.json` when introducing a new HTML entry.
- **Demo session:** `DemoSessionProvider` persists wallet, commit amount, and slots
  to `sessionStorage` so state survives navigation between Vite entries (e.g.
  `/invite` → hero `?view=myposition`). Page **refresh** and **disconnect** reset
  to a fresh demo.
- **Icons:** Heroicons (`@heroicons/react/24/solid` and `/24/outline`)
- **Wallet icons:** `@web3icons/react` v4.1.17

---

## 4. Token system

### How tokens work

Tokens live in two layers:

**Primitives** — raw values. Named by scale position.
`--primitives-color-purple-500`, `--primitives-fontSize-md`,
`--primitives-spacing-4`

**Semantic** — aliases with meaning. Named by role.
`--semantic-color-brand-lavender`, `--semantic-color-surface-default`,
`--semantic-color-text-muted`

Always prefer semantic tokens. Use primitives only when no semantic token
exists for the role (e.g. specific typography sizes, spacing values).

### Critical rule: never hardcode

Never write hex values, px values, or font sizes directly in CSS modules.
Always use `var(--token-name)`. For font sizes (stored as unitless numbers),
wrap with calc: `font-size: calc(var(--primitives-fontSize-md) * 1px)`.
Spacing tokens already include units: `gap: var(--primitives-spacing-4)`.

### Always verify token names before writing CSS

Token names are auto-generated and can differ from what you expect.
Check `src/styles/tokens.css` before writing any `var(--...)` reference.
Common patterns:
- Colors: `--primitives-color-purple-300`, `--semantic-color-brand-lavender`
- Spacing: `--primitives-spacing-4` (resolves to `16px`)
- Font size: `--primitives-fontSize-md` (resolves to `15`, unitless)
- Font family: `--primitives-fontFamily-ui` (Geist), `--primitives-fontFamily-display` (Charis SIL)
- Border radius: `--semantic-borderRadius-card`, `--primitives-borderRadius-sm`
- Button tokens: use `-padding-x` and `-padding-x-icon`, NOT `-padding-left` / `-padding-right`

### Key token values (for reference only — always use var names in code)

| Token | Value |
|---|---|
| `--semantic-color-surface-bg` | `#0E0D0F` |
| `--semantic-color-surface-default` | `#151416` |
| `--semantic-color-surface-raised` | `#1D1C1F` |
| `--semantic-color-brand-lavender` | `#C491E5` |
| `--semantic-color-brand-amber` | `#F3D0A0` |
| `--semantic-color-brand-deep` | `#291433` |
| `--semantic-color-text-primary` | `#FFFFFF` |
| `--semantic-color-text-secondary` | `rgba(255,255,255,0.87)` |
| `--semantic-color-text-muted` | `rgba(255,255,255,0.45)` |
| `--semantic-color-border-default` | `rgba(255,255,255,0.07)` |
| `--semantic-color-border-lavender` | `rgba(196,145,229,0.14)` |
| `--semantic-color-status-success` | `#34D399` |
| `--semantic-color-status-error` | `#F87171` |

### Brand colors are never used as surfaces

`brand-lavender`, `brand-amber`, and `brand-deep` are accent colors only.
They appear on buttons, icons, highlights, and decorative elements.
They are never used as card backgrounds, page backgrounds, or panel fills.

---

## 5. Typography

Two fonts. Clear roles. No exceptions.

**Charis SIL** — display only. Emotional moments, brand headlines, hero text.
Used sparingly: when something needs to feel significant.

**Geist** — everything functional. UI labels, body copy, captions, buttons,
form fields, data, navigation.

**Geist Mono** — reserved for code and technical strings only.

### Type scale usage

| Role | Font | Token | Notes |
|---|---|---|---|
| Hero headline | Charis SIL | `fontSize-8xl` (96px) | Above the fold only |
| Section title | Charis SIL | `fontSize-4xl` (44px) | Emotional section headers |
| Page title | Charis SIL | `fontSize-3xl` (32px) | Confirmation states, display moments |
| Card title | Geist Medium | `fontSize-xl` (20px) | |
| Body | Geist Regular | `fontSize-md` (15px) | Primary readable text |
| Caption | Geist Regular | `fontSize-base` (13px) | Secondary text, descriptions |
| Label | Geist Medium | `fontSize-sm` (11px) | Tags, pills, uppercase labels |
| Eyebrow | Geist Medium | `fontSize-xs` (10px) | Section labels, table headers |
| Button | Geist Medium | 14px (button token) | Only place 14px appears |
| Data hero | Geist | `fontSize-6xl` (64px) | Large numeric displays |

### When to use Charis SIL

Only at emotional high points: the moment a user decides to join, the moment
they're confirmed in. If the content is functional (a label, a field, a stat),
it's Geist. Ask: is this a moment, or is this information? Moments get Charis.

### Uppercase labels

Eyebrows and section labels are uppercase Geist Medium with wide letter-spacing
(`--primitives-letterSpacing-widest`: 0.12em). Apply via `text-transform:
uppercase` in CSS, not by writing the text in caps in the component.

---

## 6. Color usage rules

### Dark theme is default

The app is dark-first. `data-theme="dark"` on `<html>`. Light mode is
structurally available but not yet designed. Do not design light mode screens.

### Surface hierarchy

Three levels of surface, used to create depth:
- **bg** (`#0E0D0F`) — page background. Never use as a card color.
- **default** (`#151416`) — primary card and panel surface.
- **raised** (`#1D1C1F`) — elements that sit on top of cards. Hover states,
  nested items, inner blocks.

### Border usage

- Default border: `--semantic-color-border-default` (rgba white 7%) — subtle
  separation between same-level elements.
- Lavender border: `--semantic-color-border-lavender` (rgba lavender 14%) —
  primary card border. Cards that are the focus of a screen.
- Amber border: `--semantic-color-border-amber` (rgba amber 14%) — secondary
  CTA cards, warning states.
- Focus ring: `--semantic-color-border-focus` (purple-500) — keyboard focus.

### Gradient

The primary brand gradient is purple-300 → amber-300 at 135deg.
Used on: primary CTA buttons, JoinButton, gradient card borders.
```css
background: linear-gradient(135deg,
  var(--primitives-color-purple-300),
  var(--primitives-color-amber-300)
);
```
Text on gradient backgrounds uses `--semantic-color-surface-bg` (near-black)
for contrast.

---

## 7. Spacing system

Spacing tokens are multiples of 4px. Common values:

| Token | Value | Common use |
|---|---|---|
| `--primitives-spacing-1` | 4px | Tight gaps, segment bars |
| `--primitives-spacing-2` | 8px | Icon-to-label gaps |
| `--primitives-spacing-3` | 12px | Steps progress bar gap |
| `--primitives-spacing-4` | 16px | Standard padding, row gaps |
| `--primitives-spacing-5` | 20px | Left padding on pills |
| `--primitives-spacing-6` | 24px | Section gaps within content |
| `--primitives-spacing-8` | 32px | Card padding (standard) |
| `--primitives-spacing-10` | 40px | Section gaps |
| `--primitives-spacing-11` | 44px | Major zones in participate flow shells |
| `--primitives-spacing-12` | 48px | Large section gaps |
| `--primitives-spacing-16` | 64px | Large control height (e.g. landing JoinButton) |

### Spacing rhythm in modals and cards

Three gap values cover almost everything:
- **`--primitives-spacing-11` (44px)** — between major zones (Steps → content,
  content → button row)
- **`--primitives-spacing-5` (20px)** — between items within a section; invite
  landing footer gap between prompt and buttons
- **8–14px** — within a single element (eyebrow → headline, input → hint); use
  `--primitives-spacing-2` / `--primitives-spacing-3` where possible

---

## 8. Component patterns

### Cards

Standard card: `surface-default` background, `border-lavender` border, `8px`
border-radius, `32px` padding. Inner blocks that sit on cards use
`surface-raised` with `border-default` border and `20px` padding.

### Buttons

Four variants: primary (lavender fill), secondary (outline), ghost (no border),
gradient (purple → amber).

Three sizes: sm (32px), md (40px), lg (48px).

Always pill-shaped (`border-radius: 9999px`). Text is Geist Medium, 14px for
md size. Icons are 16px (sm/md) or 16px (lg). Gap between label and icon is 6px.

Primary CTA in a flow is always on the right. Destructive or back actions are
always on the left. Never use more than two buttons in a single row.

### JoinButton

Gradient pill CTA on invite/fleet cards. Props:
- `expanded` — parent hover expands label (fleet card, Step 0 invite card).
- `size` — `'md'` (default) or `'lg'` (Path 1 invite landing; height aligns with
  `--primitives-spacing-16`).

### Flow shells (shared)

Participate steps share this vertical structure:
1. `Steps` component (progress indicator)
2. Step content (variable)
3. Button row (up to two buttons, 50/50 split, `Button` size `lg` = 48px height)

Content area target: **480×500px**, `--primitives-spacing-8` (32px) padding,
`border-lavender` border, `surface-default` background when the shell is a
focal card.

Zone gaps: `--primitives-spacing-11` (44px). Button row uses
`flex-shrink: 0`; scroll overflow on middle content if needed.

Step labels and bar indices live in `participateFlowSteps.ts` — do not
duplicate step names in orchestrators.

### Participate flows — Path 1 & Path 2

Two orchestrators. Never mix their step bars or entry behavior.

| | **Path 1 — Invite link** | **Path 2 — Crowdfund modal** |
|---|---|---|
| Component | `ParticipateFlowInviteLink` | `ParticipateFlowCrowdfund` |
| Page | `InviteLanding` (`/invite`) | `CrowdfundExperience` |
| Presentation | Inline in page (no modal overlay) | `ParticipateFlowModal` |
| Progress labels | Connect → Commit → Review → Confirm | Commit → Review → Confirm |
| Step 0 | Invite card on page; user joins then flow runs | Invite card only on **first** participation |
| Wallet gate | Step 1 in flow when disconnected | Same; modal opens to wallet or commit |

**Path 1 layout notes**
- Fixed inline slot: 480×500 (`ParticipateFlowInviteInline.module.css`).
- Page footer (Crowdfund / My Position links) hidden while flow is active.
- `Step0Invite` uses `variant="landing"` on the page card (lavender border,
  `JoinButton` `size="lg"`, `HopPill` with `.landing` class).

**Path 2 layout notes**
- Modal close (X) from **confirmation** navigates to My Position.
- Returning participants skip Step 0 and start at commit when reopening.

### Step 0 invite card (`Step0Invite`)

Grid stack (`grid-area: stack`) for video, overlay, content. Z-index: media 0,
overlay 1, content 2.

Overlay gradient (Figma): black **20%** top → **80%** bottom:
```css
background: linear-gradient(
  to bottom,
  rgba(0, 0, 0, 0.2) 0%,
  rgba(0, 0, 0, 0.8) 100%
);
```

Variants:
- **`default`** — modal Path 2; fixed 480×500 shell.
- **`landing`** — Path 1 page card; `max-width: 480px`, lavender border,
  larger join control (see JoinButton `lg`).

Optional `hideConnectEyebrow` when wallet is already connected (modal).

### Confirmation step (`Step5Confirmation`)

Charis SIL headline — emotional moment. Copy splits on **first vs additional**
commit (`isAdditionalCommit`):
- First: “You're in.” + amount committed + ARM reserved.
- Additional: “Commitment updated.” + amount added + total committed.

**View your position** (secondary, left) shows when `onViewPosition` is passed
**and** (`showViewPositionButton` **or** `isAdditionalCommit`):
- Path 1: always pass `showViewPositionButton` on first commit; additional
  commits also match via `isAdditionalCommit`.
- Path 2 first commit: no secondary button; modal X still routes to My Position.
- Path 2 additional commit: show secondary button; wire `onViewPosition` from
  parent (closes modal + My Position panel).

Primary (right): **Invite participants** → in-flow invite slots step.

### Steps component

Props: `steps: string[]`, `currentStep: number` (1-indexed),
`status?: 'default' | 'error' | 'confirmed'`

Segment colors:
- Default/inactive: `border-default`
- Active: `brand-lavender`
- Error: `status-error`
- Confirmed: `status-success` (all segments)

### HopPill

Shows invite level. Variants: `seed`, `hop-1`, `hop-2`, `multi-hop`.
Dot colors are defined in `src/constants/graphHopColors.ts` — use that module
for graph nodes, list UI, and HopPill (do not hardcode hop hex in components).

Only shown when we know the user's invite level. Hidden for anonymous users.

**Landing variant:** apply `HopPill.module.css` `.landing` on Path 1 invite
card so pill height aligns with `JoinButton` `lg`.

### Progress (crowdfund card)

Fill to the min-raise threshold uses solid brand color. Amount **above** min
raise uses a looping darker lavender sweep on the committed portion (see
`Progress` component). Keep wheel zoom on the graph when no node is selected.

### Warning/notice blocks

Legal or cautionary copy: 12px vertical padding, 16px horizontal, amber border,
12px Geist Regular. Always sits immediately above the button row.

### Info/summary blocks

Data summaries (review screens): 20px padding all sides, `surface-raised`
background, `border-default` border, `8px` radius. Row items separated by 1px
dividers.

---

## 9. Image and media patterns

### Fleet image/video

`/fleet.png` (static) and `/fleet.mp4` (video). Used as full-bleed card
backgrounds. Always paired with a gradient overlay:

```css
background: linear-gradient(
  to top,
  rgba(0, 0, 0, 0.8) 0%,
  rgba(0, 0, 0, 0.45) 40%,
  rgba(0, 0, 0, 0.15) 70%,
  rgba(0, 0, 0, 0) 100%
);
```

Video plays on hover. Static image is the default state. This is handled by
the existing `Participate` component — reuse it, don't recreate it.

### Stacking media with content

Use CSS grid with a shared `grid-area: stack` so media, overlay, and content
occupy the same cell. Z-index: media 0, overlay 1, content 2.

---

## 10. Wallet icons

Use `@web3icons/react`. Import names differ from display names:

| Wallet | Import name |
|---|---|
| MetaMask | `WalletMetamask` |
| Coinbase Wallet | `WalletCoinbase` |
| WalletConnect | `WalletWalletConnect` |
| Phantom | `WalletPhantom` |

Always render at 24px. Pass as `iconComponent` prop to `WalletItem`.

### Demo wallet gate

Allowlist is **by wallet address** (`participateFlowWallets.ts`), not provider
brand. Disconnected users pick a provider in `Step1Wallet`; non-whitelisted
addresses see `Step1WalletNotWhitelisted`.

When connected, the header wallet pill uses `WalletPillMenu` (copy address,
disconnect). Disconnect resets wallet, commit amount, participation flag, and
invite slots to their initial demo values.

---

## 11. Existing components

Before building anything, check if it already exists:

| Component | Location | Notes |
|---|---|---|
| `Button` | `src/components/Button/` | 4 variants × 3 sizes |
| `Tag` | `src/components/Tag/` | Status dot variants |
| `NavBar` / `NavItem` | `src/components/NavBar/` | |
| `Header` | `src/components/Header/` | `activeNav`, `WalletPillMenu` when connected |
| `ArmadaLogo` | `src/components/ArmadaLogo/` | Shared logo mark |
| `Progress` | `src/components/Progress/` | Crowdfund raise bar + min-raise animation |
| `Participate` | `src/components/Participate/` | Fleet card (image/video) |
| `Steps` | `src/components/Steps/` | Flow step indicator |
| `WalletItem` | `src/components/WalletItem/` | Wallet selection row |
| `HopPill` | `src/components/HopPill/` | Invite level; `.landing` on invite page |
| `JoinButton` | `src/components/JoinButton/` | `expanded`, `size` md \| lg |
| `ParticipateFlowModal` | `src/components/ParticipateFlow/` | Modal shell (Path 2) |
| `ParticipateFlowCrowdfund` | `src/components/ParticipateFlow/` | Path 2 orchestrator |
| `ParticipateFlowInviteLink` | `src/components/ParticipateFlow/` | Path 1 orchestrator |
| `Step0Invite` | `.../steps/Step0Invite/` | Invite card; `variant` default \| landing |
| Step screens | `.../ParticipateFlow/screens/` | Step1Wallet … Step5Confirmation |
| `CrowdfundExperience` | `src/pages/` | Hero shell: graph, panels, Path 2 modal |
| `InviteLanding` | `src/pages/` | Path 1 page at `/invite` |
| `DemoSessionProvider` | `src/context/` | In-memory wallet, commit, slots (resets on refresh/disconnect) |

Never rebuild a component that exists. Extend it if needed. Add new variants to
Showcase when introducing a new public prop or flow branch.

---

## 12. File and folder conventions

```
src/
  components/
    ComponentName/
      ComponentName.tsx
      ComponentName.module.css
  pages/
    CrowdfundExperience.tsx
    InviteLanding.tsx
    Hero.tsx
    Dashboard.tsx
    Showcase.tsx
  context/
    DemoSessionContext.tsx
    demoSessionStorage.ts
  styles/
    tokens.css          ← auto-generated, do not edit manually
  tokens/
    armada-tokens.json  ← source of truth for tokens
```

Each component lives in its own folder. Module CSS is co-located.
No global CSS except `tokens.css` and base resets.

---

## 13. Figma MCP workflow

When reading Figma components via MCP:
- Always use `figma.getNodeByIdAsync()` — the synchronous version returns null.
- Batch reads to avoid timeouts (~100–150 nodes per call).
- Component set props live on the `COMPONENT_SET` node, not on variants.
- Font sizes come back as numbers (e.g. `11`) — map to token names
  (`fontSize-sm` = 11, `fontSize-md` = 15, etc.)

Token name mapping (Figma value → CSS var):
| Figma fontSize | CSS token |
|---|---|
| 10 | `--primitives-fontSize-xs` |
| 11 | `--primitives-fontSize-sm` |
| 13 | `--primitives-fontSize-base` |
| 15 | `--primitives-fontSize-md` |
| 17 | `--primitives-fontSize-lg` |
| 20 | `--primitives-fontSize-xl` |
| 24 | `--primitives-fontSize-2xl` |
| 32 | `--primitives-fontSize-3xl` |
| 44 | `--primitives-fontSize-4xl` |
| 64 | `--primitives-fontSize-6xl` |

---

## 14. Build and deploy rules

- Run `npm run build` locally before every push to main.
- `npm run dev` skips TypeScript — type errors only surface on build.
- Vercel runs `tsc && vite build` — it will catch what dev misses.
- New pages need a corresponding `.html` entry file, a `main-*.tsx` entry
  point, `vite.config.ts` `rollupOptions.input`, and a Vercel route in
  `vercel.json` when the URL should be clean (e.g. `/invite` → `invite.html`).
- Showcase (`/showcase.html`) is the component gallery. Every new component
  or flow variant gets added there after being built.
