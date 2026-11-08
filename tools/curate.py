"""Apply the reviewed translations and explicit extraction corrections.
Raw source stays available separately. Never infer kana by dropping kanji.
"""
import json,re,csv
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'data/candidates.json').read_text(encoding='utf-8'))
ru=json.loads((ROOT/'data/translations-ru.json').read_text(encoding='utf-8'))
fixes={
 (3,16):('トイレ（お手洗い）','トイレ（おてあらい）'),
 (8,61):('「七人の侍」','「しちにんのさむらい」'),
 (6,25):('牛乳（ミルク）','ぎゅうにゅう（ミルク）'),
 (13,36):('定食','ていしょく'),(13,38):('［少々］お待ちください。','［しょうしょう］おまちください。'),
 (13,39):('別々に','べつべつに'),(15,5):('作ります／造ります','つくります'),
 (22,16):('ダイニングキッチン','ダイニングキッチン'),
 (17,31):('２、３日','に、さんにち'),(17,32):('２、３～','に、さん～'),
 (24,5):('紹介します','しょうかいします'),(25,3):('留学します','りゅうがくします')}
proper_starts={4:55,5:56,6:52,7:47,8:58,9:51,10:48,11:62,12:46,13:40,14:41,15:28,16:47,18:29,19:31,21:37,22:21,23:30,24:19}
out=[];log=[]
for n in range(2,26):
    selected=[r for r in rows if r['lesson']==n];translations=ru[str(n)].split('|')
    assert len(selected)==len(translations),(n,len(selected),len(translations))
    for i,(row,translation) in enumerate(zip(selected,translations),1):
        surface,kana=row['surface'],row['kana']
        if (n,i) in fixes:
            surface,kana=fixes[n,i];log.append(dict(lesson=n,entry=i,page=row['page'],original=row['surface'],surface=surface,kana=kana))
        if (n,i)==(12,50):kana='エービーシーストア'
        word=dict(id=f'l{n:02}-w{i:03}',lessonId=n,order=i,category='proper' if i>=proper_starts.get(n,999) else 'word',surface=surface,kana=kana,translationRu=translation,translationUz=row['uz'],notesUz=row['notes'].strip(),notesRu='',sourcePdfPages=[row['page']],sourceOriginal=row['surface'],reviewStatus='curated')
        if (n,i)==(6,30):word['translationUz']='kino'
        if (n,i)==(9,41):word['translationUz']='chunki; …gani uchun'
        if (n,i)==(24,4):word['translationRu']='провожать; подвозить (человека)'
        if (n,i)==(21,37):word['category']='word'
        assert not re.search('[一-鿿々]',kana),(n,i,kana)
        out.append(word)
extras=[
 (1,'アメリカ人','アメリカじん','американец','amerikalik',28),
 (6,'CD','シーディー','компакт-диск','kompakt-disk',59),
 (16,'JR','ジェーアール','Японские железные дороги','Yaponiya Temir yo‘llari kompaniyasi',119),
 (3,'新大阪','しんおおさか','Син-Осака (станция)','Shin-Osaka (Osakadagi bekat nomi)',41),
 (3,'イタリア','イタリア','Италия','Italiya',41),
 (3,'スイス','スイス','Швейцария','Shveysariya',41),
 (3,'MT','エムティー','MT (вымышленная компания)','kompaniya nomi (o‘ylab topilgan)',41),
 (3,'ヨーネン','ヨーネン','Ёнэн (вымышленная компания)','kompaniya nomi (o‘ylab topilgan)',41),
 (3,'アキックス','アキックス','Акиккус (вымышленная компания)','kompaniya nomi (o‘ylab topilgan)',41)]
for n,s,k,r,u,p in extras:
    out.append(dict(id=f'l{n:02}-extra-{p}' if n!=3 else f'l03-name-{len(out)-1012:02}',lessonId=n,order=30.5 if n==6 else 46.5 if n==16 else 100 if n==3 else 10.5,category='proper' if n in (3,16) else 'word',surface=s,kana=k,translationRu=r,translationUz=u,notesUz='',notesRu='',sourcePdfPages=[p],sourceOriginal='ＭＴ' if s=='MT' else s,reviewStatus='reading-added-not-in-source' if s=='MT' else 'curated'))
(ROOT/'data/curated.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'audit/content-corrections.json').write_text(json.dumps(log,ensure_ascii=False,indent=2),encoding='utf-8')
print('Curated entries beyond lesson 1:',len(out))
