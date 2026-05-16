---
tags: [focal, contributing, developer]
---

# Contributing

See [[06-Git-Setup]] for Git workflow instructions.

## Philosophy

Focal is intentionally minimal. The design constraints are:
- **No server** — runs as static files in any browser
- **No build step** — open `Focal.html`, make changes, refresh
- **No npm / node_modules** — zero dependencies
- **4-file architecture** — HTML, CSS, JS, data

Contributions that respect these constraints are most likely to be accepted. Contributions that add a build system, a framework, or server-side logic will not be merged.

## Types of contributions welcome

- Bug fixes (with clear reproduction steps)
- Accessibility improvements
- Mobile/responsive improvements
- Performance optimizations
- Documentation improvements
- New features that fit the existing philosophy (open an issue first)

## Development workflow

1. Fork and clone (see [[06-Git-Setup]])
2. Open `Focal.html` in your browser
3. Edit files — no build needed
4. Refresh the browser to see changes
5. Test across Chrome, Edge, and Firefox at minimum
6. Submit a pull request

## Architecture rules for contributors

Detailed in [[02-Architecture]], but the key rules:

- Data and user-configurable values → `Focal_data.default.js`
- Styles → `Focal.css`
- Logic → `Focal_app.js` (use section markers)
- Structure → `Focal.html` (only for layout changes)
- Any new filter must work in **all four views**: All Tasks, Today, Kanban, Matrix
- Use `escHtml()` whenever inserting user content into `innerHTML`

## Submitting a pull request

1. Branch name: `fix/description` or `feature/description`
2. One concern per PR
3. PR description: what changed and why (not what the code does)
4. If it fixes a bug: include steps to reproduce the original bug
5. If it's a new feature: include a brief demo or screenshots

## Contributor License Agreement

By submitting a PR you agree to the CLA described in [CONTRIBUTING.md](../CONTRIBUTING.md). The short version: your contribution can be used in future commercial versions of Focal.

## Questions?

Open a GitHub Issue or email theluciano@gmail.com.
