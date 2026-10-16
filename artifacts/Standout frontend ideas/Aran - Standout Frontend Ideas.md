# Aran: frontend ideas that make it stand out

Most teams will show a dashboard with charts and a chatbot. Aran's console already has a 3D hero, an animated tour and live data, so looks alone will not separate it. What will: **judges touching it themselves, seeing the "without Aran" disaster next to the "with Aran" result, and features no other team can copy because they rest on Aran's own maths (check digits, FF1 tokens, Merkle receipts, the leakage ledger, post-quantum keys).**

Every idea below reuses code that already exists in the repo; the "Needs" column says what is new.

## Top 3 (build these first)

| # | Idea | Why it stands out | Needs |
| --- | --- | --- | --- |
| 1 | **"Beat the firewall" from your phone.** A QR code on the big screen opens a mobile page. Judges type, paste or **speak** a message with a hidden Aadhaar, PAN, card or OTP in any disguise (spaced, words, Tamil digits, typos). It appears live on the big screen as caught or missed, with a scoreboard: attempts, caught, and the trickiest disguise so far. | Judges play instead of watch, and every attempt is a live proof. Voice input shows the bank call-centre case (transcripts leak numbers). Nobody else will let judges attack their demo from their own phones. | Mobile page `#arena`, `POST /api/arena/try` (wraps `/api/process` and the red-team normaliser), `GET /api/arena/board` polled by the big screen. Browser speech recognition, no new model. |
| 2 | **"Without Aran / With Aran" split screen.** One stream of real bank traffic plays twice side by side. Left: raw data spills into the log server, the vendor CRM, the AI chatbot provider and finally a dark-web dump, with a running count of exposed identifiers and the DPDP penalty exposure in rupees (up to ₹250 crore per breach). Right: the same traffic leaves as tokens, the dump is useless, and a trace names the leaking system. | One glance explains the whole product, which judges with five minutes per team need most. The rupee counter speaks to bank and business judges. | Page `#versus`. Uses `/api/sample`, `/api/process`, `/api/leaked-dump`, `/api/trace`. Penalty figures from the DPDP Act schedule (Learn 7). |
| 3 | **Leakage ledger: "two safe masks make one leak".** Pick a customer; vendor A is shown the first 6 card digits, vendor B the last 4. A gauge shows remaining guesses collapsing from 10^16 to 100,000 (16.6 bits) and a brute-force bar finishing in seconds. Then Aran's ledger refuses the second disclosure and offers a smaller mask or a token. | This is Aran's own research result (E13), not a library feature. It shows a leak that every per-field masking tool misses, which is the novelty judges ask about. Also fills an undesigned page from the spec. | Page `#ledger`, `POST /api/ledger/disclose` and `GET /api/ledger/{ref}` wrapping `research/firewall/ledger.py`. |

## Strong extras

| # | Idea | Why | Needs |
| --- | --- | --- | --- |
| 4 | **Photo drop: show a PAN or Aadhaar card photo (sample card) to the webcam or drop an image**; the numbers are boxed and tokenised on the picture. | Covers scanned KYC documents, a real bank leak path. Very visual. | OCR from Learn 10 behind `POST /api/ocr`. Use generated sample cards only. |
| 5 | **Post-quantum page: "harvest now, decrypt later".** A timeline where an attacker records today's traffic and a quantum computer opens classic keys in the future, while hybrid X25519 + ML-KEM keys stay closed. Includes the crypto inventory (CBOM) as a clickable map. | Timely topic, few student teams touch it. Fills the second undesigned page. | Page `#pqc`, endpoints wrapping `research/pqc/hybrid.py` and `cbom.json`. |
| 6 | **Customer's own view (DPDP rights).** A phone-sized "My data" screen: where my data went, erase me, get a receipt my phone can verify. | Shows the law from the customer side, not only the bank side. | Reuses `/api/customers`, `/api/erase`, `/api/receipts/verify`. |
| 7 | **Tamil and Hindi toggle**, with the tour headlines translated and the Aran name explained (அறன், righteousness). | Memorable local touch for Indian judges; ties the name to the idea. | Strings table in `ui.js`, no backend. |
| 8 | **Presenter mode.** One key walks a fixed 3-minute path (hero, versus, arena QR, ledger, receipt), with a "demo-safe" fallback that replays a recorded run if the network or models fail. | Saves the pitch when hall Wi-Fi fails, which sinks many demos. | `?present=1`, replay of saved API responses. |

## What not to spend time on

More 3D scenes or more chart types. The site already has two 3D scenes and a full animated tour; judges have seen many dashboards. Interaction and proof matter more now.

## Suggested order

1 then 2 then 3 (each is a page plus one or two thin endpoints over existing code), then 8 before any live event. Each new topic gets a beginner learning doc for the team before building, as with Learn 1 to 17.
