const fs=require('fs'),path=require('path'),romaji=require('../src/shared/romaji');
const dest=path.resolve(__dirname,'../src/shared/corpus.js'),corpus=require(dest);
corpus.words.forEach(w=>{if(!w.romaji)w.romaji=romaji(w.kana)});
corpus.grammar.forEach(g=>{g.romaji=romaji.example(g.kana)});
fs.writeFileSync(dest,'module.exports='+JSON.stringify(corpus)+'\n');
const coverage=corpus.lessons.map(l=>({lesson:l.id,sourcePages:l.sourcePages.map(p=>p.page),entries:corpus.words.filter(w=>w.lessonId===l.id).length,scoredEntries:corpus.words.filter(w=>w.lessonId===l.id&&w.category!=='proper'&&w.reviewStatus==='curated').length,grammarTopics:corpus.grammar.filter(g=>g.lessonId===l.id).length}));
fs.writeFileSync(path.resolve(__dirname,'../audit/coverage.json'),JSON.stringify(coverage,null,2));
fs.writeFileSync(path.resolve(__dirname,'../data/full-corpus.json'),JSON.stringify(corpus));
const assets=path.resolve(__dirname,'../src/assets/lessons');fs.mkdirSync(assets,{recursive:true});
for(let n=1;n<=25;n++){
 const payload={words:corpus.words.filter(w=>w.lessonId===n),grammar:corpus.grammar.filter(g=>g.lessonId===n)};
 fs.writeFileSync(path.join(assets,String(n).padStart(2,'0')+'.json'),JSON.stringify(payload));
}
const catalog={lessons:corpus.lessons.map(l=>({id:l.id})),words:[],grammar:[],referenceSource:[]};
fs.writeFileSync(dest,'module.exports='+JSON.stringify(catalog)+'\n');
fs.writeFileSync(path.join(assets,'particles.json'),JSON.stringify({grammar:corpus.grammar.filter(g=>['NはNです','も — тоже','Направление へ','Объект を; Nをします','Место действия で','Инструмент и язык で','Причина から; どうして','Место にNがいます／あります','が внутри определения','Объект は; срок までに'].indexOf(g.title)>=0),words:[]}));
const wk=['id','lessonId','order','category','surface','kana','romaji','translationRu','translationUz','reviewStatus'];
const gk=['id','lessonId','title','ru','uz','jp','kana','romaji','exampleRu','exampleUz'];
const packed={};for(const file of fs.readdirSync(assets).filter(f=>f.endsWith('.json'))){const d=JSON.parse(fs.readFileSync(path.join(assets,file),'utf8'));packed[String(file.replace('.json','')).replace(/^0/,'')]=JSON.stringify([d.words.map(w=>wk.map(k=>w[k])),d.grammar.map(g=>gk.map(k=>g[k]))])}
fs.writeFileSync(path.resolve(__dirname,'../src/shared/packed.js'),'const data='+JSON.stringify(packed)+';const wk='+JSON.stringify(wk)+';const gk='+JSON.stringify(gk)+';function expand(rows,keys){return rows.map(row=>{const out={};keys.forEach((k,i)=>out[k]=row[i]);return out})}module.exports=function(n){const d=JSON.parse(data[n]);return {words:expand(d[0],wk),grammar:expand(d[1],gk)}}\n');
console.log(corpus.words.length+' vocabulary entries; '+corpus.grammar.length+' grammar topics');
