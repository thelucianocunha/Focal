---
tags: [focal, architecture, developer]
---

# Architecture

Focal is deliberately simple: four files, no build step, no dependencies, no server.

## The 4-file split

| File | Role | How to edit |
|------|------|------------|
| `Focal.html` | HTML structure — tabs, panels, modals | Edit directly, rarely |
| `Focal.css` | All styles and theming | Edit directly |
| `Focal_app.js` | All JavaScript logic | Use section markers to navigate |
| `Focal_data.default.js` | Seed data and user-configurable defaults | Customize for your setup; committed to git |

> **Rule:** if it is data or user-configurable, it belongs in `Focal_data.default.js`. Nothing personal is hardcoded in the HTML or JS files.

## Data flow

```
Focal_data.default.js (FILE_DATA)
        │
        ▼ (only on first load, if localStorage is empty)
  localStorage  ←──────────────────── saveS()
        │
        ▼ (every page load)
    State (S)
        │
        ├──▶ renderTasks()
        ├──▶ renderToday()
        ├──▶ renderKanban()
        ├──▶ renderMatrix()
        └──▶ renderAnalytics()
```

1. On first open: `FILE_DATA` from `Focal_data.default.js` is written to `localStorage` as `focal_v1`
2. On every subsequent open: state is read from `localStorage` into `S`
3. Every change calls `saveS()` which writes `S` back to `localStorage`
4. `Focal_data.default.js` is not touched after first load — it is only the starting point

## State object `S`

`S` is the single source of truth at runtime. Key fields:

```js
S = {
  sections: [...],        // sections with tasks
  inbox: [...],           // inbox items
  knownConnections: [],   // person/company names for autocomplete
  personGroups: [...],    // named groups (e.g. "Leadership Team")
  outcomes: [...],        // strategic outcome labels and colors
  settings: {
    apiKey: '',           // Anthropic API key (stored locally)
    showDone: false,
    showBacklog: false,
    // ...
  }
}
```

## Navigating Focal_app.js

The file is ~1,400 lines. Use the section markers to jump to any area:

```
═══ STATE ═══          ═══ PERSISTENCE ═══    ═══ CONSTANTS ═══
═══ UTILITIES ═══      ═══ SEARCH ═══         ═══ SECTION MANAGER ═══
═══ MATRIX FILTER ═══  ═══ STATS ═══          ═══ RENDERING ═══
═══ TASK ACTIONS ═══   ═══ DATE PICKER ═══    ═══ EMAIL & DELETE ═══
═══ CONNECTIONS ═══    ═══ MODAL ═══          ═══ DRAG & DROP ═══
═══ FILTERS ═══        ═══ TODAY ═══          ═══ MATRIX ═══
═══ TOAST ═══          ═══ INBOX ═══          ═══ WEEKLY REVIEW ═══
═══ KANBAN ═══         ═══ ANALYTICS ═══      ═══ KEYBOARD ═══
═══ INIT ═══
```

## Filter architecture

All views share a two-layer filter pipeline:

- **Pill filters** (`activeF` Set) — checked by `matchesFilter(t)` via `_fMatch()`
- **Person filter** (`personFilter` string[]) — checked by `matchesPerson(t)`
- **Combined** — `matchesAll(t)` = `matchesFilter(t) && matchesPerson(t)`

| View | Filter entry point |
|------|--------------------|
| All Tasks | `applyF()` |
| Today | `getTodayTasks()` → `matchesAll(t)` |
| Matrix | `renderMatrix()` → `matchesAll(t)` |
| Kanban | `renderKanban()` → `matchesAll(t)` |

> Any new filter must be applied in all four views.

## Context menu pattern

- `rowCtxMenu(e, id, secId)` — All Tasks, Today, Matrix
- `kCtxMenu(e, id, secId, col)` — Kanban only

## Versioning

Focal uses **Semantic Versioning: `MAJOR.MINOR.PATCH`**

| Segment | When |
|---------|------|
| `PATCH` | Bug fixes, doc corrections — no new features |
| `MINOR` | New features, backwards compatible (resets PATCH to 0) |
| `MAJOR` | Breaking localStorage schema change, full rewrite, rebrand (resets MINOR+PATCH) |

- Version lives in `Focal_data.default.js`: `VER` (e.g. `'10.1.2'`) and `VDATE`
- Before any MAJOR bump: archive current files to parent `Tasks/Archive/` first
- localStorage key: `focal_v1` — migration guards in `loadS()` handle upgrades from older keys

## localStorage keys

| Key | Contents |
|-----|----------|
| `focal_v1` | Full state object `S` |
| `focal_log` | Analytics event log (~15KB steady-state) |
