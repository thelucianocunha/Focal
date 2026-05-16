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
├── Focal_data.js           # Starter data — committed to git with clean demo data
├── Focal_data.default.js   # Reference copy of the clean starter (reset baseline)
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

### `Focal_data.js` (gitignored — personal use only)
Your personal seed data file. Not committed to the repo. Used only on first run (when localStorage is empty) to seed the app with your own sections, tasks, connections, and outcomes. After that, all changes go to localStorage and this file is not read again.

To set up: copy `Focal_data.default.js` → `Focal_data.js` and customize it. See [[04-Customizing]] for the structure.

Note: the app loads `Focal_data.default.js` by default — if `Focal_data.js` doesn't exist, the app still works using the clean demo data.

Structure:
```js
const VER   = '9.x';
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

### `Focal_data.default.js`
A read-only reference copy of the clean starter data. Use this to reset `Focal_data.js` back to its original state if needed. Never edited directly.

### `Focal_USER_MANUAL.html`
The in-app help manual. Opened via the 📖 button in the header. A standalone HTML file with a sidebar navigation — no dependency on the main app.

### `focal-logo.png` / `focal-logo-icon.png`
`focal-logo-icon.png` is used in the app header and as the browser tab favicon. `focal-logo.png` is the full horizontal logo for use in documents or the README. Replace with your own if you fork and rebrand.

### `docs/`
This Obsidian knowledge base. Open the `docs/` folder as a vault in Obsidian, or read the `.md` files in any text editor or Markdown viewer.
