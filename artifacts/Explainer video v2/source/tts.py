# Script -> one WAV per line (cached by content) -> narration.wav + timing.json + timing.js
# usage: python3 tts.py [script.txt] [--parse] [--only id1,id2]
import json, re, sys, os, hashlib, numpy as np, soundfile as sf
SR = 24000
VOICE, SPEED = "af_heart", 0.85
LEAD, GAP, TAIL, PART_TAIL = 1.0, 0.8, 1.8, 2.4
REPL = [(r"\bAran\b", "Uh-run"), (r"\bOTPs\b", "O T Ps"), (r"\bOTP\b", "O T P"), (r"\bUPI\b", "U P I"), (r"\bKYC\b", "K Y C"),
 (r"\bVerhoeff\b", "Ver-hoff"), (r"\bFeistel\b", "Fy-stel"), (r"\bLoghub\b", "Log hub"), (r"\bRavi\b", "Rah-vee"), (r"\bRavi's\b", "Rah-vee's"),
 (r"\bInbathamizhan\b", "Inba Tamizhan"), (r"\bBharadhwaj\b", "Bharad-waaj"), (r"\bArun\b", "Aroon"), (r"\bSN\b", "S N"), (r"\bAasif\b", "Aa-sif"),
 (r"\bAES-256\b", "A E S two fifty-six"), (r"\bAES\b", "A E S"), (r"\bPII\b", "P I I"), (r"\bNER\b", "N E R"), (r"\bCRF\b", "C R F"), (r"\bHMAC\b", "H mac"), (r"\bCBOM\b", "C B O M"),
 (r"\b2 a\.m\.(?=\s+[a-z])", "two A M"), (r"\b2 a\.m\.", "two A M."), (r"\bFastAPI\b", "Fast A P I"), (r"\bREADME\b", "read me"),
 (r"\bLLMs\b", "L L Ms"), (r"\bLLM\b", "L L M"), (r"\bCRM\b", "C R M"), (r"\b3D\b", "three D"), (r"\bID\b", "I D"), (r"\bIDs\b", "I Ds"), (r"\bAPI\b", "A P I"), (r"\bAPIs\b", "A P Is"),
 (r"\bPAN\b", "pan"), (r"\bDPDP\b", "D P D P"), (r"\bNIST\b", "nist"), (r"\bFF1\b", "F F one"), (r"\bSMS\b", "S M S"), (r"\bKARE\b", "Kare"),
 (r"\bAI\b", "A I"), (r"\bRBI\b", "R B I"), (r"\bIBM\b", "I B M"), (r"\bGitHub\b", "Git hub"), (r"\bQR\b", "Q R"), (r"\bCPU\b", "C P U"), (r"\bNBFCs\b", "N B F Cs"),
 (r"\bML-KEM\b", "M L kem"), (r"\bML-DSA\b", "M L D S A"), (r"\bX25519\b", "X twenty-five five nineteen"), (r"\bEd25519\b", "Ed twenty-five five nineteen"),
 (r"₹\s?250 crore", "250 crore rupees"), (r"\be\.g\.", "for example")]
def say(t):
    for a, b in REPL: t = re.sub(a, b, t)
    return t
src = next((a for a in sys.argv[1:] if not a.startswith("--") and a.endswith(".txt")), "script.txt")
only = None
if "--only" in sys.argv: only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
scenes = []
for raw in open(src, encoding="utf-8"):
    raw = raw.rstrip("\n")
    if not raw.strip() or raw.startswith("#!"): continue
    if raw.startswith("## "):
        parts = [x.strip() for x in raw[3:].split("|")]
        sid, label, title = parts[:3]
        flags = parts[3] if len(parts) > 3 else ""
        scenes.append(dict(id=sid, label=label, title=title, part="part" in flags, noHeader="noheader" in flags, lines=[])); continue
    text, _, ov = raw.partition("||")
    text = text.strip(); s = say(ov.strip()) if ov.strip() else say(text)
    scenes[-1]["lines"].append(dict(text=text, say=s))
if only: scenes = [s for s in scenes if s["id"] in only]
json.dump(scenes, open("script.json", "w"), indent=1, ensure_ascii=False)
nw = sum(len(l["text"].split()) for s in scenes for l in s["lines"])
print(len(scenes), "scenes", sum(len(s["lines"]) for s in scenes), "lines", nw, "words")
if "--parse" in sys.argv: sys.exit()
from kokoro_onnx import Kokoro
k = None
os.makedirs("audio", exist_ok=True)
t = 0.0; track = []; timing = []
for si, sc in enumerate(scenes):
    st = t; t += LEAD; track.append(np.zeros(int(LEAD * SR), np.float32)); cues = []
    for li, l in enumerate(sc["lines"]):
        h = hashlib.sha1(f"{VOICE}|{SPEED}|{l['say']}".encode()).hexdigest()[:16]
        fn = f"audio/{h}.wav"
        if os.path.exists(fn): a, _ = sf.read(fn, dtype="float32")
        else:
            if k is None: k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
            a, _ = k.create(l["say"], voice=VOICE, speed=SPEED, lang="en-us"); a = a.astype(np.float32); sf.write(fn, a, SR)
            print("tts", sc["id"], li, round(len(a) / SR, 1), flush=True)
        nz = np.where(np.abs(a) > 0.01)[0]
        if len(nz): a = a[max(0, nz[0] - 240):min(len(a), nz[-1] + 2400)]
        d = len(a) / SR; cues.append(dict(t=round(t, 3), d=round(d, 3), text=l["text"]))
        track.append(a); t += d
        g = GAP if li < len(sc["lines"]) - 1 else (PART_TAIL if sc["part"] else TAIL)
        track.append(np.zeros(int(g * SR), np.float32)); t += g
    timing.append(dict(id=sc["id"], label=sc["label"], title=sc["title"], part=sc["part"], noHeader=sc["noHeader"], start=round(st, 3), end=round(t, 3), cues=cues))
full = np.concatenate(track); sf.write("narration.wav", full, SR)
T = dict(total=round(t, 3), scenes=timing)
json.dump(T, open("timing.json", "w"), indent=1, ensure_ascii=False)
open("timing.js", "w").write("window.TIMING = " + json.dumps(T, ensure_ascii=False) + ";\n")
print("TOTAL", round(t, 1), "s =", round(t / 60, 1), "min;", round(nw / (t / 60)), "words/min")
