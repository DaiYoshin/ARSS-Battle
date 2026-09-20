"""Extract commander aerial kick, removing baked-in translation."""
from pathlib import Path
import os, subprocess, sys
from PIL import Image
ffmpeg=os.environ.get('FFMPEG','/Applications/krita.app/Contents/MacOS/ffmpeg')
raw=subprocess.check_output([ffmpeg,'-v','error','-i',sys.argv[1],'-map','0:v:0','-vf','colorkey=0xff00ff:0.35:0.10','-f','rawvideo','-pix_fmt','rgba','pipe:1'])
size=560*560*4
frames=[12,18,24,27,30,33,36,39,42,45,48,48,39,30,24,12]
assert len(raw)>=49*size
sheet=Image.new('RGBA',(320*len(frames),256))
for i,n in enumerate(frames):
    frame=Image.frombytes('RGBA',(560,560),raw[n*size:(n+1)*size])
    box=frame.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
    frame=frame.crop(box)
    frame=frame.resize((round(frame.width*.53),round(frame.height*.53)),Image.Resampling.LANCZOS)
    sheet.paste(frame,(i*320+160-frame.width//2,12))
sheet.save(Path(__file__).resolve().parents[1]/'assets/commander_air_kick.png')
