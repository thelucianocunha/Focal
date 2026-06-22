---
tags: [focal, getting-started]
---

# Getting Started with Focal

## What is Focal?

Focal is a personal task management app for leaders. It runs entirely in your browser with no server, no account, and no cloud. Everything is stored locally in your browser's localStorage.

## Installation

There is no installation. Focal is a set of static files.

**Option A — Download**
1. Go to the [GitHub releases page](../../releases)
2. Download the latest ZIP
3. Unzip to any folder on your computer
4. Open `Focal.html` in Chrome, Edge, Firefox, or Safari — no setup needed

**Option B — Clone**
```
git clone https://github.com/YOUR-USERNAME/focal.git
cd focal
```
Then open `Focal.html` in your browser — no setup needed.

> Focal works fully offline after the first load (Google Fonts is the only external resource and is purely cosmetic).

## First run

When you open Focal for the first time, it loads the starter data from `Focal_data.default.js`. You will see:
- A welcome task in the **All Tasks** view
- Empty sections ready for your content

Start by:
1. Editing the welcome task or deleting it
2. Opening **Settings** (⚙️ in the header) to configure your sections, outcomes, and people
3. Adding your first real task via the **＋ Add** button

## The main views

Navigate using the tab bar at the top:

| Tab | Purpose |
|-----|---------|
| 📥 Inbox | Fast capture — type anything, structure later |
| ✅ All Tasks | Full task list with filters |
| ☀️ Today | Your daily focus list |
| 🗂 Kanban | Visual board (To Do / In Progress / Done) |
| ⬜ Matrix | Eisenhower priority grid |
| 🔄 Review | Weekly reflection |
| 📊 Analytics | Completion trends |

## Adding your first task

1. Click **＋ Add Task** or press **N**
2. Fill in: Task description (required), Priority, Section, Due date, Connections, Outcomes
3. Click **Save** or press **Enter**

## Keyboard shortcuts

Press **?** at any time to see all keyboard shortcuts.

## AI features (optional)

If you have an [Anthropic API key](https://console.anthropic.com/), you can enable:
- Natural-language task capture in the Inbox
- AI-fill when adding tasks  
- Weekly Debrief after your review

To enable: **Settings** → **🤖 AI** → paste your key.

> Your API key is stored only in your browser. It is sent only to Anthropic's servers when you explicitly trigger an AI action. Nothing is sent automatically.

## Your data

All data lives in your browser's **localStorage** under the key `focal_v1`. It is never sent anywhere.

Because localStorage is tied to one browser on one device, use the **backup tools** in **Settings → 💾 Data** to keep a copy and move between devices. There are two ways to back up:

### Manual export / import

- **⬇ Export JSON** — downloads a complete snapshot to your browser's **Downloads** folder, named `focal-backup-YYYY-MM-DD.json` (the date is stamped automatically). Drop it into a synced folder (OneDrive, iCloud Drive, Dropbox, Google Drive) for off-device safety.
- **⬆ Import JSON** — restore from a previously exported file. Importing **overwrites** your current Focal data; a safety copy of your existing state is first saved to localStorage so a bad restore can be undone.

### Automatic backup (Chrome / Edge)

- **🔗 Connect backup file…** — pick a location and filename once (the picker suggests `focal-backup.json` and opens in your Documents folder). Focal then writes to that exact file **silently on every change**, using the browser's File System Access API.
- Point it at a file inside a synced folder (e.g. OneDrive / iCloud Drive / Dropbox) and your Focal data follows you across devices with **no server and no account** — the sync service does the moving.
- This option requires a Chromium-based browser (Chrome or Edge). Browsers without the File System Access API fall back to manual export/import above.

> Backup files contain all your real task data. Treat them as private — keep them in your own synced storage, not in a public location or repository.

## Next steps

- [[02-Architecture]] — understand how the app works
- [[04-Customizing]] — set up your sections and outcomes
- Open the **📖 User Manual** (link in the app header) for full feature documentation
