# Aran: Whole-Site Improvements

Date: 31 Oct 2026. Branch `aran-ui-banks-cloud`. This pass follows the [site audit and menu order](../Site%20structure/Aran%20-%20Site%20Audit%20and%20Menu%20Order.md).

## How the site was checked

- All 23 pages: the console (17 pages), Bank A, Bank B, side by side, and the three Aran Cloud pages.
- Each page in dark mode on a computer (1440 px) and in light mode on a phone (390 px): 46 runs.
- Each run recorded console errors, failed requests, sideways overflow and an **axe-core** WCAG 2.1 AA scan, and saved a screenshot to look over by eye.
- The whole demo was also started with `docker compose up` and tested end to end: Bank B signed up a customer through Aran Cloud into the core.

## What was found and fixed

| # | Problem | Where | Fix |
|---|---|---|---|
| 1 | **Text too faint on red buttons:** white on red-orange was 3.4 : 1 (the minimum is 4.5) | Erase, Dump the database, Danger buttons and the Immune badge in dark mode | New token `--on-danger-color` (near-black in dark mode): about 6 : 1 |
| 2 | **Pills too faint in light mode:** 4.05 to 4.23 : 1 | Token, leak, success and warning pills; the Results heat map | The four light meaning colours made a little darker in `tokens.css`. Every app changed at once |
| 3 | **Wide tables and code could not be reached by keyboard** (16 places) | Results, Customers, Live traffic, How it works, Post-quantum, the tour, Quick connect, design boards | Every sideways-scrolling box gets `tabindex="0"`, `role="region"` and its own name (`js/ui.js`) |
| 4 | **Table columns with no heading** | Customers (the Erase column) and Results (E4 bar) | Headings added: "Action", and a screen-reader-only "Bits left, as a bar" |
| 5 | **Customer rows overlapped** when a name wrapped onto two lines | Customers & erasure, on a phone | Rows no longer shrink inside the scrolling list (`flex: none`) |
| 6 | **Language picker cut off** ("Englis") | Every console page, on a phone | Shows EN, த or हि on narrow screens |
| 7 | **Current page hidden** in the section bar | Aran Cloud and the banks, on a phone | The bar scrolls the current page into view |
| 8 | **One bank could tell that a person banks elsewhere** (audit item 5) | Aran Cloud `/v1/protect` → core | Identifier ownership is now looked up inside the calling tenant only (`scope`). New test `test_same_identifier_at_two_banks_reveals_nothing` |
| 9 | **`docker compose up` did not work** (audit item 6) | `Dockerfile`, `docker-compose.yml` | The image now has Aran Cloud, the bank and the SDK. Each service has the right command and its own data volume. Secrets are made on first start (`scripts/compose_entry.sh`), and Bank B creates its own workspace (`ARAN_AUTO_WORKSPACE=1`). Tested: all four services start healthy, Bank B protects a sign-up, and a restart reuses the same workspace |

Before: 25 serious accessibility problems over the 46 runs. After: none. No console errors, no failed requests, and no sideways overflow on any page.

## Round 2

| # | Problem | Where | Fix |
|---|---|---|---|
| 10 | **Heading levels skipped** from the page title (h1) to card titles (h3) | Every page | Card and section titles are now h2 with the same look (`class="h3"`); the tour's column titles moved up a level too. The scanner now reports **zero** problems of any kind on all 46 runs |
| 11 | **Three demos crashed** once Aran Cloud had enrolled customers in the core: Leakage ledger (500), Beat the firewall and the tour packet (KeyError). Those customers only have a ref, not an Aadhaar, card or phone number | `standout.py`, `engine.py` | Demos pick only customers with all four identifiers on file; the ledger answers 404 instead of crashing; `/api/customers` says which customers are `full`. New test `test_demos_skip_customers_enrolled_without_identifiers` |
| 12 | **The landing page was all zeros** on a fresh server, with a blank "Values found by type" card and a red alert card even with no alerts | Overview | First-run card with **Send 6 bank requests**, **Start normal traffic** and **Take the guided tour**; the numbers fill in from the live firewall. Empty cards say what will appear; the alert card turns red only when an alert is open |
| 13 | **No path through the site:** after a page, the only way on was the menu | Every page in every app | **Previous / Next** links at the foot of each page, in site order, with the page number and section (`A.site.pagerHTML`). Translated into Tamil and Hindi |

## Still open

- **`test_core_lockdown`** expects the core to refuse `/api` calls without the internal secret. It fails when the core is started with `ARAN_CONSOLE_OPEN=1`, which is how `run_demo.sh` and Docker Compose start it so that the console works. That is the intended trade-off for a core that only listens on this computer. The test should skip when console-open is set.

## Screenshots

| File | Shows |
|---|---|
| `01-customer-list-phone.png` | Customer rows no longer overlap; the language picker reads EN |
| `02-bank-a-phone.png` | Bank A on a phone, with the section bar scrolled to the current page |
| `03-workspace-summary-phone.png` | Aran Cloud workspace summary, light mode, darker token pills |
| `04-erase-buttons-dark.png` | Erase buttons with readable dark text |
| `05-results-desktop.png` | Results page, where the tables can now be scrolled by keyboard |
| `06-overview-first-run.png` | Overview on a fresh server, with the first-run buttons |
| `07-overview-after-send.png` | Overview after one click: a real Aadhaar and its token, live numbers |
| `08-pager.png` | Previous / Next links at the foot of a page |
| `09-pager-phone.png` | The same on a phone |

Beginner doc for these ideas: [Learn 25](Aran%20Learn%2025%20-%20Accessibility%2C%20Tenant%20Isolation%20and%20Containers.md).
