---
tags: [focal, files, developer]
---

# File Structure

## Repository layout

```
focal/
├── Focal.html              # HTML structure — tabs, panels, modals
├── Focal.css               # All styles
├── Focal_app.js            # All JavaScript logic (~1,400 lines)
├── Focal_data.default.js   # Starter data — committed to git with clean demo data
# Focal_data.js is gitignored — personal copy only, not in repo
├── focal-logo.png          # App header logo (full)
├── focal-logo-icon.png     # App icon — used in header and as favicon
├── Focal_USER_MANUAL.html  # Full in-app user manual
├── LICENSE                 # CC BY-NC 4.0
├── COMMERCIAL_LICENSE.md   # How to get a commercial license
├── CONTRIBUTING.md         # Contributor guide
├── README.md               # GitHub project overview
├── .gitignore              # Excludes OS files and dev-only files
└── docs/                   # This Obsidian knowledge base
    ├── 00-Index.md
    ├── 01-Getting-Started.md
    ├── 02-Architecture.md
    ├── 03-File-Structure.md   ← you are here
    ├── 04-Customizing.md
    ├── 05-Contributing.md
    └── 06-Git-Setup.md
```

## File details

### `Focal.html`
The structural skeleton. Contains:
- The `<head>` with CSS and script links
- Header (logo, nav pills, version badge)
- Tab bar and view panels (inbox, tasks, today, kanban, matrix, review, analytics)
- The add/edit task modal
- The settings panel
- Mobile navigation bar

Edit this file only for structural changes (new tabs, new panels). Style changes go to `Focal.css`.

### `Focal.css`
All visual styling — layout, colors, typography, responsive breakpoints, dark/light mode.

### `Focal_app.js`
Every piece of application logic. Navigate using section markers (see [[02-Architecture]]).

Notable functions:
- `loadS()` — initialise state from localStorage
- `saveS()` — persist state to localStorage
- `matchesAll(t)` — combined filter predicate used by all views
- `openAdd()` / `openEdit(id)` — task modal
- `sw(view)` — switch active view

### `Focal_data.default.js`
The public starter data file. Committed to git. Loaded by `Focal.html` on every run. Contains the clean demo starter — customize this file to set up your sections, outcomes, people, and starter tasks. After your first run, all changes go to localStorage; editing this file only affects the app after a localStorage reset.

Structure:
```js
const VER   = '10.x';
const VDATE = 'Month DD, YYYY';
const FILE_DATA = {
  version, updated,
  inbox: [],
  knownConnections: [],
  personGroups: [],
  outcomes: [],
  sections: []
};
```

### `Focal_data.js` (gitignored — advanced personal use)
Optional personal override. Not in the repo. If you want to keep real task data out of git while tracking the rest of the app in version control, create this file alongside `Focal_data.default.js` and update the `<script src>` in `Focal.html` to point to `Focal_data.js`. Not needed for most users — simply edit `Focal_data.default.js` instead.

### `Focal_USER_MANUAL.html`
The in-app help manual. Opened via the 📖 button in the header. A standalone HTML file with a sidebar navigation — no dependency on the main app.

### `focal-logo.png` / `focal-logo-icon.png`
`focal-logo-icon.png` is used in the app header and as the browser tab favicon. `focal-logo.png` is the full horizontal logo for use in documents or the README. Replace with your own if you fork and rebrand.

### `docs/`
This Obsidian knowledge base. Open the `docs/` folder as a vault in Obsidian, or read the `.md` files in any text editor or Markdown viewer.
