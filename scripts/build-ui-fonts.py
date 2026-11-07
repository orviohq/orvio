"""Rebuild bounded local interface fonts from licensed original font paths.
Usage: python scripts/build-ui-fonts.py KR.ttf SC.ttf JP.ttf
Reads every authored src string, not only the initially visible UI.
"""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parent.parent
text=''.join(p.read_text() for p in (root/'src').rglob('*') if p.suffix in ('.ts','.astro','.css'))
for original,name,accept in [
 (sys.argv[1],'korean.ttf',lambda c:'\u1100'<=c<='\u11ff' or '\u3130'<=c<='\u318f' or '\uac00'<=c<='\ud7a3'),
 (sys.argv[2],'chinese.ttf',lambda c:'\u2e80'<=c<='\u9fff' or '\uf900'<=c<='\ufaff' or '\uff00'<=c<='\uffef'),
 (sys.argv[3],'japanese.ttf',lambda c:'\u2e80'<=c<='\u9fff' or '\uf900'<=c<='\ufaff' or '\uff00'<=c<='\uffef'),
]:
 chars=''.join(sorted(set(c for c in text if accept(c))))
 options=subset.Options();font=subset.load_font(original,options)
 cmap=set().union(*(set(t.cmap) for t in font['cmap'].tables));missing=[c for c in chars if ord(c) not in cmap]
 if missing and name!='japanese.ttf':raise ValueError((name,'original missing characters',missing))
 if name=='japanese.ttf':chars=''.join(c for c in chars if ord(c) in cmap)
 worker=subset.Subsetter();worker.populate(text=chars);worker.subset(font)
 path=root/'public'/name;subset.save_font(font,str(path),options)
 saved=TTFont(path);cmap=set().union(*(set(t.cmap) for t in saved['cmap'].tables))
 assert all(ord(c) in cmap for c in chars)
 print(name,len(chars),'characters',path.stat().st_size,'bytes; full source coverage verified')
