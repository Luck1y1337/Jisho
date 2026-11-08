/* Pure domain logic shared by the browser, Vela and Node tests. */
const SCHEMA = 1
function clone(value) { return JSON.parse(JSON.stringify(value)) }
function defaults() { return {schema:SCHEMA, revision:0, settings:{language:'both',kanji:true,romaji:true,large:false}, positions:{}, results:{}, session:null} }
function hash(text) { let h=2166136261; for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)} return (h>>>0).toString(16) }
function encode(state) { const payload=JSON.stringify(state); return JSON.stringify({payload,checksum:hash(payload)}) }
function decode(raw) {
  if(!raw) return null
  const envelope=JSON.parse(raw)
  if(typeof envelope.payload!=='string'||hash(envelope.payload)!==envelope.checksum) throw Error('Повреждено сохранение')
  const state=JSON.parse(envelope.payload)
  if(state.schema!==SCHEMA||!Number.isInteger(state.revision)||state.revision<0) throw Error('Версия сохранения не поддерживается')
  const s=state.settings
  if(!s||['ru','uz','both'].indexOf(s.language)<0||['kanji','romaji','large'].some(k=>typeof s[k]!=='boolean')) throw Error('Повреждены настройки')
  if(!state.positions||!state.results||Array.isArray(state.positions)||Array.isArray(state.results)) throw Error('Повреждено состояние')
  if(state.session){
    const q=state.session
    if(!Array.isArray(q.ids)||!q.ids.length||q.ids.some(id=>typeof id!=='string')||new Set(q.ids).size!==q.ids.length||!Array.isArray(q.answers)||q.answers.length>q.ids.length||q.index!==q.answers.length||typeof q.revealed!=='boolean'||typeof q.source!=='string'||typeof q.completed!=='boolean'||q.completed!==(q.index===q.ids.length)||['jp-translation','translation-jp'].indexOf(q.direction)<0||q.answers.some((a,i)=>!a||a.id!==q.ids[i]||typeof a.known!=='boolean')) throw Error('Повреждена сессия')
  }
  return state
}
function shuffle(ids,random) { const out=ids.slice(); for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));const t=out[i];out[i]=out[j];out[j]=t} return out }
function start(ids,source,direction,random) {
  if(!ids.length||new Set(ids).size!==ids.length) throw Error('Набор пуст или содержит повторы')
  if(['jp-translation','translation-jp'].indexOf(direction)<0) throw Error('Неизвестное направление')
  return {ids:shuffle(ids,random||Math.random),source,direction,index:0,revealed:false,answers:[],completed:false}
}
function reveal(q) { if(!q||q.completed) return q; const next=clone(q);next.revealed=true;return next }
function grade(q,id,known) {
  if(!q||q.completed||!q.revealed||q.ids[q.index]!==id||typeof known!=='boolean') return q
  const next=clone(q);next.answers.push({id,known});next.index++;next.revealed=false;next.completed=next.index===next.ids.length;return next
}
function result(q) {
  if(!q||!q.completed||q.answers.length!==q.ids.length) throw Error('Проверка ещё не закончена')
  const errors=q.answers.filter(a=>!a.known).map(a=>a.id)
  return {source:q.source,direction:q.direction,total:q.ids.length,known:q.ids.length-errors.length,unknown:errors.length,percent:Math.round(100*(q.ids.length-errors.length)/q.ids.length),errors}
}
function japanese(word,s){const lines=[s.kanji?word.surface:word.kana];if(s.kanji&&word.kana!==word.surface)lines.push(word.kana);if(s.romaji)lines.push(word.romaji);return lines}
function translation(word,s){const lines=[];if(s.language!=='uz')lines.push((s.language==='both'?'РУ: ':'')+word.translationRu);if(s.language!=='ru')lines.push((s.language==='both'?'UZ: ':'')+word.translationUz);return lines}
function sides(word,s,direction){const jp=japanese(word,s);const tr=translation(word,s);return direction==='translation-jp'?{front:tr,back:jp}:{front:jp,back:tr}}
/* A serial writer captures immutable snapshots; a slow old callback cannot win. */
function writer(adapter) {
  let queue=Promise.resolve(),last=null
  return {save(state){const raw=encode(clone(state)); const task=queue.then(async()=>{if(last)await adapter.set('backup',last);await adapter.set('primary',raw);last=raw});queue=task.catch(()=>{});return task},
    async load(){const primary=await adapter.get('primary');try{const state=decode(primary);if(state){last=primary;return {state,recovery:null}}const backup=await adapter.get('backup');if(backup)return {state:null,recovery:decode(backup),error:'Основной слот отсутствует'};}catch(error){const backup=await adapter.get('backup');try{return {state:null,recovery:decode(backup),error:error.message}}catch(e){return {state:null,recovery:null,error:error.message}}}return {state:defaults(),recovery:null}},
    flush(){return queue}}
}
module.exports={SCHEMA,clone,defaults,encode,decode,start,reveal,grade,result,japanese,translation,sides,writer}
