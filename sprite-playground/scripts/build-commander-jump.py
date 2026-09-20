"""Extract commander jump poses, removing baked-in video translation."""
from pathlib import Path
import os, subprocess, sys
from PIL import Image
ffmpeg=os.environ.get('FFMPEG','/Applications/krita.app/Contents/MacOS/ffmpeg')
raw=subprocess.check_output([ffmpeg,'-v','error','-i',sys.argv[1],'-map','0:v:0','-vf','colorkey=0xff00ff:0.35:0.10','-f','rawvideo','-pix_fmt','rgba','pipe:1'])
size=544*544*4
frames=[15,18,21,27,42,48,54,57,60,63,69,0]
assert len(raw)>=70*size
sheet=Image.new('RGBA',(320*len(frames),256))
for i,n in enumerate(frames):
    frame=Image.frombytes('RGBA',(544,544),raw[n*size:(n+1)*size])
    box=frame.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
    frame=frame.crop(box)
    frame=frame.resize((round(frame.width*.53),round(frame.height*.53)),Image.Resampling.LANCZOS)
    # Airborne head height stays fixed; tucked legs remain raised. Landing uses the floor pivot.
    y=12 if i<8 else 238-frame.height
    sheet.paste(frame,(i*320+160-frame.width//2,y))
sheet.save(Path(__file__).resolve().parents[1]/'assets/commander_jump.png')
