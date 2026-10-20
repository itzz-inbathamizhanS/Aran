# Render the whole video in chunks (4 at a time), then build part videos, the full video and the SRT.
# usage: python3 build.py render | parts | srt | all
import json, os, subprocess, sys, math
from concurrent.futures import ThreadPoolExecutor
FPS, CH, JOBS = 30, 4500, 4
T = json.load(open("timing.json"))
starts = [0.0] + [s["start"] for s in T["scenes"] if s["part"]][1:] + [T["total"]]
parts = [(round(a * FPS), round(b * FPS)) for a, b in zip(starts, starts[1:])]
os.makedirs("out/chunks", exist_ok=True)
def chunks():
    for pi, (a, b) in enumerate(parts, 1):
        n = math.ceil((b - a) / CH)
        for ci in range(n):
            yield pi, ci, a + ci * CH, min(b, a + (ci + 1) * CH)
def render_one(c):
    pi, ci, a, b = c
    out = f"out/chunks/p{pi}_{ci:02d}.mp4"
    if os.path.exists(out + ".ok"): return
    subprocess.run(["node", "render.js", str(a), str(b), str(FPS), out], check=True)
    open(out + ".ok", "w").write(str(b - a))
def render():
    with ThreadPoolExecutor(JOBS) as ex: list(ex.map(render_one, list(chunks())))
CRF = os.environ.get("CRF", "27")
AUD = ["-c:a", "aac", "-b:a", "64k", "-ac", "1"]
# segments for delivery: the six parts, with part 4 split in two at the "ai" chapter (GitHub's 100 MB limit)
SPLIT = round([s["start"] for s in T["scenes"] if s["id"] == "ai"][0] * FPS)
segs = []
for pi, (a, b) in enumerate(parts, 1):
    if a < SPLIT < b: segs += [(f"{pi}a", pi, a, SPLIT), (f"{pi}b", pi, SPLIT, b)]
    else: segs.append((str(pi), pi, a, b))
def encode_seg(sg):
    name, pi, a, b = sg
    out = f"out/v{name}.mp4"
    if os.path.exists(out + ".ok"): return
    lst = f"out/p{pi}.txt"
    open(lst, "w").write("".join(f"file 'chunks/p{p}_{c:02d}.mp4'\n" for p, c, _, _ in chunks() if p == pi))
    pa = parts[pi - 1][0]
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-ss", f"{(a - pa) / FPS:.4f}", "-t", f"{(b - a) / FPS:.4f}", "-c:v", "libx264", "-preset", "medium",
                    "-tune", "animation", "-crf", CRF, "-pix_fmt", "yuv420p", "-r", str(FPS), "-threads", "2", out], check=True)
    open(out + ".ok", "w").write("ok")
def build_parts():
    with ThreadPoolExecutor(2) as ex: list(ex.map(encode_seg, segs))
    for name, pi, a, b in segs:
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"out/v{name}.mp4",
                        "-ss", f"{a / FPS:.4f}", "-t", f"{(b - a) / FPS:.4f}", "-i", "narration.wav",
                        "-map", "0:v", "-map", "1:a", "-c:v", "copy", *AUD, "-shortest",
                        "-movflags", "+faststart", f"out/part{name}.mp4"], check=True)
    open("out/all.txt", "w").write("".join(f"file 'v{n}.mp4'\n" for n, _, _, _ in segs))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", "out/all.txt", "-i", "narration.wav",
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", *AUD, "-shortest",
                    "-movflags", "+faststart", "out/full.mp4"], check=True)
def ts(x):
    ms = round(x * 1000); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
def srt(cues, off, path):
    with open(path, "w", encoding="utf-8") as f:
        for i, c in enumerate(cues, 1):
            f.write(f"{i}\n{ts(c['t'] - off)} --> {ts(c['t'] + c['d'] + 0.3 - off)}\n{c['text']}\n\n")
def build_srt():
    allc = [c for s in T["scenes"] for c in s["cues"]]
    srt(allc, 0, "out/full.srt")
    for name, pi, a, b in segs:
        srt([c for c in allc if a / FPS <= c["t"] < b / FPS], a / FPS, f"out/part{name}.srt")
if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    print("parts (s):", [(round(a / FPS, 1), round(b / FPS, 1)) for a, b in parts], "chunks:", len(list(chunks())))
    if step in ("render", "all"): render()
    if step in ("parts", "all"): build_parts()
    if step in ("srt", "all"): build_srt()
