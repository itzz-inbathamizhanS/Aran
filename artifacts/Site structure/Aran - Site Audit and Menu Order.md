# Aran site audit: pages, order and menu

Date: 31 Oct 2026. Branch `aran-ui-banks-cloud`. Checked by opening every route of the console (port 8000), Aran Cloud (8100), Bank A (9001) and Bank B (9002) in a browser with all four services running, on desktop (1440 px) and phone (390 px), in dark and light, and by checking every link on the main pages.

## What was wrong

| # | Problem | Where |
|---|---|---|
| 1 | Two pages were called **Overview**: the console's live overview and the new Cloud dashboard's first tab. | Console `#overview`, Cloud `/dashboard` |
| 2 | **Two different menus.** The console menu listed 14 console pages and nothing else; the Cloud and bank menus listed 7 apps and no console pages. From the console there was no link at all to the banks or to Aran Cloud. | `js/main.js`, `kit/kit.js` |
| 3 | **Order nobody chose.** The site opened on the guided tour with Overview second, "How it works" sat between the tools and the demos, the banks came after Aran Cloud in the switcher, and Bank A and Bank B came before the side-by-side page that introduces them. | Menus and app switcher |
| 4 | **Pages missing from the menu:** the judge's phone page (`#arena`) and the two design boards were only reachable by typing the address. | Console |
| 5 | **Unclear names:** "Dashboard" (whose?), "Aran Cloud" for the sign-up page, and both bank tabs titled "Demo bank · Aran". | Cloud and banks |
| 6 | On the hosted site (core only) the new links to Cloud and the banks would have pointed at ports that do not exist there. | `kit/kit.js` |
| 7 | **Bug:** the Post-quantum page failed (HTTP 500 from `GET /api/pqc/receipt`) as soon as any customer had been erased, because the ML-DSA public key is stored as PEM and the size check decoded it as plain base64. This also affects `main` and the live site. | `app/server/standout.py` |

No other errors: every console route, every Cloud and bank page, and every link returned what it should, with no script errors and no sideways scrolling on a phone.

## What changed

- **One site map** (`app/ui/kit/sitemap.js`) with 6 groups and 23 pages, in this order. Both the console menu and the Cloud and bank menus are drawn from it, so they always match.

| Group | Pages |
|---|---|
| Start | 01 Overview · 02 Guided tour · 03 How it works |
| Firewall console | 04 Live traffic · 05 Customers & erasure · 06 Leak trace · 07 Immune layer · 08 Results & tests |
| Live demos | 09 With / without Aran · 10 Beat the firewall · 11 Leakage ledger · 12 Card photo scan · 13 Post-quantum · 14 My data · 15 Beat the firewall · phone |
| Demo banks | 16 Side by side · 17 Bank A · legacy · 18 Bank B · with Aran |
| Aran Cloud | 19 Get started · 20 Quick connect · 21 Workspace dashboard |
| Design review | 22 Components board · 23 States board |

- **The site opens on Overview.** The logo goes there too. Presenter mode still starts on the guided tour.
- **New menu:** a "Find a page" search box (type to filter, Enter opens the first match), groups in columns with their number range, the current page and its group marked, pages in other apps marked ↗, and a footer with previews (starting screen, load failed, presenter mode) and links. On a phone the groups stack in one column with 44 px rows.
- **Section bar** in Aran Cloud and the banks: "← Console", the section name, then that section's pages.
- **Renamed:** the Cloud tab "Overview" is now **Summary** (page title "Workspace summary"), and the dashboard is "Workspace dashboard", the landing page is "Get started", and the bank tabs are "Bank A · legacy · Aran" and "Bank B · with Aran · Aran".
- **Hosted site:** the Demo banks and Aran Cloud groups only show on localhost, a local network address, or when a server sets `window.ARAN_LINKS`.
- **Translations:** every new menu label is in Tamil and Hindi; `check-i18n.js` now reads labels from the site map (133 of 133 translated).
- **Bug fix:** `/api/pqc/receipt` reads the PEM key correctly, with a new test (`test_pqc_receipt_reports_sizes_after_an_erasure`).
- `scripts/run_demo.sh` prints the addresses in the same order as the menu.

How to keep it this way: [Learn 24 - Site Structure and Navigation](../../docs/learning/24-site-structure-and-navigation.md).
