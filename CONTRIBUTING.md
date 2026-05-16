# Contributing to Focal

Thank you for your interest in improving Focal. Contributions are welcome under the terms below.

## Before you start

- Check [open issues](../../issues) to avoid duplicate work
- For anything beyond a small bug fix, open an issue first to discuss the approach
- Read [[02-Architecture]] in the `docs/` folder to understand the 4-file structure

## Contributor License Agreement

By submitting a pull request you agree that:

- Your contribution is your original work
- You grant Luciano Cunha a perpetual, worldwide, royalty-free license to use, modify, and sublicense your contribution, including in future commercial versions of Focal
- Your contribution will be distributed under the same [CC BY-NC 4.0 license](LICENSE) as the rest of Focal

This CLA is necessary so that the author retains the ability to offer commercial licences in the future.

## How to contribute

1. Fork the repository on GitHub
2. Create a branch: `git checkout -b fix/short-description` or `feature/short-description`
3. Make your changes following the [[02-Architecture|architecture guidelines]]
4. Test in a browser — open `Focal.html` directly, no build step needed
5. Submit a pull request with a clear description of what changed and why

## What makes a good contribution?

- Bug fixes with a clear reproduction case
- Performance improvements with before/after evidence
- Accessibility improvements
- Documentation corrections
- Small, focused changes — one thing per PR

## What to avoid

- Changes that require a build system, npm, or a server
- New dependencies (the app is intentionally zero-dependency)
- Features that only make sense for one person's workflow — open an issue to discuss first
- Breaking the 4-file architecture (`Focal.html`, `Focal.css`, `Focal_app.js`, `Focal_data.default.js`)

## Code style

- No frameworks, no build tools — vanilla JS, HTML, CSS only
- Navigate `Focal_app.js` using the section markers (e.g. `═══ KANBAN ═══`)
- All task data and user-configurable values live in `Focal_data.default.js` — nothing hardcoded in the JS or HTML
- No comments unless the *why* is non-obvious

## Versioning

Focal uses **Semantic Versioning (`MAJOR.MINOR.PATCH`)**:

| Bump | When |
|------|------|
| `PATCH` | Bug fix or doc correction — no new features |
| `MINOR` | New feature, backwards compatible (resets PATCH to 0) |
| `MAJOR` | Breaking localStorage schema change, full rewrite, rebrand |

Update `VER` and `VDATE` in `Focal_data.default.js` with every change. See [02-Architecture](docs/02-Architecture.md) for full details.

## Reporting bugs

Open a GitHub Issue with:
- Browser and OS
- Steps to reproduce
- What you expected vs. what happened
- Screenshot if relevant

---

*Questions? Email theluciano@gmail.com*
