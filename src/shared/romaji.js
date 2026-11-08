/* Kana-spelling Hepburn: ou/oo retained, ー repeats the preceding vowel.
   Particles in phrases have explicit pronunciation overrides. */
const rows=[['あいうえお','a i u e o'],['かきくけこ','ka ki ku ke ko'],['さしすせそ','sa shi su se so'],['たちつてと','ta chi tsu te to'],['なにぬねの','na ni nu ne no'],['はひふへほ','ha hi fu he ho'],['まみむめも','ma mi mu me mo'],['やゆよ','ya yu yo'],['らりるれろ','ra ri ru re ro'],['わゐゑをん','wa wi we o n'],['がぎぐげご','ga gi gu ge go'],['ざじずぜぞ','za ji zu ze zo'],['だぢづでど','da ji zu de do'],['ばびぶべぼ','ba bi bu be bo'],['ぱぴぷぺぽ','pa pi pu pe po'],['ぁぃぅぇぉゃゅょゎゔ','a i u e o ya yu yo wa vu']]
const map={};rows.forEach(r=>Array.from(r[0]).forEach((c,i)=>map[c]=r[1].split(' ')[i]));
const combos={'きゃ':'kya','きゅ':'kyu','きょ':'kyo','しゃ':'sha','しゅ':'shu','しょ':'sho','ちゃ':'cha','ちゅ':'chu','ちょ':'cho','にゃ':'nya','にゅ':'nyu','にょ':'nyo','ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo','みゃ':'mya','みゅ':'myu','みょ':'myo','りゃ':'rya','りゅ':'ryu','りょ':'ryo','ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo','じゃ':'ja','じゅ':'ju','じょ':'jo','ぢゃ':'ja','ぢゅ':'ju','ぢょ':'jo','びゃ':'bya','びゅ':'byu','びょ':'byo','ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo','ふぁ':'fa','ふぃ':'fi','ふぇ':'fe','ふぉ':'fo','てぃ':'ti','でぃ':'di','とぅ':'tu','どぅ':'du','しぇ':'she','ちぇ':'che','じぇ':'je','うぃ':'wi','うぇ':'we','うぉ':'wo','つぁ':'tsa','つぇ':'tse','つぉ':'tso','でゅ':'dyu'};
const phrases={'こちらは～さんです。':'こちらわ～さんです。','おなまえは？':'おなまえわ？','ごちゅうもんは？':'ごちゅうもんわ？','[～は] いかがですか。':'[～わ] いかがですか。','[～は] ちょっと・・・・。':'[～わ] ちょっと・・・・。','くにへかえるの？':'くにえかえるの？','しんごうをみぎへまがってください。':'しんごうをみぎえまがってください。'};
function romaji(input){
 let s=phrases[input]||input;s=Array.from(s).map(c=>{const n=c.charCodeAt(0);return n>=0x30a1&&n<=0x30f6?String.fromCharCode(n-0x60):c}).join('');
 const tokens=[];
 for(let i=0;i<s.length;i++){const c=s[i];if(combos[s.slice(i,i+2)]){tokens.push(combos[s.slice(i,i+2)]);i++}else tokens.push(c==='っ'?'$':c==='ー'?'~':map[c]||c)}
 let out='';for(let i=0;i<tokens.length;i++){const t=tokens[i],next=tokens[i+1]||'';if(t==='$'){out+=next.indexOf('ch')===0?'t':/^[bcdfghjklmpqrstvwxyz]/.test(next)?next[0]:''}else if(t==='~'){const m=out.match(/[aeiou](?=[^aeiou]*$)/);out+=m?m[0]:''}else if(t==='n'&&/^[aeiouy]/.test(next))out+="n'";else out+=t}return out
}
romaji.example=function(s){return romaji(s.replace(/(わたし|これ|このほん|ほん|あした|きのう|しゅみ|でんしゃ|このへや|たなかさん)は/g,'$1わ').replace(/(にほん|がっこう|うち|えき|くに)へ/g,'$1え'))}
module.exports=romaji
