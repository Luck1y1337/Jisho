"""Import book material, retaining exact raw vocabulary and grammar separately.
Only curated TSV entries enter the self-assessment engine.
"""
import csv
import json
from pathlib import Path
import re
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDF = Path(r'C:\Users\Luck1y\Downloads\Telegram Desktop\Minna no Nihongo 1.pdf')
source = (ROOT/'MINNA_25_LESSONS_VOCAB_SOURCE.md').read_text(encoding='utf-8')
doc = pymupdf.open(PDF)
lessons = []
for number, body in re.findall(r'^## Урок (\d+)\n(.*?)(?=^## Урок |\Z)', source, re.M|re.S):
    number = int(number)
    pages = [{'page':int(p), 'text':text} for p,text in re.findall(r'### Страница PDF (\d+)\s+```text\n(.*?)\n```',body,re.S)]
    start = 28+(number-1)*6
    grammar = [{'page':p,'text':doc[p-1].get_text(sort=True).strip()} for p in (start+4,start+5)]
    lessons.append({'id':number,'sourcePages':pages,'grammarSource':grammar})
words=[]
for path in sorted((ROOT/'data').glob('lesson*.tsv')):
    lesson=int(path.stem[-2:])
    for index,row in enumerate(csv.DictReader(path.open(encoding='utf-8'),delimiter='\t')):
        word=dict(row)
        word.update(id=f'l{lesson:02}-w{index+1:03}',lessonId=lesson,order=index+1,sourcePdfPages=[int(row['page'])],reviewStatus='curated',sourceOriginal=row['surface'])
        # These names have no spelled-out reading in the book; omit from scored cards.
        if row['surface'] in ('IMC','AKC'):
            word['reviewStatus']='reading-added-not-in-source'
        del word['page']
        words.append(word)
words.extend(json.loads((ROOT/'data/curated.json').read_text(encoding='utf-8')))
words.sort(key=lambda w:(w['lessonId'],w['order']))
payload={'lessons':lessons,'words':words,'referenceSource':[{'page':p,'text':doc[p-1].get_text(sort=True).strip()} for p in [22,23,24,25,26,179,180,181,182,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205]]}
payload['grammar']=[]
for index,r in enumerate(csv.DictReader((ROOT/'data/grammar.tsv').open(encoding='utf-8'),delimiter='\t')):
    n=int(r.pop('lesson'))
    payload['grammar'].append(dict(r,id=f'g{index+1:03}',lessonId=n,sourcePdfPages=[32+(n-1)*6,33+(n-1)*6],exampleOrigin='authored'))
target=ROOT/'src/shared/corpus.js'
target.write_text('module.exports='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print(f'Imported {len(lessons)} lessons, {len(words)} curated entries.')
