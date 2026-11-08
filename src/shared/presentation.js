/* Geometry and navigation shared by Vela, preview and native UI tests. */
const metrics=require('./metrics.json')
const GROUP=2
function japaneseLine(s){return /[ぁ-ヿ一-鿿]/.test(s)&&!/[A-Za-zА-Яа-яЁё]/.test(s)}
function fontSize(s,large){return japaneseLine(s)?(large?32:28):(large?24:20)}
function lineHeight(large){return large?36:32}
function compact(text){return text==='Обычные отрицательные формы'?'Обычные отрицания':text}
function measured(text,size){let n=0;for(const c of text)n+=(metrics[c]===undefined?1:metrics[c])*size;return n}
function labelRows(text,size,width){const out=[];let line='';for(const token of text.match(/[^\s]+|\s+/g)||[]){if(/^\s+$/.test(token)){if(line)line+=' ';continue}if(measured(line+token,size)<=width){line+=token;continue}if(measured(token,size)<=width){if(line.trim())out.push(line.trim());line=token;continue}for(const ch of token){if(measured(line+ch,size)>width){out.push(line.trim());line=''}line+=ch}}if(line.trim())out.push(line.trim());return out}
function titleSize(text){for(let size=22;size>=14;size-=2){const rows=labelRows(text,size,158);if(rows.length<=2&&(rows.length===1||size<=20))return size};return 14}
function label(text){text=compact(text);let size=20;while(size>16&&labelRows(text,size,164).length>2)size-=2;return {text:labelRows(text,size,164).join('\n'),size}}
function isPage(a){return a.action==='page'||a.action==='cardPage'}
function frame(v,index){
 const actions=v.buttons.filter(a=>!isPage(a)),count=Math.max(1,Math.ceil(actions.length/GROUP))
 index=Math.max(0,Math.min(index,count-1))
 const buttons=actions.slice(index*GROUP,index*GROUP+GROUP),previous=v.buttons.find(a=>isPage(a)&&a.arg===-1),next=v.buttons.find(a=>isPage(a)&&a.arg===1)
 const prev=index>0?{action:'group',arg:index-1}:previous||null
 const more=index<count-1?{action:'group',arg:index+1}:next||null
 return {index,count,buttons,prev,more,prevLabel:prev?(prev.action==='group'?'Раньше':'←'): '',moreLabel:more?(more.action==='group'?'Ещё':'→'):'',status:v.status||[v.page,count>1?'Меню '+(index+1)+' / '+count:''].filter(Boolean).join(' · '),actionsHeight:buttons.length*68,bodyHeight:254-buttons.length*68,buttonY:i=>338-(buttons.length-1-i)*68}
}
module.exports={GROUP,titleSize,label,compact,japaneseLine,fontSize,lineHeight,frame}
