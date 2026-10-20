---
tags: [thread, aran, video]
date: 2026-10-19
updated: 2026-10-20
status: done
---
# Explainer video

**Prompt (clean):** a full video of the project with correct, clear animation and a voice-over, so everyone can follow without missing anything; every technical word explained visually.

- Video: [Aran - Explainer Video](../../artifacts/Explainer%20video/README.md) (MP4, about 24 min, 1080p, 22 chapters) with English subtitles (SRT, and burned in).
- Voice: Kokoro (local, open text-to-speech, voice af_heart). Pictures: SVG player where each frame is a function of time, every animation tied to its spoken line, a plain-words card for each technical term.
- Real data on screen: Loghub log lines, FF1 token rounds, SHA-256 and HMAC values, the Merkle tree. Identifiers are generated test values only.
- How it is made, and how to change a line: [Learn 21](../../docs/learning/21-making-the-explainer-video.md). Source in `artifacts/Explainer video/source/`.

## v2: the full course (2026-10-20)

**Prompt (clean):** a much more detailed video, over an hour, that is easy to follow for someone with no technical background: plain words, an everyday example for every technical term, clean non-flashy colours, much more motion, real incidents that make the problem and the solution strong, and everything explained from zero.

- Video: [Aran - Explainer Video v2](../../artifacts/Explainer%20video%20v2/README.md): 76.6 min, 6 parts, 61 chapters. The repo holds the parts (Part 4 is split into 4a and 4b to stay under GitHub's 100 MB limit); the single full video is kept in the project files and on the laptop (`D:\Aran`).
- Style: light paper background, ink text, six calm colours, no glow or gradients; recurring characters (Ravi, the clerk, the security officer, the attacker, vendor staff); a moving camera; a word card for every term; a recap after every chapter.
- Real incidents: Hitachi Payment Services 2016, SBI open server 2019, Juspay 2020, SITA/Air India 2021, CoWIN Telegram bot 2023, Star Health 2024; Twitter 2018, Facebook 2019, Samsung 2023; and a chapter on what Aran would and would not have changed in each.
- Voice: Kokoro af_heart at speed 0.85 (about 132 words a minute). Token maths checked by running it: the right Verhoeff digit for body 0982 6158 641 is 9, so the secret 3 gives the wrong last digit 2.
- Source in `artifacts/Explainer video v2/source/`; [Learn 21](../../docs/learning/21-making-the-explainer-video.md) updated for v2.

Back to [[Threads]]
