# Aran Learn 15: UI Design Specs and Design Tokens

**Who:** everyone (read before redesigning the Aran console). **Time:** about 2 hours. **Before this:** [Learn 11: Frontend Basics](../../docs/learning/11-frontend-basics.md) helps but is not required.

**After this doc you will be able to:** read the [Aran UI Design Spec](../../artifacts/UI%20design%20spec/Aran%20-%20UI%20Design%20Spec.md), explain what a design token is and why the spec uses `{primary-color}` instead of a real colour, design every state of a screen (not only the happy one), connect each element on a screen to the API field that fills it, and hand a design to the people who will code it.

---

## 1. What a design spec is

A design spec is a written list of everything a screen must contain and how it must behave. It is not a picture. A picture shows one moment; a spec tells you every moment.

Think of a house. The photo in the brochure is the design. The architect's drawing, with each room, each socket, each pipe and which wall it runs through, is the spec. Builders work from the drawing, not the photo.

For a website, a spec answers six questions for every page:

| Question | Example from Aran |
| --- | --- |
| What is this page for? | Leak trace: find which system leaked a file |
| What sections does it have, in what order? | Header, input card, result card, evidence table |
| What data does each part show, and where does it come from? | "Most likely source" comes from `top.sink` in the reply of `POST /api/trace` |
| What can the user do? | Pick a sink, load its last 20 lines, paste text, press "Trace the leak" |
| What moves, and when? | The rank bars grow from 0 to their share when results arrive |
| What does it look like when things are not normal? | Loading, empty, error, disabled, and "no tokens found" |

The last row is where beginners lose marks. Judges and real users meet the empty and error screens far more often than designers expect.

## 2. Design tokens: names instead of values

A **design token** is a named value that the whole design shares. Instead of writing "this button is blue #2255FF", you write "this button uses `{primary-color}`". Somewhere else, once, you decide what `{primary-color}` is.

Why bother:

1. **Change once, update everywhere.** Pick a new primary colour and every button, link and active tab changes with it.
2. **Dark and light mode for free.** Each token has two values, one per theme. The screen never mentions either.
3. **Meaning survives.** `{alert-color}` tells a developer *why* the thing is that colour. `#E5484D` does not.
4. **The spec stays yours.** The Aran spec names every colour by role and leaves the choice to you in Claude Design.

Tokens come in a few families:

| Family | What it names | Aran examples |
| --- | --- | --- |
| Colour | A colour by its job | `{background-color}`, `{surface-color}`, `{text-color}`, `{real-data-color}`, `{token-color}`, `{leak-color}` |
| Type | Font family, size and weight by role | `{font-display}`, `{font-mono}`, `{text-size-body}` |
| Space | Gaps and padding on a fixed scale | `{space-1}` to `{space-8}` |
| Shape | Corner rounding and borders | `{radius-card}`, `{radius-pill}`, `{border-width}` |
| Depth | Shadows | `{shadow-card}`, `{shadow-popover}` |
| Motion | How long and how smoothly things move | `{motion-fast}`, `{motion-medium}`, `{ease-standard}` |

Aran has three colours that carry *meaning*, not decoration, and the whole story depends on them being easy to tell apart:

- `{real-data-color}`: a real customer value (raw Aadhaar, card, phone). "Danger, this is personal data."
- `{token-color}`: an Aran token that replaced it. "Safe."
- `{leak-color}`: something that got out raw, an alert, a failed check. "Something went wrong."

Rule: never use these three for anything else, and never rely on colour alone. Pair each with an icon or a word (✓ passes, ⊘ token, ! raw) so colour-blind users and printed pages still work.

**Try it.** Write down which token you would use for: a "Destroyed" key badge, a table row border, the number in a stat tile, the highlight behind an OTP in a log line. (Answers: `{leak-color}` with `{leak-bg-color}`; `{border-color}`; `{text-color}` with `{font-mono}`; `{real-data-bg-color}`.)

## 3. Components: build once, use everywhere

A **component** is a reusable piece of screen, like a stat tile or a button. The spec lists each component once, with its parts and its states, and every page then says "a row of four Stat tiles" instead of describing a tile again.

Each component in the spec has:

- **Anatomy:** its parts (a Stat tile has a value, a label and an optional note).
- **Variants:** versions for different jobs (a Button has primary, secondary, ghost and danger).
- **States:** default, hover, focus, pressed, disabled, loading, and for data parts empty and error.
- **Tokens:** which tokens it uses for each part.

In Claude Design, make the components first (one board), then the pages. If you design pages first you will draw ten slightly different buttons.

## 4. States: every screen has at least five

For every section that shows server data, design all of these:

| State | When | What to show |
| --- | --- | --- |
| Loading | The request is on its way | A skeleton (grey blocks in the shape of the content) or a spinner with a line of text |
| Empty | The request worked but there is nothing yet | A short sentence and the one action that fixes it ("No traffic yet. Send a first request.") |
| Success | Normal | The data |
| Error | The server said no, or is unreachable | The server's own message in `{leak-color}`, and how to retry |
| Disabled | The action is not allowed yet | The button greyed out, with a hint why ("Available once the immune layer has learned normal traffic") |

Aran also has a sixth, whole-app state: **starting up**. For the first few seconds after a cold start, `GET /api/health` returns `ready: false` and every other endpoint answers 503. The spec has a full-screen "Starting Aran" view for this.

## 5. Binding: where every number comes from

Aran has a strict rule: no number on screen is invented. Every value is computed by the server. So each element in the spec carries a **binding**: the endpoint and the field that fill it.

Read a binding like this:

```
Requests protected  ← GET /api/stats → requests        (poll every 3 s)
```

- `GET /api/stats` is the request the page makes.
- `requests` is the field in the JSON reply.
- "poll every 3 s" means the page asks again every three seconds, so the number stays live.

If you design something with no binding (a new chart, say), mark it **"needs endpoint"** so the team knows it needs server work first. Do not draw made-up numbers into a design that will be shown to judges as live.

You can see every endpoint and try it in your browser at `http://localhost:8000/docs` while the server runs (see [Learn 11](../../docs/learning/11-frontend-basics.md)).

## 6. Motion: what moves, and why

Animation in Aran explains; it does not decorate. Each animation in the spec says:

- **Trigger:** what starts it (page open, a reply arrives, the user presses Play).
- **What moves:** which element, from where to where.
- **Duration and easing:** as tokens (`{motion-medium}`, `{ease-standard}`).
- **Data:** which server field drives it (a bar grows to `share`, a gauge needle turns to `p`).
- **Reduced motion:** what to show instead when the user's system asks for less motion. Usually: jump straight to the final frame.

Step-by-step explainers (building a token round by round, running Verhoeff digit by digit) use one shared control bar: Play, Pause, Back one step, Forward one step, Skip to end, and a step counter like `7/15`. [Learn 13](../../docs/learning/13-animation-and-visual-explainers.md) shows how these are built.

## 7. Layout and screen sizes

The spec gives each page **zones** (header, main column, side column) and says how they stack on small screens. Aran uses three widths:

| Name | Width | Layout |
| --- | --- | --- |
| Phone | under 720 px | One column. Sidebar becomes a menu button. Tables scroll sideways inside their card. |
| Tablet | 720 to 1100 px | Sidebar visible but narrow; two-column sections stay two columns only if each column is at least 320 px |
| Desktop | over 1100 px | Sidebar plus a content column up to about 1200 px wide |

Two rules: no sideways scrolling of the whole page, ever; and wide SVG scenes (the firewall pipeline, the trace map) scroll inside their own frame on a phone.

## 8. Accessibility in one list

- Text contrast at least 4.5 to 1 against its background, in both themes. Check every colour token pair.
- Every button reachable with Tab and visible focus (`{focus-ring-color}`).
- Every chart and animated scene has a one-line text description (the spec gives one for each).
- Numbers and identifiers in `{font-mono}`, so digits line up and are easy to compare.
- Never colour alone: real, token and leak always come with an icon or a word.
- Respect reduced motion (section 6).

## 9. Handing off to code

When your design is done, the developer needs:

1. The token table with your chosen values for light and dark.
2. The component board with every state.
3. Each page, in each state, at phone and desktop width.
4. The spec, so they know the bindings and behaviour you did not draw.

Claude Design can export the design as a handoff bundle for Claude Code; the [Frontend Guide](../../artifacts/Frontend%20with%20Claude%20Design/Aran%20-%20Frontend%20Guide%20with%20Claude%20Design.md) walks through that step.

## 10. Practice tasks

1. Open the live console's Leak trace page. List its states (loading, empty, error, success, "no Aran tokens found"). Which ones does the current design draw? Which are missing?
2. Pick values for the six core colour tokens (`{background-color}`, `{surface-color}`, `{text-color}`, `{real-data-color}`, `{token-color}`, `{leak-color}`) for both themes. Check each text-on-background pair with a contrast checker.
3. Design the Stat tile component with all its states: loading, value, value with a `{leak-color}` tone, and "–" for no data.
4. For the Overview page, write the binding for every number you see, using the spec's section on Overview to check yourself.
5. Choose one animation in the spec and write its reduced-motion version.

## Further reading (free)

- Design Tokens Community Group, *Design Tokens Format* (W3C community draft): https://tr.designtokens.org/format/
- Material Design 3, *Design tokens*: https://m3.material.io/foundations/design-tokens
- W3C, *WCAG 2.2 at a glance*: https://www.w3.org/WAI/standards-guidelines/wcag/glance/
- MDN, *prefers-reduced-motion*: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- Nielsen Norman Group, *Empty states in complex applications*: https://www.nngroup.com/articles/empty-state-interface-design/
