"""Extract commander KO; fix the floor contact and retain the final fallen pose."""
from pathlib import Path
import os, subprocess, sys
from PIL import Image
ffmpeg=os.environ.get('FFMPEG','/Applications/krita.app/Contents/MacOS/ffmpeg')
raw=subprocess.check_output([ffmpeg,'-v','error','-i',sys.argv[1],'-map','0:v:0','-vf','colorkey=0xff00ff:0.35:0.10','-f','rawvideo','-pix_fmt','rgba','pipe:1'])
size=560*560*4
frames=list(range(0,73,2))
assert len(raw)>=73*size
sheet=Image.new('RGBA',(320*len(frames),288))
for i,n in enumerate(frames):
    frame=Image.frombytes('RGBA',(560,560),raw[n*size:(n+1)*size]).resize((304,304),Image.Resampling.LANCZOS)
    box=frame.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
    tile=Image.new('RGBA',(320,288))
    tile.paste(frame,(8,270-box[3]))
    sheet.paste(tile,(i*320,0))
sheet.save(Path(__file__).resolve().parents[1]/'assets/commander_down.png')
