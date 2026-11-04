# Aran Learn 32: Repo Structure and a Clean Main Branch

**For:** the whole student team, especially new members. **Time:** about 45 minutes. **Before this:** Learn 30 (what Aran does) and a basic idea of what Git is.

Aran lives in one folder called a repository. That folder holds code, notes, research and write-ups. This doc explains how the folder is organised, why the main branch must stay clean, and how we change it safely.

## 1. Repository, branch, main and backup

A **repository** (repo) is a project folder that Git tracks. Git keeps every file and every past change.

A **branch** is a line of work. You can make changes on a branch without touching anyone else's work. Branches join again when a change is **merged**.

The **main branch** (called `main`) is the official line. It is the version judges, the bank team and the public see first. Our live sites on Render and Vercel are set up from main.

A **backup branch** keeps an old state on purpose. Before the cleanup, we saved the whole old main as the branch `Pre_copy_of_main`. A second identical copy, `pre-copy-of-main`, also exists. If you ever need an old file, look there first.

## 2. Why main should show only current, correct facts

New readers and judges read main's README first. If the README talks about a phase we finished months ago, or links to a file we deleted, they stop trusting the rest of the project.

| Reader | What they look for first | What goes wrong with a messy main |
|---|---|---|
| Judge | README, results, how to run it | Doubt about which numbers are real |
| New student | Where things live | Hours lost in old folders |
| Bank partner | Current setup and deploy steps | Following a dead guide |

So main shows what is true today. Old plans, old results and side projects go to `archive/` or to a backup branch.

## 3. What goes where in Aran's main

| Folder or file | What it holds |
|---|---|
| `app/` | The core firewall server and the console (web screen) |
| `aran_cloud/` | The SaaS and firewall as a service (Learn 30) |
| `aran_edge/` | The self-hosted data plane that runs inside a bank |
| `aran_sdk/` | The client library that apps import to call Aran |
| `demo_bank/` | The Bank A and Bank B demo |
| `deploy/`, `Dockerfile`, `docker-compose.yml` | Running Aran (servers, containers, nginx) |
| `scripts/` | Start scripts that Render uses |
| `research/` | Experiments behind the results |
| `data/` | Data files for the experiments and demos |
| `docs/` | Plans and learning docs (this file is here) |
| `artifacts/` | Write-ups, PDFs and screenshots |
| `ui-design/` | Source of the console design |
| `Home.md` | Front page of the Obsidian vault |
| `notes/` | Working notes |
| `templates/` | Blank templates for new notes and docs |
| `.obsidian/` | Settings for the Obsidian vault |
| `archive/` | Old side projects and finished plans (moved here, not deleted) |

## 4. Moving versus deleting

- **`git mv old new`** moves a file and keeps its history, so `git log` still shows its past.
- **Deleting** removes a file from main, but its old versions stay in history and on `Pre_copy_of_main`.
- **Bringing a file back** from the backup:

```
git checkout Pre_copy_of_main -- path/to/file
```

This copies that file from the backup into your working folder. Review it, then commit it on a branch like any other change.

## 5. Why we did not move code folders

Render and Vercel start the apps from fixed paths, such as `scripts/apps_entry.sh`. If we moved `app/` or `aran_cloud/`, those paths would break and the live site would fail to start. So code folders stay where they are. We tidy documents, notes and old projects. A future code move needs its deploy settings updated in the same change.

## 6. Dead links

A **dead link** points to something that no longer exists: a deleted branch, a moved file or a renamed folder. For example, a doc might link to `research/old_plan.md` after that file moved to `archive/`.

How to find them:

- Search for the old name: `grep -rn "old_plan" docs/` (`-r` searches folders, `-n` shows line numbers).
- Open each relative link in Obsidian or on GitHub. A broken link shows an error or an empty page.
- Fix it by pointing to the new path, or by adding one line saying the file is now in `archive/`.

## 7. Pull requests

Never change main directly. Use this flow:

| Step | What you do | Example |
|---|---|---|
| 1. Branch | Start a branch from main | `git switch -c docs/fix-links` |
| 2. Commit | Save your change on the branch | `git add docs/` then `git commit` |
| 3. Push | Send the branch to GitHub | `git push -u origin docs/fix-links` |
| 4. Open a PR | Ask to merge the branch into main | On GitHub, "New pull request", base `main` |
| 5. Review | A teammate reads the diff and comments | Fix what they ask |
| 6. Merge | Combine the change into main | Press merge after approval |

A pull request shows exactly what will change in main before it does.

## Practice

1. Pick five files in the repo. For each one, name the row in section 3 it belongs to. If you cannot decide, say why.
2. Run `git branch --list` (this only reads). Find `Pre_copy_of_main` and `pre-copy-of-main`. Run `git rev-parse Pre_copy_of_main pre-copy-of-main` and check whether they show the same commit.
3. Pick a file in `archive/`. Write the `git checkout` command that would bring it back, then explain why this does not change main until you open and merge a pull request.

## Words to remember

repository, branch, main, backup branch, merge, `git mv`, history, dead link, pull request (PR), review, archive, deploy path.
