"""Stabilize the aerial knife strike by tracked beret centers, not silhouette bounds.
Frames are 320x384, pivot (160,366): 128px extra headroom for the raised blade.
"""
from pathlib import Path
import os, subprocess, sys
from PIL import Image
ffmpeg=os.environ.get('FFMPEG','/Applications/krita.app/Contents/MacOS/ffmpeg')
raw=subprocess.check_output([ffmpeg,'-v','error','-i',sys.argv[1],'-map','0:v:0','-vf','colorkey=0xff00ff:0.35:0.10','-f','rawvideo','-pix_fmt','rgba','pipe:1'])
size=560*560*4
# Source frame, beret center x/y. The head stays near the existing airborne pose.
poses=[(0,363,57),(3,362,75),(6,360,96),(9,355,132),(12,354,167),(18,350,197),(24,345,222),(42,344,194),(45,343,170),(48,360,126),(51,360,91),(54,360,82),(57,360,70),(60,360,64),(63,360,61),(66,360,59),(69,360,59),(72,360,59)]
assert len(raw)>=73*size
sheet=Image.new('RGBA',(320*len(poses),384))
for i,(n,hx,hy) in enumerate(poses):
    frame=Image.frombytes('RGBA',(560,560),raw[n*size:(n+1)*size]).resize((297,297),Image.Resampling.LANCZOS)
    tile=Image.new('RGBA',(320,384))
    tile.paste(frame,(round(200-hx*.53),round(150-hy*.53)))
    sheet.paste(tile,(i*320,0))
sheet.save(Path(__file__).resolve().parents[1]/'assets/commander_air_punch.png')
# Contact sheet for checking stabilization and full blade visibility.
preview=Image.new('RGBA',(320*6,384*3),(35,43,49,255))
for i in range(len(poses)):preview.alpha_composite(sheet.crop((i*320,0,(i+1)*320,384)),((i%6)*320,(i//6)*384))
preview.convert('RGB').save(Path(__file__).resolve().parents[2]/'.qa-canvas/commander-air-punch-stabilized.jpg')
