# Aran: Main Branch Cleanup

**Date:** 4 Nov 2026. **Read first:** [Learn 32](../../docs/learning/32-repo-structure-and-a-clean-main.md).

The goal was a main branch that shows only what Aran is today, with every fact and link checked.

## Backup

Before any change, main (commit `dfc3249`) was copied to the branch `Pre_copy_of_main`. A second identical copy, `pre-copy-of-main`, also exists. Any file can be brought back with `git checkout Pre_copy_of_main -- <path>`.

## What moved to archive/

Moved with `git mv`, so history is kept. Nothing was deleted.

| From | To | Why |
| --- | --- | --- |
| `iravora-void/` | `archive/iravora-void/` | A separate website, not part of Aran |
| `site-research/` | `archive/site-research/` | Early design notes, now built |
| `.agent/` | `archive/agent-skills/` | Design skill files from an earlier tool setup, not used by Aran |
| `docs/persistence_lite_plan.md`, `saas_foundation_plan.md`, `ui_plan.md`, `integration_diff.md`, `design_skills_inventory.md` | `archive/docs/` | Plans that are now built |

## What stayed and why

- All code folders (`app/`, `aran_cloud/`, `aran_edge/`, `aran_sdk/`, `demo_bank/`, `research/`, `scripts/`, `deploy/`) stay where they are, because Render and Vercel start the apps from those paths.
- `ui-design/` stays: it is the source of the console design.
- `Home.md`, `notes/`, `templates/` and `.obsidian/` stay: they are the Obsidian vault.

## README rewrite

- A "Try it live" table with all five live links (console on Vercel and Render, Aran Cloud, Bank A, Bank B).
- A "What is built" section: the console, Aran Cloud and the demo banks, and the firewall-as-a-service features.
- An up-to-date repository layout (it said "fifteen learning docs" and left out the banks, SDK, edge, deploy and scripts folders).
- It no longer says the banks and Cloud UI live only on the `aran-ui-banks-cloud` branch: they are on main.
- The research results tables are kept word for word.

## Links fixed

- The research doc linked to the deleted branch `claude/project-thread-wm33w9`; it now points to `main`.
- Nine links in the artifacts index pointed to `aran-ui-banks-cloud` for files that are on main; they now point to `main`.
- Copies of docs in `artifacts/` used `../learning/...` paths that did not exist; they now point to `../../docs/...`.
- A script checked every relative link in the README, the archive README, Learn 32 and Home.md: none is broken.

