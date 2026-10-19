import json, re, sys, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
SR=24000
REPL=[(r"\bAran\b","Uh-run"),(r"\bOTPs\b","O T Ps"),(r"\bOTP\b","O T P"),(r"\bUPI\b","U P I"),(r"\bKYC\b","K Y C"),
 (r"\bVerhoeff\b","Ver-hoff"),(r"\bFeistel\b","Fy-stel"),(r"\bLoghub\b","Log hub"),(r"\bRavi\b","Rah-vee"),
 (r"\bInbathamizhan\b","Inba Tamizhan"),(r"\bBharadhwaj\b","Bharad-waaj"),(r"\bArun\b","Aroon"),(r"\bSN\b","S N"),
 (r"\bAES-256\b","A E S two fifty-six"),(r"\bPII\b","P I I"),(r"\bNER\b","N E R"),(r"\bCRF\b","C R F"),(r"\bHMAC\b","H mac"),(r"\bCBOM\b","C B O M"),(r"\b2 a\.m\.(?=\s+[a-z])","two A M"),(r"\b2 a\.m\.","two A M."),(r"\bFastAPI\b","Fast A P I"),(r"\b2 A M\b","two A M"),(r"\bREADME\b","read me"),
 (r"\bLLMs\b","L L Ms"),(r"\bCRM\b","C R M"),(r"\b3D\b","three D"),(r"\bID\b","I D")]
def say(t):
    for a,b in REPL: t=re.sub(a,b,t)
    return t
scenes=[]
for raw in open("script.txt",encoding="utf-8"):
    raw=raw.rstrip("\n")
    if not raw.strip(): continue
    if raw.startswith("## "):
        sid,label,title=[x.strip() for x in raw[3:].split("|")]
        scenes.append(dict(id=sid,label=label,title=title,lines=[])); continue
    text,_,ov=raw.partition("||")
    text=text.strip(); s=say(ov.strip()) if ov.strip() else say(text)
    scenes[-1]["lines"].append(dict(text=text,say=s))
json.dump(scenes,open("script.json","w"),indent=1,ensure_ascii=False)
print(len(scenes),"scenes",sum(len(s["lines"]) for s in scenes),"lines",sum(len(l["text"].split()) for s in scenes for l in s["lines"]),"words")
if "--parse" in sys.argv: sys.exit()
k=Kokoro("models/kokoro-v1.0.onnx","models/voices-v1.0.bin")
os.makedirs("audio",exist_ok=True)
LEAD,GAP,TAIL=0.7,0.45,1.3
t=0.0; track=[]; timing=[]
for si,sc in enumerate(scenes):
    st=t; t+=LEAD; track.append(np.zeros(int(LEAD*SR),np.float32)); cues=[]
    for li,l in enumerate(sc["lines"]):
        fn=f"audio/{si:02d}_{li:02d}.wav"
        if os.path.exists(fn): a,_=sf.read(fn,dtype="float32")
        else:
            a,_=k.create(l["say"],voice="af_heart",speed=0.95,lang="en-us"); a=a.astype(np.float32); sf.write(fn,a,SR)
        # trim silence edges
        nz=np.where(np.abs(a)>0.01)[0]
        if len(nz): a=a[max(0,nz[0]-240):min(len(a),nz[-1]+2400)]
        d=len(a)/SR; cues.append(dict(t=round(t,3),d=round(d,3),text=l["text"]))
        track.append(a); t+=d
        g=GAP if li<len(sc["lines"])-1 else TAIL
        track.append(np.zeros(int(g*SR),np.float32)); t+=g
        print(si,li,round(d,1),flush=True)
    timing.append(dict(id=sc["id"],label=sc["label"],title=sc["title"],start=round(st,3),end=round(t,3),cues=cues))
full=np.concatenate(track); sf.write("narration.wav",full,SR)
json.dump(dict(total=round(t,3),scenes=timing),open("timing.json","w"),indent=1,ensure_ascii=False)
print("TOTAL",round(t,1),"s")
