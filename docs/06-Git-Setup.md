---
tags: [focal, git, setup, developer]
---

# Git Setup — Complete Guide

This guide covers everything from installing Git to submitting your first contribution. Follow it step by step.

---

## Part 1 — Install Git

**Windows:**
1. Go to https://git-scm.com/download/win
2. Download and run the installer — accept all defaults
3. Open **Git Bash** (search for it in the Start menu)
4. Verify: type `git --version` — you should see a version number

**Mac:**
1. Open Terminal
2. Type `git --version` — if not installed, it will prompt you to install Xcode Command Line Tools
3. Click Install and follow the prompts

**Linux:**
```bash
sudo apt install git          # Ubuntu/Debian
sudo dnf install git          # Fedora
```

---

## Part 2 — Configure Git (once, ever)

Open Git Bash (Windows) or Terminal (Mac/Linux) and run:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

This is just metadata for commits — it identifies who made each change.

---

## Part 3 — Get a GitHub account

If you don't have one:
1. Go to https://github.com
2. Click **Sign up**
3. Choose a username, email, and password

---

## Part 4A — If you just want to use Focal (no Git)

1. Go to the Focal GitHub page
2. Click **Code** → **Download ZIP**
3. Unzip anywhere on your computer
4. Open `Focal.html` in your browser
5. Done — no Git needed

---

## Part 4B — Clone the repo (to stay up to date)

Cloning lets you pull future updates with one command.

```bash
# In Git Bash or Terminal, navigate to where you want the folder:
cd Documents   # or wherever you want it

# Clone the repo:
git clone https://github.com/OWNER/focal.git

# Enter the folder:
cd focal

# Open the app:
# Windows: start Focal.html
# Mac:     open Focal.html
```

**To get updates later:**
```bash
cd focal           # make sure you're in the focal folder
git pull           # downloads and applies the latest changes
```

> **Important:** If you have a personal `Focal_data.js`, back it up before pulling — `git pull` will not overwrite it (it is in `.gitignore`), but it is good practice.

---

## Part 5 — Fork and contribute (for contributors)

A **fork** is your personal copy of the repo on GitHub where you can make changes freely.

### Step 1 — Fork on GitHub
1. Go to the Focal repo on GitHub
2. Click **Fork** (top right)
3. Click **Create fork**

### Step 2 — Clone your fork

```bash
git clone https://github.com/YOUR-USERNAME/focal.git
cd focal
```

### Step 3 — Add the upstream remote (optional but recommended)

This lets you pull in updates from the original repo:

```bash
git remote add upstream https://github.com/ORIGINAL-OWNER/focal.git
```

### Step 4 — Create a branch for your change

Never work on `main` directly. Always branch:

```bash
git checkout -b fix/typo-in-manual
# or
git checkout -b feature/dark-mode-toggle
```

Use lowercase, hyphens, and a short description.

### Step 5 — Make your changes

Edit files in your preferred text editor. Test by opening `Focal.html` in the browser.

### Step 6 — Stage and commit your changes

```bash
# See what changed:
git status

# Stage specific files (preferred — don't use git add . blindly):
git add Focal.css
git add docs/01-Getting-Started.md

# Commit with a meaningful message:
git commit -m "Fix: correct typo in manual getting-started section"
```

**Good commit messages:**
- `Fix: task modal not closing on Escape when empty`
- `Feature: add keyboard shortcut for Weekly Review`
- `Docs: update architecture diagram in 02-Architecture.md`

**Not useful:**
- `update stuff`
- `fix`
- `changes`

### Step 7 — Push to your fork

```bash
git push origin fix/typo-in-manual
```

### Step 8 — Open a Pull Request

1. Go to your fork on GitHub
2. You'll see a yellow banner: **"Compare & pull request"** — click it
3. Fill in:
   - **Title:** short description (same style as commit message)
   - **Description:** what you changed and why; steps to reproduce if it's a bug fix
4. Click **Create pull request**

---

## Keeping your fork up to date

Periodically sync your fork with the original repo:

```bash
# Fetch changes from the original:
git fetch upstream

# Switch to your main branch:
git checkout main

# Merge the upstream changes:
git merge upstream/main

# Push to your fork:
git push origin main
```

---

## Common Git commands — quick reference

| Command | What it does |
|---------|-------------|
| `git status` | Show changed files |
| `git diff` | Show what changed in each file |
| `git log --oneline` | Show recent commits |
| `git pull` | Get latest changes from remote |
| `git add filename` | Stage a file for commit |
| `git commit -m "message"` | Save staged changes |
| `git push` | Upload commits to GitHub |
| `git checkout -b name` | Create and switch to a new branch |
| `git checkout main` | Switch back to main branch |
| `git stash` | Temporarily save uncommitted changes |
| `git stash pop` | Restore stashed changes |

---

## Troubleshooting

**"Permission denied" when pushing:**
- Make sure you're pushing to your fork (`origin`), not the original repo (`upstream`)
- Check you're logged in: `git config user.email`

**Accidentally committed to main:**
```bash
# Move last commit to a new branch instead:
git branch my-fix
git reset HEAD~1 --soft
git checkout my-fix
```

**Merge conflict:**
Git will show conflict markers in the file like this:
```
<<<<<<< HEAD
your version
=======
their version
>>>>>>> upstream/main
```
Edit the file to keep what you want, remove the markers, then `git add` and `git commit`.

**Need to undo last commit (not yet pushed):**
```bash
git reset HEAD~1 --soft    # keeps your changes, undoes the commit
```

---

## Questions?

Open a GitHub Issue or email theluciano@gmail.com.
