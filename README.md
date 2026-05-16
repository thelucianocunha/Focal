# Focal — Task Management for Leaders

> See clearly. Act decisively.

Focal is a lightweight, privacy-first task management app designed for leaders who need to stay on top of priorities without complexity. It runs entirely in your browser — no server, no account, no tracking. Your data never leaves your device.

## Features

- **All Tasks** — full task list with priority, status, due date, connections, and outcomes
- **Today** — focused daily view showing only what matters now
- **Kanban** — visual board with To Do / In Progress / Done / Backlog columns
- **Matrix** — Eisenhower priority matrix with View and Prioritize modes
- **Weekly Review** — structured end-of-week reflection with AI debrief (optional)
- **Inbox** — fast capture with AI-powered task structuring (optional)
- **Analytics** — task completion trends and patterns over time
- **Subtasks**, **recurring tasks**, **connections**, **strategic outcomes**, **confidential flag**
- **Demo mode** — masks all content for screen sharing
- **Zero dependencies** — one HTML file, one CSS file, one JS file, one data file

## Getting started

1. Download or clone this repository
2. Open `Focal.html` in any modern browser (Chrome, Edge, Firefox, Safari)
3. That's it — no install, no server, no account

See [Getting Started](docs/01-Getting-Started.md) for a full walkthrough.

## AI features (optional)

Focal integrates with the [Anthropic API](https://www.anthropic.com) for:
- Natural-language task capture in the Inbox
- AI-fill when adding tasks
- Weekly Debrief summary

To enable: open Settings → 🤖 AI, paste your Anthropic API key. Your key is stored only in your browser's localStorage and sent only to Anthropic's API — never to any other server.

## Privacy

- All data is stored in your browser's **localStorage** — it never leaves your device
- No accounts, no cloud sync, no telemetry, no cookies
- The optional AI features send task text to Anthropic's API — only when you explicitly trigger them
- Your API key is stored locally and never shared

## License

Focal is free for **non-commercial use** under [CC BY-NC 4.0](LICENSE).

Commercial use (companies, paid products, client deployments) requires a commercial license.
**Email theluciano@gmail.com** for commercial licensing.

## Documentation

Full documentation is in the `docs/` folder, readable in [Obsidian](https://obsidian.md) or any Markdown viewer:

| File | Contents |
|------|----------|
| [Getting Started](docs/01-Getting-Started.md) | Install, first run, basic workflow |
| [Architecture](docs/02-Architecture.md) | 4-file structure, how the app works |
| [File Structure](docs/03-File-Structure.md) | What every file contains |
| [Customizing](docs/04-Customizing.md) | Personalizing sections, outcomes, connections |
| [Contributing](docs/05-Contributing.md) | How to contribute code |
| [Git Setup](docs/06-Git-Setup.md) | Git workflow for contributors |

The in-app user manual (open via 📖 in the header) covers every feature in detail.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

---

*Copyright (c) 2026 Luciano Cunha · [CC BY-NC 4.0](LICENSE)*
