---
description: Stage, commit, and push all changes to GitHub (the sync loop)
---

Commit and push the current changes to GitHub — the standard sync loop:

1. `git add .`
2. `git commit -m "<message>"`
3. `git push`

Commit message:
- If you pass an argument, use it verbatim (`/githubshop fixed shipping bug` → message "fixed shipping bug").
- If no argument was given, look at `git status` and `git diff --stat` first and write a short, specific summary of what actually changed. Never use the literal text "what changed".

After pushing, run `git status` and confirm the branch is in sync with `origin/main`, then report the commit hash and a one-line summary of what was pushed.