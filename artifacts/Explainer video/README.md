# Aran - Explainer Video

**[Aran - Explainer Video.mp4](Aran%20-%20Explainer%20Video.mp4)** (24 min, 1920×1080, 30 fps, English voice-over) with **[English subtitles](Aran%20-%20Explainer%20Video.srt)**.

The whole project explained from zero: the problem, the research, how Aran works, how it was built, the results and what comes next. Every technical word is drawn as a picture while it is spoken, and a small card in the top right gives its meaning in plain words. Subtitles are also burned into the picture, so it can be watched with the sound off.

## Chapters

| Starts at | Chapter | Title |
| --- | --- | --- |
| 0:00 | Welcome | Aran: a firewall for data |
| 0:38 | Chapter 1 | The problem |
| 1:42 | Chapter 2 | What we protect |
| 2:46 | Chapter 3 | The basic words |
| 3:39 | Chapter 4 | Why simple search fails |
| 4:37 | Chapter 5 | How the research was done |
| 5:58 | Chapter 6 | Check digits |
| 7:14 | Chapter 7 | Mechanism 1: tokens that always fail |
| 8:39 | Chapter 8 | Mechanism 3: tokens that name the leaker |
| 9:39 | Chapter 9 | Mechanism 2: detection as evidence |
| 11:12 | Chapter 10 | The AI layer |
| 12:22 | Chapter 11 | Disguises and typos |
| 13:17 | Chapter 12 | Mechanism 4: the leakage ledger |
| 14:16 | Chapter 13 | Mechanism 5: erasure with proof |
| 15:37 | Chapter 14 | The immune layer |
| 16:51 | Chapter 15 | The AI gateway |
| 17:47 | Chapter 16 | Post-quantum security |
| 19:04 | Chapter 17 | One request, start to finish |
| 20:09 | Chapter 18 | How it was built |
| 21:26 | Chapter 19 | Results |
| 22:28 | Chapter 20 | Honest limits and next steps |
| 23:29 | Summary | Aran in thirty seconds |

## How it is made

- **Voice:** Kokoro, a small open text-to-speech model, running locally on the CPU. No text was sent to an outside service.
- **Pictures:** an SVG player where each frame is drawn from the time alone, and every animation is tied to the spoken line it explains.
- **Video:** headless Chromium takes one picture per frame and ffmpeg encodes them, then adds the voice.
- All numbers on screen are real: the Loghub log lines, the FF1 token rounds, the hashes and the Merkle tree were computed, not typed in. All identifiers shown are generated test values with valid check digits, never real people's.

[Learn 21](../../docs/learning/21-making-the-explainer-video.md) explains every step and how to change a line. The source is in [source/](source/): `script.txt` (the narration), `tts.py` (voice), `player/` (the animation), `render.js` (frames to video). The voice model files and the generated audio are not in the repo; To rebuild the voice, install `kokoro-onnx` and put `kokoro-v1.0.onnx` and `voices-v1.0.bin` (from the kokoro-onnx project's model-files-v1.0 release) in `source/models/`.
