"""Rebuild the bounded social-card glyph atlas from the project's OFL Outfit font.
Requires Pillow and fonttools. No network, user input, or private data.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
import tempfile, json, base64
root=Path(__file__).resolve().parent.parent
font=TTFont(root/'public/outfit.ttf')
instantiateVariableFont(font,{'wght':600},inplace=True)
with tempfile.TemporaryDirectory() as temp:
 path=Path(temp)/'font.ttf';font.save(path);out={}
 for size in (24,48,96):
  f=ImageFont.truetype(str(path),size*4);chars={}
  for c in map(chr,range(32,127)):
   w=round(f.getlength(c)/4)+1;h=round(size*1.4)
   im=Image.new('L',(w*4,h*4));ImageDraw.Draw(im).text((0,0),c,font=f,fill=255)
   im=im.resize((w,h),Image.Resampling.LANCZOS)
   chars[c]={'w':w,'h':h,'alpha':base64.b64encode(im.tobytes()).decode()}
  out[str(size)]=chars
 (root/'server/glyphs.json').write_text(json.dumps(out,indent=2)+'\n')
