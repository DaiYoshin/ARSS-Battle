"""Alpha special KO: 6s video sampled to 3s, supplied still as final held frame."""
from pathlib import Path
import os, subprocess, sys
from PIL import Image
ffmpeg=os.environ.get('FFMPEG','/Applications/krita.app/Contents/MacOS/ffmpeg')
def decode(path,still=False):
    args=[ffmpeg,'-v','error','-i',path,'-vf','scale=560:560,colorkey=0xff00ff:0.35:0.10']
    if still:args+=['-frames:v','1']
    return subprocess.check_output(args+['-f','rawvideo','-pix_fmt','rgba','pipe:1'])
raw=decode(sys.argv[1]);fixed=decode(sys.argv[2],True);size=560*560*4
assert len(raw)>=145*size
sheet=Image.new('RGBA',(320*73,256))
preview=Image.new('RGBA',(320*5,256*2),(35,43,49,255))
for i in range(73):
    data=fixed if i==72 else raw[(i*2)*size:(i*2+1)*size]
    frame=Image.frombytes('RGBA',(560,560),data).resize((304,304),Image.Resampling.LANCZOS)
    box=frame.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
    tile=Image.new('RGBA',(320,256));tile.paste(frame,(round(160-(box[0]+box[2])/2),238-box[3]))
    sheet.paste(tile,(320*i,0))
    if i in [0,8,16,24,32,40,48,56,64,72]:
        j=[0,8,16,24,32,40,48,56,64,72].index(i);preview.alpha_composite(tile,((j%5)*320,(j//5)*256))
sheet.save(Path(__file__).resolve().parents[1]/'assets/transform_commander.png')
preview.convert('RGB').save(Path(__file__).resolve().parents[2]/'.qa-canvas/commander-transform-check.jpg')
