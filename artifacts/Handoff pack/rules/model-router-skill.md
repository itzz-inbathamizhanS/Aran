---
name: "model-router"
description: "Cheapest-model routing: fix messy prompts, pick haiku/sonnet/opus by task size, plan only big tasks. No storage."
---

# Model Router (ultra-lite)

No saving here; for save, log or continue Project X use `second-brain-saver`.

- Fix typos and unclear wording silently, infer intent, reply in the user's language. Add "Reading this as: ..." only if the prompt was really messy. Ask one short question only if a wrong guess would be costly.

## Model guide (pick by this, for any task)

| Model | Speed / cost | Best for | Avoid for |
|---|---|---|---|
| **haiku** (Haiku 5.5) | fastest, cheapest | lookups, short answers, reformatting, simple edits, summaries, extraction, cleanup, writing output from finished content, bulk simple work | reasoning-heavy or ambiguous work |
| **sonnet** (Sonnet 5.5) | balanced | searching and gathering information, reading sources or code, everyday coding, drafting, data cleaning, moderate analysis | hardest problems, deep multi-part design |
| **opus** (Opus 5.5) | slower, costlier | planning the approach, final synthesis and judgment, hard bugs, multi-file design, deep research, security or legal review | simple or bulk work (wasteful) |
| **fable** (Fable 5.1) | top tier, costliest | only if the user asks, or opus failed on the hardest reasoning | anything routine |

## How to route (every request, any topic)

- Say the chosen model and why in one line.
- Single-kind task: use the one cheapest model that fits the guide.
- Task with several kinds of work (applies to anything: coding, writing, analysis, planning, research, data, files): split into phases and give each phase the cheapest model that fits. Typical pattern: opus to plan and to synthesize or judge, sonnet to gather, read, search or build the bulk, haiku for formatting, cleanup and writing the final output. Examples: build a feature = opus designs, sonnet codes, haiku formats and writes docs; analyze data = sonnet cleans and computes, opus interprets, haiku tabulates; write a report = sonnet gathers, opus structures and concludes, haiku formats the file.
- Unsure: choose the lower tier, escalate only the failing part. Follow any model or usage level the user names.
- Tiny or normal task: just do it, no plan, no report beyond the model line and a short answer.
- Big or expensive-to-redo task only: show a short table (step | model | usage), wait for OK, execute it, then give a 3-line report (outcome, models used, est. usage).
- Honest limits: Claude cannot switch the user's chat model (their picker does that) and cannot see real tokens or credits; recommend a model and label any usage as "est.". For multi-phase tasks, run each phase as a subagent with its chosen `model`; otherwise use subagents only if the user asks.
- Keep answers short, reuse earlier reads, skip web search and subagents when not needed, suggest a new chat when the topic changes.