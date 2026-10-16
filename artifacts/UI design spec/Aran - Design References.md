# Aran: Design References (real, hand-made sites)

**For:** the new Aran UI design. Use this with the [UI Design Spec](Aran%20-%20UI%20Design%20Spec.md).

These are sites built and refined by real design teams over years, not one-shot AI templates. Each one lists what to study in it and which Aran page it helps with. Open them, take screenshots of the parts you like, and paste the screenshots into Claude Design as references (with the colour placeholders from the spec, not their colours).

---

## 1. How to spot "AI slop" and avoid it

A generated-looking site usually has most of these. Aran should have none of them.

| Slop sign | Do this instead |
| --- | --- |
| Purple-to-blue gradient hero, glowing blobs, glassy cards everywhere | One quiet background, flat cards, colour only where it carries meaning (real data, token, leak) |
| Vague headline ("Revolutionising data security with AI") | A concrete claim with a number ("Real numbers pass the checksum. Aran's tokens never do.") |
| Three identical feature cards with emoji icons | Show the real thing working: a live log line before and after |
| Fake dashboard numbers ("99.9% secure") | Only live server values (every binding in the spec) |
| Stock 3D shields, padlocks, hooded hackers | Your own diagrams drawn from real data (pipeline, trace map, radar) |
| Every section the same height, centred text, same spacing | A clear hierarchy: one big idea per screen, dense tables where people work |
| Animations that move for no reason | Animation that explains a step (a token being built, a key shattering) |
| Generic sans font at one weight | A deliberate pair: a display face, a readable body face and a strong monospace for digits |

---

## 2. Product dashboards (for Overview, Live traffic, Immune layer)

| Site | Link | What to study | Aran page |
| --- | --- | --- | --- |
| Linear | https://linear.app | Calm dark UI, tight spacing, keyboard-first, subtle motion, crisp sidebar | Shell, all console pages |
| Vercel | https://vercel.com | Black-and-white restraint, monospace for technical values, deployment logs | Live traffic, Results & tests (job output) |
| Sentry | https://sentry.io | Error and alert lists with context, stack-trace style detail panels | Immune layer alerts, Live traffic detail |
| PostHog | https://posthog.com | Playful but honest product site; dense analytics screens | Overview, Results |
| Grafana | https://grafana.com | Time-series panels, stat tiles, thresholds on charts | Overview stat rows, Immune radar |
| Tailscale | https://tailscale.com | Explaining a network product with simple diagrams; plain words | Guided tour chapter 1 (pipeline) |
| Supabase | https://supabase.com | Developer dark theme, code blocks, table editor | Customers table, API docs feel |
| Raycast | https://raycast.com | Polished dark product shots, compact lists, command palette | Shell, lists |
| Resend | https://resend.com | Very minimal dark marketing site; strong type | Tour headlines |

## 3. Security and data sites (for the tone of Aran)

| Site | Link | What to study | Aran page |
| --- | --- | --- | --- |
| Cloudflare Radar | https://radar.cloudflare.com | Real internet-security data shown live, maps, clear charts, honest captions | Overview, Immune layer, Leak trace |
| 1Password | https://1password.com | Trust and security explained without fear-mongering | Tour chapters 2 and 9 |
| Signal | https://signal.org | Privacy product with almost no decoration | Tone of all copy |
| GitHub Security | https://github.com/security | Security features shown as real UI, not illustrations | How it works |
| Oxide Computer | https://oxide.computer | Engineering-led site, technical diagrams, monospace done well | How it works, Under the hood |
| TigerBeetle | https://tigerbeetle.com | Financial database explained with hard numbers and bold type | Evidence chapter, Results |

## 4. Finance and Indian fintech (for the banking feel)

| Site | Link | What to study | Aran page |
| --- | --- | --- | --- |
| Stripe | https://stripe.com | Gold standard for explaining payments; precise diagrams; docs | Tour, How it works |
| Stripe Docs | https://docs.stripe.com | Two-column docs with live code and request/response panels | Live traffic (before/after), API reference |
| Mercury | https://mercury.com | Banking UI that feels calm and premium; tables of transactions | Customers & erasure |
| Ramp | https://ramp.com | Finance dashboards, clear numbers, strong hierarchy | Overview |
| Wise | https://wise.com | Plain-language money explanations, friendly but exact | Tour copy |
| Razorpay | https://razorpay.com | Indian payments product, UPI flows, Indian number formatting | Live traffic samples, Overview |
| Zerodha Kite | https://kite.zerodha.com | Extremely fast, minimal Indian trading UI; dense data done cleanly | Tables, stat tiles |
| Setu | https://setu.co | Indian banking APIs (account aggregator, UPI) presented for developers | API reference feel |

## 5. Animated and interactive explainers (for the guided tour)

| Site | Link | What to study | Aran chapter |
| --- | --- | --- | --- |
| Bartosz Ciechanowski | https://ciechanow.ski | The best step-by-step interactive explainers on the web; every slider changes a real model | Check digits, Building a token |
| Red Blob Games | https://www.redblobgames.com | Algorithms explained with small interactive diagrams you can drag | Check digits, Disguises |
| Nicky Case | https://ncase.me | Playable explanations, friendly tone, one idea at a time | Immune system, Erasure |
| Distill | https://distill.pub | Machine-learning ideas explained with interactive figures | Finding data (detector clues) |
| The Pudding | https://pudding.cool | Data stories with scroll-driven animation | Problem, Evidence |
| Our World in Data | https://ourworldindata.org | Clear, honest charts with sources under every one | Evidence, Results |

## 6. Galleries curated by people (to find more)

| Gallery | Link | Use it for |
| --- | --- | --- |
| Minimal Gallery | https://minimal.gallery | Hand-picked minimal sites |
| SiteInspire | https://www.siteinspire.com | Large curated showcase, filter by style and type |
| Godly | https://godly.website | Bold, high-craft sites with motion previews |
| Land-book | https://land-book.com | Landing pages by category |
| Mobbin | https://mobbin.com | Real screens from shipped apps, searchable by pattern (tables, empty states, alerts) |
| Refero | https://refero.design | Real web app screens by pattern; good for dashboards and states |
| Dark Mode Design | https://www.darkmodedesign.com | Dark themes only, since Aran defaults to dark |

---

## 7. What to take from each, page by page

| Aran page | Look at first | Steal this idea |
| --- | --- | --- |
| Shell (sidebar, top bar) | Linear, Raycast | Narrow sidebar, quiet active state, one strip of status text |
| Guided tour | Ciechanowski, Red Blob Games, Stripe | One idea per screen, step controls, diagram first and text second |
| Overview | Cloudflare Radar, Grafana, Ramp | Big live numbers with a small note each; one chart per idea |
| Live traffic | Stripe Docs, Vercel logs | Request on the left, result on the right, monospace everything |
| Customers & erasure | Mercury, Zerodha Kite | Dense, readable table; one clear destructive action with a confirm |
| Leak trace | Cloudflare Radar, Sentry | A verdict line first, evidence table second |
| Immune layer | Grafana, Sentry | Mode badge, threshold bands, alert list with "resolve" actions |
| Results & tests | Our World in Data, Vercel | Source and date under every table; live job output |
| How it works | Oxide, TigerBeetle | Technical diagrams and hard numbers, no stock art |

## 8. How to use these in Claude Design

1. Pick 3 to 5 references, not 30. Too many makes a blend that looks like nothing.
2. Screenshot only the part you want (a table, a stat row, a step control), not the whole page.
3. In Claude Design, paste the screenshot and say what you want from it, for example: "Use the table density and row hover from this screenshot. Use our tokens, not its colours."
4. Keep the three meaning colours (`{real-data-color}`, `{token-color}`, `{leak-color}`) for meaning only.
5. Check each screen against the slop list in section 1 before you move on.

All links were chosen as long-running, human-designed sites at the time of writing (October 2026). If one has changed, use the galleries in section 6 to find a replacement.
