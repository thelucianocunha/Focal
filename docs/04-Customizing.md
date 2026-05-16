---
tags: [focal, customizing, setup]
---

# Customizing Focal

All customization is done either through the **Settings panel** (⚙️ in the header) or by editing `Focal_data.js` before your first run.

## Sections

Sections are the top-level groupings for your tasks (e.g. "Monthly Priorities", "Board Prep", "Personal").

**Via Settings:**
- Settings → ⚙️ Categories → Add / rename / reorder / delete sections

**Via `Focal_data.js`** (before first run, or to reset):
```js
sections: [
  { id: 'priorities', icon: '🎯', title: 'Monthly Priorities', tasks: [] },
  { id: 'team',       icon: '👥', title: 'Team',               tasks: [] },
  { id: 'personal',   icon: '✅', title: 'Personal',           tasks: [] },
]
```

**Note:** After your first run, changes to sections are made in Settings — edits to `Focal_data.js` won't take effect until localStorage is cleared.

## Strategic Outcomes

Outcomes are colored labels you attach to tasks to show which strategic goal they serve (e.g. Revenue, Customer Success, Product).

**Via Settings:**
- Settings → 🎯 Outcomes → Add / edit / reorder / toggle active

**Via `Focal_data.js`:**
```js
outcomes: [
  { id: 'revenue',  name: 'Revenue Growth',   color: '#059669', active: true, sort: 0 },
  { id: 'cx',       name: 'Customer Success', color: '#2563EB', active: true, sort: 1 },
  { id: 'ops',      name: 'Operations',       color: '#D97706', active: true, sort: 2 },
]
```

## People & Connections

Connections are names you associate with tasks — team members, clients, partners.

**Via Settings → 👥 People:**
- Add / remove names from the known connections list
- Create groups (e.g. "Leadership Team") for easy bulk filtering

**Via `Focal_data.js`:**
```js
knownConnections: ['Alex', 'Jordan', 'Sam', 'Acme Corp'],
personGroups: [
  { id: 'grp_lt', name: 'Leadership Team', members: ['Alex', 'Jordan', 'Sam'] }
]
```

## Starter tasks

To give yourself a specific set of tasks on first run, add them to the relevant section in `Focal_data.js`:

```js
{ id: 'p1', priority: 'P1', task: 'My first priority', status: 'To Do',
  due: '', note: '', type: 'once', urgent: 0, confidential: false,
  connections: [], kanbanCol: null, outcomes: [] }
```

> After first run, all changes go to localStorage. Editing `Focal_data.js` won't affect existing data unless you clear localStorage.

## Resetting to a clean state

To start fresh:
1. Open browser DevTools → Application → Local Storage
2. Delete `focal_v1` and `focal_log`
3. Refresh — the app re-seeds from `Focal_data.js`

Or use Settings → ⚠️ Reset (if available in your version).

## Logo

Replace `focal-logo.svg` with any SVG or image. Update the `src` in `Focal.html` line 16.

## Theming

Focal uses CSS custom properties (variables) defined at the top of `Focal.css`. You can change colors, fonts, and spacing without touching the HTML or JS.
