const E=require('./engine')
const catalog=require('./corpus')
const numbers=require('./numbers')
const romaji=require('./romaji')
const metrics=require('./metrics.json')
const reference=require('./reference')
const P=require('./presentation')
const menu=['Словарь','Проверить себя','Грамматика','Справочник','Числа','Настройки']
/* Small screens are paginated after wrapping; no content is silently ellipsized. */
const japaneseLine=P.japaneseLine
function wrap(text,width){const result=[];let line='';const large=width===14;function measure(s){const size=P.fontSize(s,large);let n=0;for(const c of s)n+=(metrics[c]===undefined?1:metrics[c])*size;return n}function flush(){if(line.trim())result.push(line.trim());line=''}const rawTokens=text.match(/[A-Za-zÀ-ɏА-Яа-яЁёЎўҚқҒғҲҳ0-9‘’ʼ`'-]+|[ぁ-ヿ一-鿿]+|\s+|[^\s]/g)||[];const tokens=[];rawTokens.forEach(t=>{if(/^[,.;:!?、。！？)）\]]+$/.test(t)&&tokens.length&&!/^\s+$/.test(tokens[tokens.length-1]))tokens[tokens.length-1]+=t;else tokens.push(t)});for(const token of tokens){if(token.indexOf('\n')>=0){flush();continue}if(/^\s+$/.test(token)){if(line)line+=' ';continue}if(measure(line+token)<=178){line+=token;continue}flush();if(measure(token)<=178){line=token;continue}for(const ch of token){if(measure(line+ch)>178)flush();line+=ch}}flush();return result.length?result:['']}

/* Balance the last page instead of leaving a dangling final row. */
function splitRows(rows,limit){const pages=[],count=Math.ceil(rows.length/limit);let offset=0;for(let i=0;i<count;i++){const n=Math.ceil((rows.length-offset)/(count-i));pages.push(rows.slice(offset,offset+n));offset+=n}return pages}
function paginate(lines,large,limit){const rows=[];lines.forEach(line=>wrap(line,large?14:18).forEach(t=>rows.push(t)));return rows.length?splitRows(rows,limit||5):[['Нет записей']]}
function dictionaryPages(words,s){const out=[];words.forEach((w,i)=>{const rows=E.japanese(w,s).concat(E.translation(w,s)).reduce((a,t)=>a.concat(wrap(t,s.large?14:18)),[]);const parts=rows.length<=5?[rows]:splitRows(rows.slice(1),4).map(part=>[rows[0]].concat(part));parts.forEach((lines,part)=>out.push({lines,wordIndex:i,last:i,part,parts:parts.length}))});return out}
function create(adapter,loadLesson){
 const corpus={lessons:catalog.lessons,words:[],grammar:[],referenceSource:[]}
 const store=E.writer(adapter)
 let state=E.defaults(),screen={type:'home',page:0},history=[],recovery=null,error='',saved=true,ready=false,cardPage=0,writeBlocked=false
 let notify=()=>{}
 const all=numbers.reduce((a,g)=>a.concat(g.words),[]),byId={};all.forEach(w=>{byId[w.id]=w})
 let loadedLesson=null,loading=false,loadTicket=0
 let wordPages=[],wordPage=0,positionKey='',dictionaryCache=null
 function ensureLesson(n,done){if(n===loadedLesson){done();return}const ticket=++loadTicket;loading=true;notify();Promise.resolve().then(()=>loadLesson(n)).then(data=>{if(ticket!==loadTicket)return;corpus.words.forEach(w=>{delete byId[w.id]});corpus.words=data.words||[];corpus.grammar=data.grammar||[];corpus.words.forEach(w=>{byId[w.id]=w});loadedLesson=n;dictionaryCache=null;loading=false;error='';done();notify()}).catch(e=>{if(ticket!==loadTicket)return;loading=false;error='Не удалось открыть урок';console.error(String(e&&e.message||e));notify()})}
 function sourceLesson(source){const match=source.match(/lesson:(\d+)/);return match?Number(match[1]):null}
 function save(){if(writeBlocked){error='Сначала восстановите сохранение';notify();return}state.revision++;saved=false;notify();const rev=state.revision;store.save(state).then(()=>{if(state.revision===rev){saved=true;error='';notify()}}).catch(()=>{saved=false;error='Не удалось сохранить';notify()})}
 function go(next){history.push(E.clone(screen));screen=Object.assign({page:0},next);cardPage=0;notify()}
 function back(){++loadTicket;loading=false;if(screen.type==='card')save();screen=history.pop()||{type:'home',page:0};cardPage=0;const n=screen.lesson||sourceLesson(screen.source||'');if(n&&n!==loadedLesson)ensureLesson(n,()=>{});notify()}
 function eligible(lesson){return corpus.words.filter(w=>w.lessonId===lesson&&w.category!=='proper'&&w.reviewStatus==='curated')}
 function begin(ids,source,direction){state.session=E.start(ids,source,direction);save();go({type:'card'})}
 function key(q){return q.source+'|'+q.direction}
 function view(){
  const v={title:'Jisho',subtitle:'',lines:[],buttons:[],back:screen.type!=='home',page:'',large:state.settings.large,status:!ready?'Загрузка…':error||(!saved?'Сохранение…':''),screen:screen.type}
  function button(label,action,arg){v.buttons.push({label,action,arg:arg===undefined?'':arg})}
  function text(lines,limit){const pages=paginate(lines,state.settings.large,limit);screen.page=Math.min(screen.page,pages.length-1);v.lines=pages[screen.page];v.page=(screen.page+1)+' / '+pages.length;if(pages.length>1){if(screen.page>0)button('Пред.','page',-1);if(screen.page<pages.length-1)button('След.','page',1)}}
  if(recovery){v.title='Восстановление';text(['Основное сохранение повреждено. Есть резервная копия.']);button('Восстановить','recover');v.back=false;return v}
  if(writeBlocked){v.title='Ошибка сохранения';text(['Не удалось прочитать прогресс. Он не сброшен. Попробуйте перечитать или подтвердите новый старт.'],3);button('Перечитать','reload');button('Новый старт','resetPrompt');v.back=false;if(screen.type==='resetPrompt'){v.title='Сбросить прогресс?';v.lines=wrap('Это удалит результаты.',state.settings.large?14:18);v.buttons=[];button('Сбросить','resetConfirmed');button('Отмена','resetCancel')}return v}
  if(!ready)return v
  if(loading){v.title='Загрузка';v.lines=['Открываем урок…'];return v}
  if(screen.type==='home'){v.subtitle='日本語';menu.forEach((t,i)=>button(t,'section',i));v.lines=['25 уроков · офлайн']}
  if(screen.type==='lessons'){v.title=screen.mode==='test'?'Проверить себя':screen.mode==='grammar'?'Грамматика':'Словарь';const start=screen.page*2;for(let n=start+1;n<=Math.min(start+2,25);n++)button('Урок '+n,'lesson',n);v.lines=['Выбери урок'];if(start>0)button('Пред.','page',-1);if(start+2<25)button('След.','page',1);v.page=(screen.page+1)+' / 13'}
  if(screen.type==='words'){
   v.title='Урок '+screen.lesson
   const words=corpus.words.filter(w=>w.lessonId===screen.lesson&&(screen.names?w.category==='proper':w.category!=='proper'))
   if(!words.length){v.lines=['Исходник доступен.','Чтения и переводы этого урока ещё готовятся.'];button('Читать исходник','source',screen.lesson)}
   else {positionKey=screen.lesson+(screen.names?'-names':'');const savedPos=state.positions[positionKey]||{wordIndex:0,part:0};const pos=typeof savedPos==='number'?{wordIndex:savedPos,part:0}:savedPos;const layoutKey=positionKey+'|'+JSON.stringify(state.settings);if(!dictionaryCache||dictionaryCache.key!==layoutKey)dictionaryCache={key:layoutKey,pages:dictionaryPages(words,state.settings)};wordPages=dictionaryCache.pages;wordPage=wordPages.findIndex(p=>p.wordIndex<=pos.wordIndex&&p.last>=pos.wordIndex&&p.part===(pos.part||0));if(wordPage<0)wordPage=Math.max(0,wordPages.findIndex(p=>p.wordIndex>=pos.wordIndex));const p=wordPages[wordPage];v.lines=p.lines;v.subtitle=(screen.names?'Имена ':'Слова ')+(p.wordIndex+1)+(p.last!==p.wordIndex?'–'+(p.last+1):'')+' / '+words.length;v.page=(wordPage+1)+' / '+wordPages.length+(p.parts>1?' · '+(p.part+1)+'/'+p.parts:'');if(wordPage>0)button('Пред.','page',-1);if(wordPage+1<wordPages.length)button('След.','page',1);if(!screen.names&&corpus.words.some(w=>w.lessonId===screen.lesson&&w.category==='proper'))button('Имена и названия','names')}
  }
  if(screen.type==='source'||screen.type==='grammar'){
   const lesson=corpus.lessons[screen.lesson-1];v.title=(screen.type==='grammar'?'Грамматика ':'Исходник ')+screen.lesson
   const pages=screen.type==='grammar'?lesson.grammarSource:lesson.sourcePages
   v.subtitle='Текст книги · UZ / 日本語';text(pages.reduce((out,p)=>out.concat(['PDF · '+p.page],p.text.split('\n').filter(x=>x.trim())),[]))
  }
  if(screen.type==='grammarTopics'){v.title='Грамматика '+screen.lesson;const topics=corpus.grammar.filter(g=>g.lessonId===screen.lesson),offset=screen.page*2;topics.slice(offset,offset+2).forEach(g=>button(g.title,'grammarRule',g.id));if(offset>0)button('Пред.','page',-1);if(offset+2<topics.length)button('След.','page',1);v.subtitle=topics.length+' тем';v.lines=[];v.page=(screen.page+1)+' / '+Math.ceil(topics.length/2)}
  if(screen.type==='grammarRule'){const g=corpus.grammar.find(g=>g.id===screen.id),s=state.settings;v.title=g.title;v.subtitle='Урок '+g.lessonId;const lines=[];if(s.language!=='uz')lines.push('РУ',g.ru);if(s.language!=='ru')lines.push('UZ',g.uz);lines.push('Пример');lines.push(s.kanji?g.jp:g.kana);if(s.kanji&&g.jp!==g.kana)lines.push(g.kana);if(s.romaji)lines.push(g.romaji);if(s.language!=='uz')lines.push(g.exampleRu);if(s.language!=='ru')lines.push(g.exampleUz);text(lines)}
  if(screen.type==='prepare'){
   v.title='Проверка';const ids=screen.ids;v.lines=[screen.label,ids.length+' карточек'];
   if(state.session&&!state.session.completed){button('Продолжить','resume');button('Новый проход','confirmNew')}
   else {button('Японский → перевод','start','jp-translation');button('Перевод → японский','start','translation-jp')}
   ;['jp-translation','translation-jp'].forEach(d=>{const r=state.results[screen.source+'|'+d];if(r)button('Итог '+(d==='translation-jp'?'→ JP':'JP →')+' '+r.percent+'%','pastResult',d)})
  }
  if(screen.type==='confirmNew'){v.title='Начать заново?';text(['Незаконченная сессия будет заменена. Результаты пройденных уроков сохранятся.']);button('Заменить сессию','replace')}
  if(screen.type==='card'){
   const q=state.session;if(!q){v.lines=['Нет активной проверки'];return v}
   const src=q.source.replace(/^(retry:)+/,'');v.title=src.indexOf('number:')===0?'Числа':'Урок '+src.split(':')[1];v.subtitle=Math.min(q.index+1,q.ids.length)+' / '+q.ids.length
   const word=byId[q.ids[q.index]]
   if(!word){v.lines=['Запись недоступна. Сессия сохранена.'];return v}
   const sides=E.sides(word,state.settings,q.direction),pages=paginate(q.revealed?['Ответ'].concat(sides.back):sides.front,state.settings.large,3)
   cardPage=Math.min(cardPage,pages.length-1);v.lines=pages[cardPage];v.page=(cardPage+1)+' / '+pages.length
   if(cardPage>0)button('Пред.','cardPage',-1);if(cardPage<pages.length-1)button('След.','cardPage',1)
   if(!q.revealed)button('Показать ответ','reveal');else{button('Знал','grade',JSON.stringify([word.id,true]));button('Не знал','grade',JSON.stringify([word.id,false]))}
  }
  if(screen.type==='result'){
   const r=screen.result;v.title='Результат';text(['Знал: '+r.known,'Не знал: '+r.unknown,'Всего: '+r.total,r.percent+'% известных',r.direction==='translation-jp'?'Перевод → японский':'Японский → перевод'],3);if(r.errors.length){button('Повторить ошибки','retry');button('Список ошибок','errors')}
   button(r.source.indexOf('lesson:')>=0?'Весь урок заново':'Весь набор заново','restart');button('Главное меню','home')
  }
  if(screen.type==='errors'){v.title='Ошибки';text(screen.ids.reduce((out,id)=>out.concat(E.japanese(byId[id],state.settings),E.translation(byId[id],state.settings)),[]))}
  if(screen.type==='numbers'){v.title='Числа';const offset=screen.page*2;numbers.slice(offset,offset+2).forEach(g=>button(g.title,'number',g.id));v.lines=['Просмотр и карточки'];if(offset>0)button('Пред.','page',-1);if(offset+2<numbers.length)button('След.','page',1)}
  if(screen.type==='number'){const g=numbers.find(g=>g.id===screen.group);v.title=g.title;const w=g.words[screen.index||0];v.subtitle=((screen.index||0)+1)+' / '+g.words.length;text(E.japanese(w,state.settings).concat(E.translation(w,state.settings)),3);if(screen.index>0)button('Пред. запись','numberWord',-1);if((screen.index||0)+1<g.words.length)button('След. запись','numberWord',1);button('Проверить','numberTest')}
  if(screen.type==='reference'){v.title='Справочник';[['Хирагана','hiragana'],['Катакана','katakana'],['Особенности чтения','pronunciation'],['Частицы','particles'],['Формы глаголов','verbs'],['Счётные суффиксы','counters']].forEach(g=>button(g[0],'refGroup',g[1]));v.lines=['Чтения и формы']}
  if(screen.type==='refGroup'){v.title=screen.label;const entries=reference[screen.group]||[];if(screen.group==='particles'){const wanted=['NはNです','も — тоже','Направление へ','Объект を; Nをします','Место действия で','Инструмент и язык で','Причина から; どうして','Место にNがいます／あります','が внутри определения','Объект は; срок までに'];const topics=corpus.grammar.filter(g=>wanted.indexOf(g.title)>=0),offset=screen.page*2;topics.slice(offset,offset+2).forEach(g=>button(g.title,'grammarRule',g.id));if(offset>0)button('Пред.','page',-1);if(offset+2<topics.length)button('След.','page',1)}else if(screen.group==='counters'){const groups=numbers.filter(g=>g.id.indexOf('counter-')===0||g.id==='age'),offset=screen.page*2;groups.slice(offset,offset+2).forEach(g=>button(g.title,'number',g.id));if(offset>0)button('Пред.','page',-1);if(offset+2<groups.length)button('След.','page',1)}else{const offset=screen.page*2;entries.slice(offset,offset+2).forEach((g,i)=>button(g.title,'refEntry',i+offset));if(offset>0)button('Пред.','page',-1);if(offset+2<entries.length)button('След.','page',1)}}
  if(screen.type==='refEntry'){const entry=reference[screen.group][screen.index],s=state.settings;v.title=entry.title;let lines=[];if(s.language!=='uz')lines.push(entry.ru);if(s.language!=='ru')lines.push(entry.uz);entry.items.forEach(w=>{lines=lines.concat(E.japanese(w,s))});text(lines)}
  if(screen.type==='referencePage'){v.title=screen.label;text(corpus.referenceSource.filter(p=>screen.pages.indexOf(p.page)>=0).reduce((out,p)=>out.concat(['PDF · '+p.page],p.text.split('\n').filter(t=>t.trim())),[]))}
  if(screen.type==='settings'){v.title='Настройки';const s=state.settings;const items=[['Перевод: '+({ru:'русский',uz:'узбекский',both:'оба'}[s.language]),'language'],['Кандзи: '+(s.kanji?'да':'нет'),'kanji'],['Ромадзи: '+(s.romaji?'да':'нет'),'romaji'],['Текст: '+(s.large?'крупный':'обычный'),'large']];items.forEach(i=>button(i[0],'setting',i[1]));button('Тест устройства','diagnostic');v.lines=['Кана видна всегда']}
  if(screen.type==='diagnostic'){v.title='Проверка экрана';text(['日本語：あいうえお 漢字','Русский: Ёжик, й, щ','O‘zbek: o‘, g‘, sh','Проверь читаемость текста.','Свайп вверх / вниз: '+(screen.gesture||'ещё не проверен'),'Запись: '+(saved?'успешно':'ожидается')]);button('Записать настройку','save')}
  if(['home','lessons','prepare','numbers','reference','settings','loading'].indexOf(screen.type)>=0)v.lines=v.lines.reduce((rows,line)=>rows.concat(wrap(line,state.settings.large?14:18)),[])
  if(error)button('Повторить запись','save')
  return v
 }
 function act(action,arg){
  if(action==='recover'){state=recovery;recovery=null;writeBlocked=false;error='';save();return}
  if(action==='reload'){api.load();return}
  if(action==='resetPrompt'){screen={type:'resetPrompt',page:0};notify();return}
  if(action==='resetCancel'){screen={type:'home',page:0};notify();return}
  if(action==='resetConfirmed'){state=E.defaults();writeBlocked=false;error='';screen={type:'home',page:0};save();return}
  if(writeBlocked)return
  if(!ready)return
  if(action==='back'){back();return}
  if(action==='home'){history=[];screen={type:'home',page:0};notify();return}
  if(action==='page'){if(screen.type==='words'){view();const p=wordPages[Math.max(0,Math.min(wordPages.length-1,wordPage+Number(arg)))];if(p){state.positions[positionKey]={wordIndex:p.wordIndex,part:p.part};save()}}else screen.page=Math.max(0,screen.page+Number(arg));notify();return}
  if(action==='names'){go({type:'words',lesson:screen.lesson,names:true});return}
  if(action==='section'){const i=Number(arg);go(i<3?{type:'lessons',mode:['words','test','grammar'][i]}:{type:['reference','numbers','settings'][i-3]});return}
  if(action==='lesson'){const n=Number(arg),mode=screen.mode;ensureLesson(n,()=>{if(mode==='test'){const words=eligible(n);go({type:'prepare',label:'Урок '+n,source:'lesson:'+n,ids:words.map(w=>w.id)})}else go({type:mode==='grammar'?'grammarTopics':'words',lesson:n})});return}
  if(action==='grammarRule')go({type:'grammarRule',id:arg})
  if(action==='pastResult'){const r=state.results[screen.source+'|'+arg];go({type:'result',result:r,ids:screen.ids})}
  if(action==='source'){go({type:'source',lesson:Number(arg)});return}
  if(action==='word'){state.positions[screen.lesson]=Math.max(0,(state.positions[screen.lesson]||0)+Number(arg));screen.page=0;save()}
  if(action==='setting'){if(arg==='language'){const langs=['ru','uz','both'];state.settings.language=langs[(langs.indexOf(state.settings.language)+1)%3]}else state.settings[arg]=!state.settings[arg];screen.page=0;save()}
  if(action==='start')begin(screen.ids,screen.source,arg)
  if(action==='resume'){const n=sourceLesson(state.session.source);if(n)ensureLesson(n,()=>go({type:'card'}));else go({type:'card'})}
  if(action==='confirmNew')go({type:'confirmNew',target:E.clone(screen)})
  if(action==='replace'){screen=screen.target;history.pop();state.session=null;save()}
  if(action==='reveal'){state.session=E.reveal(state.session);cardPage=0;save()}
  if(action==='cardPage')cardPage=Math.max(0,cardPage+Number(arg))
  if(action==='grade'){
   const a=JSON.parse(arg),q=E.grade(state.session,a[0],a[1]);if(q!==state.session){state.session=q;cardPage=0;if(q.completed){const r=E.result(q);state.results[key(q)]=r;screen={type:'result',page:0,result:r,ids:q.ids};history=history.filter(s=>s.type!=='card');}save()}
  }
  if(action==='retry')begin(screen.result.errors,'retry:'+screen.result.source.replace(/^(retry:)+/,''),screen.result.direction)
  if(action==='restart'){const source=screen.result.source.replace(/^(retry:)+/,''),direction=screen.result.direction,n=sourceLesson(source);if(n)ensureLesson(n,()=>begin(eligible(n).map(w=>w.id),source,direction));else{const g=numbers.find(g=>'number:'+g.id===source);begin(g?g.words.map(w=>w.id):screen.ids,source,direction)}}
  if(action==='errors')go({type:'errors',ids:screen.result.errors})
  if(action==='number')go({type:'number',group:arg,index:0})
  if(action==='numberWord'){const g=numbers.find(g=>g.id===screen.group);screen.index=Math.max(0,Math.min(g.words.length-1,screen.index+Number(arg)));screen.page=0}
  if(action==='numberTest'){const g=numbers.find(g=>g.id===screen.group);go({type:'prepare',label:g.title,source:'number:'+g.id,ids:g.words.map(w=>w.id)})}
  if(action==='referencePage'){const groups=[['Кана и сочетания',[22]],['Особенности чтения',[23,24,25,26]],['Частицы',[179,180,181,182]],['Счётные суффиксы',[192,193]]];const g=groups[Number(arg)];go({type:'referencePage',label:g[0],pages:g[1]})}
  if(action==='refGroup'){const labels={hiragana:'Хирагана',katakana:'Катакана',pronunciation:'Чтение',particles:'Частицы',verbs:'Глаголы',counters:'Количество'};if(arg==='particles')ensureLesson('particles',()=>go({type:'refGroup',group:arg,label:labels[arg]}));else go({type:'refGroup',group:arg,label:labels[arg]})}
  if(action==='refEntry')go({type:'refEntry',group:screen.group,index:Number(arg)})
  if(action==='diagnostic')go({type:'diagnostic'})
  if(action==='save')save()
  notify()
 }
 const api={view,act,onChange(fn){notify=fn},async load(){try{const loaded=await store.load();if(loaded.state)state=loaded.state;recovery=loaded.recovery;error=loaded.error||'';writeBlocked=!loaded.state&&!recovery;if(writeBlocked)error='Сохранение не прочитано'}catch(e){error='Хранилище недоступно';writeBlocked=true}ready=true;notify()},swipe(direction){if(screen.type==='diagnostic'){screen.gesture=direction;save()}else if(['words','source','grammar','referencePage','grammarRule','refEntry','errors','number','result','confirmNew','card'].indexOf(screen.type)>=0){const v=view();const action=screen.type==='card'?'cardPage':'page';if(v.buttons.some(b=>b.action===action&&b.arg===(direction==='up'?1:-1)))act(action,direction==='up'?1:-1)}notify()},snapshot(){return E.clone(state)},flush:()=>store.flush()};return api
}
module.exports={create,wrap,paginate,dictionaryPages,japaneseLine}
