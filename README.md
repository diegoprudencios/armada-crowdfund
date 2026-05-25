# Armada Crowdfund UI

**This is the only project folder.** Edit here, run dev here, commit here. Ignore `armada-v2` (old duplicate).

## Daily use (simple)

1. Open this folder in Cursor: `armada-crowdfund`
2. In the terminal: `npm run dev`
3. In the browser: **http://localhost:5173/**
   - Showcase (components): http://localhost:5173/showcase.html
   - Hero: http://localhost:5173/
   - Dashboard: http://localhost:5173/dashboard.html

If you see the wrong design (e.g. nav centered under the logo), you are probably on port **5174** or another old copy — close that tab and use **5173** from this folder only.

---

React + Vite UI prototype for the Armada crowdfund experience.

This project includes **two main screens**:
- **Hero**: full-bleed “launch” experience
- **Dashboard**: crowdfund dashboard layout

They are exposed as **separate HTML entry points** (multi-page Vite app), so you can open/share each view without changing code.

## Quickstart

```bash
npm install
npm run dev
```

Open (local dev):
- **Hero (default `/`)**: `http://localhost:5173/` (served by `index.html`)
- **Hero (explicit)**: `http://localhost:5173/hero.html`
- **Dashboard**: `http://localhost:5173/dashboard.html`

## Deploy URLs (Vercel)

`vercel.json` maps friendly routes:
- **Hero (default)**: `/`
- **Hero**: `/hero`
- **Dashboard**: `/dashboard`

## Build

```bash
npm run build
```

Outputs in `dist/`:
- `index.html` (Hero default)
- `hero.html` (Hero)
- `dashboard.html` (Dashboard)

Preview the production build locally:

```bash
npm run build
npm run preview
```

## What’s implemented (high level)

- **Hero layout**: full-bleed background + `NodeSphere`, fixed stacks (progress + participants panel), and a fixed header (auto-hides on scroll).
- **Dashboard layout**: top cards (progress + participate), `NodeSphere`, and a participants table below the graph.
- **Scenario-driven mock data** (per page load): 0 participants / small (3–5) / 30 / 800; cards + lists/tables + graph all match the chosen scenario.
- **Three.js `NodeSphere`**: layered “shells” (center logo → Seed → Hop 1 → Hop 2…), sparse layer-to-layer wiring, hover + click-to-select, selection recentering, and path highlighting to nearest connected nodes.
- **Filters/search**: Hero participants panel filters and search; Dashboard participants table filters and search (both aligned to Seed/Hop 1/Hop 2).
- **Token-based styling**: primitives/semantics live in `src/styles/tokens.css` and are used across components; some fixed layout dimensions remain intentionally hardcoded (see below).

## Where things live

- **Pages**: `src/pages/Hero.tsx`, `src/pages/HeroDashboard.tsx`
- **Graph**: `src/pages/NodeSphere.tsx`
- **Mock data**: `src/utils/mockParticipants.ts`
- **Tokens**: `src/styles/tokens.css`
- **Multi-page entry points**: `index.html`, `hero.html`, `dashboard.html` + `vite.config.ts`
- **Vercel routes**: `vercel.json`

## Known issues / constraints

- **`backdrop-filter` + WebGL**: some “glass blur” effects can appear inconsistent (or look like only translucency) depending on browser/GPU/compositing when a WebGL canvas is behind the element. We mitigated this by using pseudo-elements and careful stacking, but this is ultimately a platform/compositing limitation.
- **Intentional hardcoding (for now)**:
  - Fixed layout dimensions such as `582px` card width, `248x304` participate card, and `272px` tooltip width (no matching layout tokens yet).
  - Some “in-between” typography (e.g. `14px`) where the existing primitives jump `13 → 15` and changing would subtly alter visuals.

