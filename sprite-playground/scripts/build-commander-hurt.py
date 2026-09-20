"""Extract and retime commander hurt; usage: python build-commander-hurt.py input.mp4."""
from pathlib import Path
import os, subprocess, sys
from PIL import Image
ffmpeg=os.environ.get('FFMPEG','/Applications/krita.app/Contents/MacOS/ffmpeg')
raw=subprocess.check_output([ffmpeg,'-v','error','-i',sys.argv[1],'-map','0:v:0','-vf','colorkey=0xff00ff:0.35:0.10','-f','rawvideo','-pix_fmt','rgba','pipe:1'])
size=560*560*4
# 17 frames played at 60fps match the commander-specific 17/60 second hitstun.
# Preserve recoil, briefly hold the peak, then reverse toward the ready stance.
frames=[6,9,12,18,27,39,51,60,66,72,72,60,42,24,12,6,0]
assert len(raw)>=73*size
sheet=Image.new('RGBA',(320*len(frames),288))
for i,n in enumerate(frames):
    frame=Image.frombytes('RGBA',(560,560),raw[n*size:(n+1)*size]).resize((304,304),Image.Resampling.LANCZOS)
    sheet.paste(frame,(i*320+8,4))
sheet.save(Path(__file__).resolve().parents[1]/'assets/commander_hurt.png')
