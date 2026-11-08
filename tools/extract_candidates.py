"""Geometry-based book extraction. Outputs candidates, never verified cards."""
from pathlib import Path
from collections import Counter
import pymupdf,re,json
ROOT=Path(__file__).resolve().parents[1]
doc=pymupdf.open(r'C:\Users\Luck1y\Downloads\Telegram Desktop\Minna no Nihongo 1.pdf')
def jp(t):return bool(re.search(r'[ぁ-ヿ一-鿿]',t))
def clean(t):return re.sub(r'\s+',' ',t).strip().replace('Ⅰ','').replace('Ⅱ','').replace('Ⅲ','')
def reading(spans,rubies):
    out=''
    for s in spans:
        chars=s['chars'];i=0
        while i<len(chars):
            c=chars[i]
            if re.match('[一-鿿]',c['c']):
                run=[c];i+=1
                while i<len(chars) and re.match('[一-鿿]',chars[i]['c']):run.append(chars[i]);i+=1
                x0=run[0]['bbox'][0];x1=run[-1]['bbox'][2];y=c['bbox'][1]
                ruby=[c for r in rubies for c in r['chars'] if x0-1<=(c['bbox'][0]+c['bbox'][2])/2<=x1+1 and y-12<c['bbox'][1]<y]
                out+=''.join(c['c'] for c in sorted(ruby,key=lambda c:c['bbox'][0])) or ''.join(c['c'] for c in run)
            else:out+=c['c'];i+=1
    return clean(out)
result=[]
for lesson in range(1,26):
    for page in [28+(lesson-1)*6,29+(lesson-1)*6]+([96] if lesson==12 else []):
        spans=[s for b in doc[page-1].get_text('rawdict')['blocks'] for l in b.get('lines',[]) for s in l['spans']]
        for s in spans:
            s['text']=''.join(c['c'] for c in s['chars'])
            visible=[c for c in s['chars'] if c['c'].strip()]
            if visible:s['bbox']=(visible[0]['bbox'][0],s['bbox'][1],visible[-1]['bbox'][2],s['bbox'][3])
        starts=[round(s['bbox'][0],0) for s in spans if s['bbox'][0]>=270 and re.search('[a-zA-Z]',s['text']) and 90<s['bbox'][1]<750]
        if not starts:continue
        right=Counter(starts).most_common(1)[0][0]-2
        base=[s for s in spans if s['text'].strip() and s['size']>9 and s['bbox'][1]<750]
        rubies=[s for s in spans if s['text'].strip() and s['size']<9]
        startY=0
        for s in base:
            if 'Yangi so' in s['text']:startY=s['bbox'][3]
        endY=min([s['bbox'][1] for s in base if 'Tarjima' in s['text']]+[750])
        marks=[]
        for s in base:
            x,y=s['bbox'][:2]
            if x<120 and y>=startY and y<endY and (jp(s['text']) or re.match(r'[\[（(～～0-9２３]',s['text'])) and '会話' not in s['text']:
                if not any(abs(y-v)<3 for v in marks):marks.append(y)
        marks.sort()
        for idx,y in enumerate(marks):
            nextY=marks[idx+1] if idx+1<len(marks) else endY
            same=[s for s in base if abs(s['bbox'][1]-y)<3 and s['bbox'][0]<right]
            same.sort(key=lambda s:s['bbox'][0])
            left=[];middle=[];lastEnd=0
            for s in same:
                if left and s['bbox'][0]>=190 and s['bbox'][0]-lastEnd>12:middle.append(s)
                elif middle:middle.append(s)
                else:left.append(s)
                lastEnd=s['bbox'][2]
            kana=clean(''.join(s['text'] for s in left))
            surface=clean(''.join(s['text'] for s in middle)) or kana
            uz=clean(' '.join(s['text'] for s in sorted(base,key=lambda s:(round(s['bbox'][1]/3),s['bbox'][0])) if s['bbox'][0]>=right and y-5<=s['bbox'][1]<nextY-4))
            if not uz:continue
            if re.match(r'^[\[［].*[～~].*[\]］]$',kana) and result and result[-1]['page']==page and y-result[-1]['y']<35:
                result[-1]['notes']+=' '+kana+' '+surface+' '+uz
                continue
            full=reading(left,rubies)
            result.append(dict(lesson=lesson,page=page,y=round(y,1),surface=surface,kana=full,uz=uz,notes='',needsReading=bool(re.search('[一-鿿]',full))))
(ROOT/'data/candidates.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
for lesson in range(1,26):
    rows=[r for r in result if r['lesson']==lesson]
    print('LESSON',lesson,len(rows))
    for i,r in enumerate(rows):print(str(i+1)+' '+r['surface']+' / '+r['kana']+' / '+r['uz'])

