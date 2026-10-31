# Aran Learn 24: Site Structure and Navigation

**For:** everyone who adds a page to Aran or changes a menu. **Time:** about 1 hour. **Before this:** Learn 11 (frontend basics) and Learn 23 (one UI for the console, Aran Cloud and the banks).

Aran grew page by page: the console, then the demos, then Aran Cloud and the demo banks. Each part had its own menu, so the site ended up with two pages called "Overview", menus that listed different things, and an order nobody chose on purpose. This doc teaches the four ideas behind the fix: **information architecture**, **one site map**, **clear names**, and **search in the menu**.

## 1. Information architecture

**Information architecture** (IA) is the plan of what pages a site has, how they are grouped, what they are called and what order they come in. A good IA follows the questions a visitor asks, in the order they ask them:

| Visitor's question | Aran group | Pages |
|---|---|---|
| What is this? | Start | Overview, Guided tour, How it works |
| Can I use it? | Firewall console | Live traffic, Customers & erasure, Leak trace, Immune layer, Results & tests |
| Show me something impressive | Live demos | With / without Aran, Beat the firewall, Leakage ledger, Card photo scan, Post-quantum, My data, Beat the firewall · phone |
| What does it change for a bank? | Demo banks | Side by side, Bank A · legacy, Bank B · with Aran |
| How would a bank buy it? | Aran Cloud | Get started, Quick connect, Workspace dashboard |
| (for the team) | Design review | Components board, States board |

Rules of thumb:

- **Five to seven groups**, each with **two to seven pages**. More than that and people stop reading.
- **Most important first.** The site now opens on Overview because it shows live numbers straight away; the tour is one click away, and presenter mode still starts on the tour.
- **Every page is in the menu.** A page that is only reachable from another page (like the judge's phone page) gets forgotten.

## 2. One site map, used everywhere

The order and names live in exactly one file, `app/ui/kit/sitemap.js`:

```js
{ id: 'banks', label: 'Demo banks', local: true, pages: [
  ['compare', 'Side by side', 'bankB', '/compare'],
  ['bankA', 'Bank A · legacy', 'bankA', '/'],
  ['bankB', 'Bank B · with Aran', 'bankB', '/'],
] },
```

Each page has an id, a label, the app that serves it and its path. The console's menu (`js/main.js`) and the menu in Aran Cloud and the banks (`kit/kit.js`) both call `A.site.menuHTML(...)`, so they cannot drift apart. Numbers (01 to 23) are worked out from the order, never typed by hand.

**To add a page:** add one line to the right group in `sitemap.js`. If it is a console page, also add it to `A.pages` as before. Run `node app/ui/tools/check-i18n.js`; it now reads the menu labels from the site map and tells you which Tamil and Hindi labels are missing.

Groups marked `local: true` (the banks and Aran Cloud) only appear where those services run: on localhost or a local network address, or when a server sets `window.ARAN_LINKS`. The hosted console runs the core only, so it never shows links that would go nowhere.

## 3. Clear names

Two pages with the same name confuse people and make "go to Overview" ambiguous in a demo. The fix is to name a page by **what it covers**:

| Before | After | Why |
|---|---|---|
| Overview (console) | Overview | The whole Aran core: every request on this server |
| Overview (Cloud dashboard) | Workspace summary | One bank's workspace only |
| Dashboard | Workspace dashboard | Says whose dashboard it is |
| Aran Cloud (landing) | Get started | Says what you do there |
| Demo bank (both tabs) | Bank A · legacy / Bank B · with Aran | Two tabs open at once need two names |

Labels are short, in sentence case, and use the visitor's words, not the code's.

## 4. Search in the menu

With 23 pages, scanning is slow, so the menu opens with a **Find a page** box:

- Typing filters the pages as you type (English or the translated label both match).
- **Enter** opens the first match.
- On a computer, the cursor is put in the box when the menu opens. On a phone it is not, so the keyboard does not cover the menu.
- **Esc** closes the menu.

Inside Aran Cloud and the banks, a **section bar** under the top bar shows "← Console", the section name, and the pages of that section, so you can move between Bank A, Bank B and Side by side in one click.

## Exercises

1. Add a "Roadmap" page to the Start group that links to the roadmap document. What number does "Live traffic" get after that?
2. Open the menu and type `bank`. Which pages show? Now switch to Tamil and type `வங்கி`.
3. Open the console at your laptop's network address (for example `http://192.168.1.5:8000`). Do the Demo banks and Aran Cloud groups show? Why?
4. Find another place in Aran where two things share a name, and suggest a clearer one.

## Words to know

| Word | Meaning |
|---|---|
| Information architecture | The plan of a site's pages, groups, names and order. |
| Site map | One list of every page in that order; here, `kit/sitemap.js`. |
| Single source of truth | Keep a fact in one place so copies cannot disagree. |
| Section bar | The bar of links to the pages in the current section. |
| Landing page | The page a visitor sees first. |
