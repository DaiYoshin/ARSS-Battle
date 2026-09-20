"""Extract the supplied walk cycle; usage: python build-commander-walk.py input.mp4.
Requires Pillow and ffmpeg (FFMPEG env override supported).
"""
from pathlib import Path
import os, subprocess, sys
from PIL import Image
ffmpeg=os.environ.get('FFMPEG','/Applications/krita.app/Contents/MacOS/ffmpeg')
raw=subprocess.check_output([ffmpeg,'-v','error','-i',sys.argv[1],'-map','0:v:0','-vf',"select=between(n\\,48\\,71),colorkey=0xff00ff:0.35:0.10",'-vsync','0','-f','rawvideo','-pix_fmt','rgba','pipe:1'])
size=544*544*4
assert len(raw)==24*size, 'Expected 24 walk frames'
sheet=Image.new('RGBA',(320*24,256))
for i in range(24):
    frame=Image.frombytes('RGBA',(544,544),raw[i*size:(i+1)*size])
    frame=frame.resize((288,288),Image.Resampling.LANCZOS)
    sheet.paste(frame,(i*320+9,-16))
sheet.save(Path(__file__).resolve().parents[1]/'assets/commander_walk.png')
