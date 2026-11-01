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

## Round 3

| # | Problem | Where | Fix |
|---|---|---|---|
| 14 | **The side-by-side result was buried:** after "Send to both", you had to scroll inside two small frames to see what each bank stored | Side by side | A result card under the form: "readable in its database" (Bank A 4 of 4, Bank B 0 of 4) and a field-by-field table of what was typed and what each bank stored, real values in red and tokens in teal |
| 15 | **Each frame repeated the whole bank page header** | Side by side | Inside the frames the eyebrow, intro text and page links are hidden; the frame header already names the bank |
| 16 | **Placeholders looked like typed numbers** (grey digits in a mono font) | Bank A, Bank B, side by side | Placeholders now read "e.g. …", "12 digits" or "or press Fill a valid sample" |
| 17 | **Buttons that act on nothing:** "Inspect record" and "Delete my data" were active with "No customers" | Bank A, Bank B | Disabled until the bank has a customer |
| 18 | **Crowded phone header** with a sound button that showed only dots | Console on a phone | The sound toggle is hidden on phones (it is for presenting on a big screen) |

The full check was run again after these changes: no errors, no sideways overflow, and zero accessibility problems on all 46 runs.

## Round 4

| # | Problem | Where | Fix |
|---|---|---|---|
| 19 | **Numbers but no trend:** the landing page showed totals only, so you could not see traffic arrive | Overview | A live chart, **Values in the last 30 minutes**: one bar per minute, values protected (teal) stacked under values left raw (red), with a legend, a tooltip per minute and a hidden table for screen readers. It is fed by a new `per_minute` series in `GET /api/stats` (new test). The two bar colours were checked with the palette validator for lightness, chroma, colour-blind separation and contrast, in dark and light |
| 20 | **The bank pages started with a form**, so the point of each bank was not visible at a glance | Bank A, Bank B | A row of live tiles from the bank's own database: customers, log lines, AI chats, and **Identifiers stored as Raw** (red, Bank A) or **Tokens** (Bank B). Hidden inside the side-by-side frames |

The full check was run again: no errors, no sideways overflow, zero accessibility problems on all 46 runs.

## Round 5: the live site (Render and Vercel)

The Render logs showed no server errors. The problems were in how the page behaved when the server went away: Render's free plan sleeps when idle and restarts on every deploy, and each restart wipes the demo data held in memory.

| # | Problem | Where | Fix |
|---|---|---|---|
| 21 | **The page said LIVE in green while the server was gone**, and the numbers silently stopped changing | Top bar, every console page | After two failed polls in a row, LIVE turns amber and reads **Reconnecting**, and a bar explains that the server may be waking up and that it retries on its own |
| 22 | **Requests piled up while the server was asleep**: every 3 seconds, even when the last call had not answered | `js/data.js` | A key that is still loading is skipped. While disconnected only `/api/health` is asked, slower each time (3 s up to 15 s) |
| 23 | **Hidden tabs kept polling** all day | Every console page | Polling stops while the tab is hidden and refreshes at once when you come back |
| 24 | **After a restart the data was gone with no explanation**: customers, alerts and counts reset to zero | Every console page | The server now sends a `boot` id in `/api/health` and `/api/stats`. When it changes, a bar says the server restarted and the demo data starts fresh. New test `test_health_and_stats_carry_the_same_boot_id` |
| 25 | **Unclear error text** when the host answered 502, 503 or 504 ("HTTP 504") | Any button that calls the server | "The Aran server is waking up or restarting. Try again in a few seconds." |
| 26 | **Names in mixed case** in the customer list (SURESH KULKARNI next to Rajesh Verma) | Customers & erasure | Names show in title case in lists. The data is unchanged; ALL CAPS names stay in the records on purpose, because real bank records contain them |
| 27 | **The sound button looked like a row of dots** when off | Top bar | A still equaliser icon when off; it moves when sound is on |
| 28 | **The menu would not scroll with the mouse wheel**; you had to drag its scrollbar. The same was true for the scrolling lists (customers, logs, arena feed) | Menu and lists, on a computer | The smooth-scroll library (Lenis) took every wheel turn for the page. The menu and dialogs are now marked to be left alone (`data-lenis-prevent`), and lists that scroll on their own get the wheel first (`allowNestedScroll`). The page itself still scrolls smoothly |

Tested with the console behind a Vercel-style proxy that can switch the server off: the bar appears within about 6 seconds, only 6 requests go out in 20 seconds while disconnected (before: about 30), the page recovers by itself, and a real server restart shows the restart bar. The full check found no errors, no sideways overflow and zero accessibility problems on all 46 runs.

## Round 6: interaction check (wheel, clicks, keyboard)

The accessibility scanner cannot see these, so every page was driven like a person: the mouse wheel over every scrolling box and over the page (computer and phone), a click on every button on a freshly loaded page, and the keyboard through the menu.

| # | Problem | Where | Fix |
|---|---|---|---|
| 29 | **The page would not scroll with the mouse wheel** when the pointer was over the tab row: the tabs sat 1px over the row's border, which gave the row 1px of its own vertical scroll that caught the wheel | Aran Cloud dashboard, Bank A, Bank B, Quick connect | The row scrolls sideways only, and its line is drawn so nothing spills over |
| 30 | **Cards on the design boards caught the wheel on a phone** for the same reason (9px of hidden vertical scroll) | Components and States boards, phone | Those cards scroll sideways only |
| 31 | **Page text showed through behind the logo** while scrolling (the top bar faded to transparent) | Every page in every app | Once you scroll, the top bar gets a solid, blurred backing and a hairline |
| 32 | **Customer buttons were replaced every few seconds** while traffic ran, so a click could land on a button that had just been swapped out | Customers & erasure | When the same customers are listed, only their counts update in place |
| 33 | **Tab could leave the open menu** and wander through the page behind it, and Escape left focus nowhere | Menu, every app | The page behind the open menu is inert, and closing it puts focus back on the Menu button |
| 34 | **Card scan failed on the live site**: the Tesseract OCR program was not in the server image | Scan a card | `tesseract-ocr` added to the Dockerfile |
| 35 | **"3. Simple filters fail" crashed (500)** on a server without the Loghub log sample | Guided tour, chapter 3 | Answers 503 with the fix to run instead of crashing |
| 36 | **The step-controls specimen did nothing** when pressed | Components board | It now steps and counts up, like the real one in the tour |

Checked again after the fixes: no wheel traps left on any page, every button reacts (the only silent ones are form buttons that show the browser's "fill in this field" note), and the full check found no errors, no sideways overflow and zero accessibility problems.

## Round 7: speed, steadiness and polish

Every console page was measured in a real browser: bytes downloaded, time to the largest text (LCP), layout shift (CLS: how much the page jumps while loading; under 0.1 is good) and time the main thread was blocked.

| # | Problem | Measured before | Fix | After |
|---|---|---|---|---|
| 37 | **Nothing was compressed**: every visit downloaded about 680 KB | 680 KB per page | Gzip on the server (`GZipMiddleware`); Vercel compresses on its own | 280 KB (computer), 230 KB (phone) |
| 38 | **Every visit re-checked every file** (`no-cache` on all scripts) | 33 checks per page view | Files asked for with `?v=N` are cached for a year (`immutable`); `index.html` bumps N on each change, so a new version is still picked up at once | Repeat visits load scripts from the browser cache |
| 39 | **Pages jumped as the web fonts arrived**: the big title rewrapped from three lines to two and pushed everything up | CLS 0.26 to 0.41 on 12 pages | Fallback fonts sized to the web fonts (`size-adjust`: Grotesk 92.8% of Arial, Martian Mono 116.6% of Courier New), and the first page waits up to 1.5 s for the fonts | CLS 0 on most pages, at most 0.05 (one tour chapter on a phone: 0.2, from its animation) |
| 40 | **The first visit after the server slept said "Server unreachable"** | | A **Waking Aran** screen that explains free hosting sleeps after 15 minutes, with a seconds counter, and the top bar says Reconnecting | |
| 41 | **Shared links had no preview** in WhatsApp, LinkedIn or Slack | | Open Graph and Twitter tags, a 1200×630 preview image (`og.png`), a fuller description and a theme colour | |
| 42 | **"Page not found" was a dead end** and the tab title read "Aran · Aran" | | A real title, the address that was not found, and buttons to Overview and to all pages | |
| 43 | **Screen readers stayed at the old spot** after moving to another page | | Focus moves to the new page | |
| 44 | **Printing** included the top bar, buttons and 3D scenes on black | | A print layout: content on white, links printed with their address | |
| 45 | **Render's health ping got "405 Method Not Allowed"** (`HEAD /`) | | The pages answer `HEAD` as well as `GET` | |

## Round 8: security headers, phones and the design boards

| # | Problem | Fix |
|---|---|---|
| 46 | **No browser security headers**: any site could frame the console, and the browser would run scripts from anywhere | The server now sends a Content Security Policy (scripts only from this site), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera and microphone only for this site), `Cross-Origin-Opener-Policy` and HSTS. Every page, tour chapter, the webcam scan and present mode were checked with zero policy violations |
| 47 | **Small tap targets on phones**: buttons, tabs and menu links under 44 px | On touch screens they are now at least 44 px high (40 px for menu sub-links) |
| 48 | **A word ("learning") overflowed its stat tile** on the Immune page | Words in a number tile use a smaller size |
| 49 | **Components board: most specimens did nothing** when clicked | Every specimen now works: buttons answer, "Run a scan" shows the busy state, chips toggle, tabs switch (also with the arrow keys), the radio reports its value, the sink field is checked as you type, the card field groups digits, rows select by click or Enter, the alert can be confirmed, marked normal and reset, the Merkle proof lights up hash by hash, the key breaks and comes back, and the confirm dialog says what was chosen |
| 50 | **States board: the full-screen previews were only named in the text** | Each preview has an **Open full screen** button (a new "waking from sleep" preview was added), **Check the real server now** calls `/api/health` and says which state the server is in, the job card cycles through never run, running, passed and failed, and the immune preview switches between idle, learning and watching and starts on the real mode |

Checked with 23 automated clicks (all pass), the accessibility scanner on both boards in dark at 1440 px and light at 390 px (zero problems) and no page errors.

## Still open

- **`test_versus_tokenises_everything_and_traces_the_leak` fails about one run in five** (also before round 8): with randomly generated customers, the "With Aran" side sometimes leaves one identifier raw. It needs a fixed random seed in the test and a look at which generated value slips through.
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
| `10-side-by-side-stored.png` | Side by side after "Send to both": what each bank stored |
| `11-overview-chart-dark.png`, `11-overview-chart-light.png` | The per-minute chart with its tooltip, dark and light |
| `12-bank-a-tiles.png` | Bank A's live tiles |
| `13-reconnecting-bar.png` | LIVE turns to Reconnecting while the server is away |
| `14-server-restarted-bar.png` | The notice after a server restart |
| `15-solid-top-bar-on-scroll.png` | The top bar with a solid backing once the page scrolls |
| `16-waking-screen.png` | The first visit while the server wakes up |
| `17-link-preview-image.png` | The picture shown when the site is shared |

Beginner doc for these ideas: [Learn 25](Aran%20Learn%2025%20-%20Accessibility%2C%20Tenant%20Isolation%20and%20Containers.md).
