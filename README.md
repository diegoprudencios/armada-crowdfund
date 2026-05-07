# Armada Crowdfund UI

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

Open:
- **Dashboard**: `http://localhost:5173/` (or `http://localhost:5173/dashboard.html`)
- **Hero**: `http://localhost:5173/hero.html`

## Build

```bash
npm run build
```

Outputs in `dist/`:
- `index.html` + `dashboard.html` (Dashboard)
- `hero.html` (Hero)

## What’s implemented (high level)

- **Dashboard layout**: headline + tags, main progress + participate CTA, hop breakdown cards, and a full-width network visualization frame.
- **Hero layout**: full-bleed page with fixed transparent header and supporting sections.
- **Progress / hop bars**: animated fill + amount roll-up; tick marks remain visually fixed while fill animates.
- **Three.js network visualization**: interactive “node sphere” with hover, zoom, drag-to-rotate, and auto-rotate behavior.
- **Header behavior**: fixed positioning with optional hide-on-scroll (down) / show-on-scroll (up).

