"""Extract and retime commander kick; usage: python build-commander-kick.py input.mp4."""
from pathlib import Path
import os, subprocess, sys
from PIL import Image
ffmpeg=os.environ.get('FFMPEG','/Applications/krita.app/Contents/MacOS/ffmpeg')
raw=subprocess.check_output([ffmpeg,'-v','error','-i',sys.argv[1],'-map','0:v:0','-vf','colorkey=0xff00ff:0.35:0.10','-f','rawvideo','-pix_fmt','rgba','pipe:1'])
size=560*560*4
# Short anticipation, extension, brief contact, reverse extension for recovery.
frames=[12,15,18,21,23,24,25,26,27,28,29,30,32,32,30,28,26,24,21,18,15,12]
assert len(raw)>=33*size
sheet=Image.new('RGBA',(320*len(frames),256))
for i,n in enumerate(frames):
    frame=Image.frombytes('RGBA',(560,560),raw[n*size:(n+1)*size]).resize((304,304),Image.Resampling.LANCZOS)
    sheet.paste(frame,(i*320+8,-28))
sheet.save(Path(__file__).resolve().parents[1]/'assets/commander_kick.png')
