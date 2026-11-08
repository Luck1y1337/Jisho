from pathlib import Path
import sys,urllib.request,json
ROOT=Path(__file__).resolve().parents[1]
GAME=Path(r'C:\Users\Luck1y\Desktop\Game Mi Band')
sys.path.insert(0,str(GAME/'.tools/python'))
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.merge import Merger
import pymupdf
cache=ROOT/'tmp/fonts';cache.mkdir(parents=True,exist_ok=True)
dest=ROOT/'src/assets/fonts';dest.mkdir(parents=True,exist_ok=True)
jp=cache/'NotoSansJP.ttf'
if not jp.exists():urllib.request.urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf',jp)
latin=cache/'NotoSans.ttf'
if not latin.exists():
    import shutil
    existing=GAME/'.tools/NotoSans-original.ttf'
    if existing.exists():shutil.copy2(existing,latin)
    else:urllib.request.urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf',latin)
for family in ['notosans','notosansjp']:
    urllib.request.urlretrieve(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{family}/OFL.txt',dest/(family+'-OFL.txt'))
text=''.join(p.read_text(encoding='utf-8') for p in (ROOT/'src').rglob('*') if p.suffix in ('.js','.ux','.json','.svg'))
text+=''.join(chr(n) for n in range(32,256))+''.join(chr(n) for n in range(0x400,0x500))+'‘’→←…'
text+=''.join(chr(n) for n in range(0x3041,0x3100))
paths=[]
latin_cmap=TTFont(latin).getBestCmap()
for source,name,chars in [(latin,'latin',{c for c in text if ord(c)<0x3000 and ord(c) in latin_cmap}),(jp,'japanese',{c for c in text if ord(c)>=0x3000 or ord(c) not in latin_cmap})]:
    f=TTFont(source)
    if 'fvar' in f:
        axes={a.axisTag:400 if a.axisTag=='wght' else a.defaultValue for a in f['fvar'].axes}
        instantiateVariableFont(f,axes,inplace=True)
    opts=subset.Options();opts.layout_features=[];ss=subset.Subsetter(options=opts);ss.populate(text=''.join(chars));ss.subset(f)
    for table in ['GSUB','GPOS','GDEF','STAT','BASE','vhea','vmtx','VORG','DSIG']:
        if table in f:del f[table]
    path=cache/(name+'.ttf');f.save(path);paths.append(str(path))
f=Merger().merge(paths);f.save(dest/'Jisho.ttf')
from PIL import ImageFont
pil=ImageFont.truetype(str(dest/'Jisho.ttf'),100)
metrics={c:round(pil.getlength(c)/100,4) for c in set(text)}
(ROOT/'src/shared/metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
svg=(ROOT/'src/assets/icon.svg').read_bytes();doc=pymupdf.open(stream=svg,filetype='svg');scale=192/doc[0].rect.width;pix=doc[0].get_pixmap(matrix=pymupdf.Matrix(scale,scale),alpha=True);pix.save(ROOT/'src/assets/icon.png')
print('Font', (dest/'Jisho.ttf').stat().st_size,'bytes; circular icon generated')
