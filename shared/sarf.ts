export const persons = ['هُوَ','هُمَا (م)','هُمْ','هِيَ','هُمَا (ف)','هُنَّ','أَنْتَ','أَنْتُمَا (م)','أَنْتُمْ','أَنْتِ','أَنْتُمَا (ف)','أَنْتُنَّ','أَنَا','نَحْنُ'];
const F='َ', K='ِ', D='ُ', S='ْ';
const sound = /^[بتثجحخدذرزسشصضطظعغفقكلمنه]{3}$/;
export const plain = (s:string) => s.normalize('NFC').replace(/[\u064b-\u065f\u0670\u200e\u200fـ]/g,'').trim();
export interface SarfVerb { id:number; past:string; present:string; root:string; form:'I'|'IV'; pastVowel:string; presentVowel:string; bab:number; transitive:boolean; transitivity:string; masdar:string; meaning:string; source:string; }
interface Entry {id:number;arabic:string;arabicDefinition?:string|null;uzbek?:string|null;dictionarySource:string;}
/** Read only the grammatical header. Never extract verb forms from example sentences. */
export function extractSarf(e:Entry):SarfVerb|null {
 if(e.dictionarySource!=='Ghoniy') return null;
 const def=e.arabicDefinition || '';
 const type=def.match(/^\s*\((فعل[^)]+)\)/)?.[1];
 if(!type) return null;
 const word=e.arabic.normalize('NFC').trim();
 const gs=word.match(/[\u0621-\u064a][\u064b-\u0652]*/g)||[];
 if(gs.join('')!==word) return null;
 const form=gs.length===3?'I':gs.length===4&&gs[0][0]==='أ'?'IV':null;
 if(!form || (form==='I'&&!type.includes('ثلاثي'))) return null;
 const root=gs.slice(form==='IV'?1:0).map(g=>g[0]).join('');
 if(!sound.test(root)||root[1]===root[2]||word.includes('ّ'))return null;
 const pV=form==='I'?gs[1].slice(1):F;
 if(![F,K,D].includes(pV))return null;
 const past=form==='IV'?'أ'+F+root[0]+S+root[1]+F+root[2]+F:root[0]+F+root[1]+pV+root[2]+F;
 // Check every supplied mark against the reconstructed sound pattern.
 const expected=past.match(/[\u0621-\u064a][\u064b-\u0652]*/g)!;
 if(gs.some((g,i)=>g.slice(1)&&g!==expected[i]))return null;
 const header=def.slice(def.indexOf(')')+1).split(/(?:\|?\s*1\s*[-ـ]|مصدر|مص\s*:)/)[0];
 const tokens=header.match(/[\u0621-\u064a][\u0621-\u064a\u064b-\u0652]*/g)||[];
 const vowels=new Set<string>();
 for(const token of tokens){
  const t=token.normalize('NFC').match(/[\u0621-\u064a][\u064b-\u0652]*/g)||[];
  if(t.length!==4||!['أ','ي'].includes(t[0][0])||t.slice(1).map(g=>g[0]).join('')!==root||token.includes('ّ'))continue;
  const v=t[2].slice(1);
  if(![F,K,D].includes(v))continue;
  const marks=[form==='IV'?D:F,S,v,D];
  if(t.some((g,i)=>g.slice(1)&&g.slice(1)!==marks[i]))continue;
  vowels.add(v);
 }
 if(vowels.size!==1)return null;
 const v=Array.from(vowels)[0];if(form==='IV'&&v!==K)return null;
 const bab=form==='IV'?4:[F+D,F+K,F+F,K+F,D+D,K+K].indexOf(pV+v)+1;
 if(!bab)return null;
 const present='ي'+(form==='IV'?D:F)+root[0]+S+root[1]+v+root[2]+D;
 const masdar=def.match(/(?:مصدر|مص\s*:)\s*([^|.]+)/)?.[1]?.trim()||'';
 const transitive=type.includes('متعد')&&!type.includes('لازم')&&!type.includes('بحرف');
 return {id:e.id,past,present,root,form,pastVowel:pV,presentVowel:v,bab,transitive,transitivity:type,masdar,meaning:e.uzbek||'',source:e.dictionarySource};
}
export function conjugate(v:SarfVerb){
 const [a,b,c]=v.root.split('');const iv=v.form==='IV';
 if(!sound.test(v.root)||b===c)throw Error('Bu tur hali qo‘shilmagan');
 const pastEnd=['َ','َا','ُوا','َتْ','َتَا','ْنَ','ْتَ','ْتُمَا','ْتُمْ','ْتِ','ْتُمَا','ْتُنَّ','ْتُ','ْنَا'];
 const raf=['ُ','َانِ','ُونَ','ُ','َانِ','ْنَ','ُ','َانِ','ُونَ','ِينَ','َانِ','ْنَ','ُ','ُ'];
 const nasb=['َ','َا','ُوا','َ','َا','ْنَ','َ','َا','ُوا','ِي','َا','ْنَ','َ','َ'];
 const jazm=nasb.map((x,i)=>[0,3,6,12,13].includes(i)?S:x);
 const prefixes=['ي','ي','ي','ت','ت','ي','ت','ت','ت','ت','ت','ت','أ','ن'];
 const past=(passive:boolean)=>pastEnd.map(x=>(iv?'أ'+(passive?D:F)+a+S:a+(passive?D:F))+b+(passive?K:v.pastVowel)+c+x);
 const pres=(passive:boolean,ends:string[])=>ends.map((x,i)=>prefixes[i]+(iv||passive?D:F)+a+S+b+(passive?F:v.presentVowel)+c+x);
 const j=pres(false,jazm);
 const imperative=persons.map((_,i)=>i>=6&&i<=11?(iv?'أ'+F:'ا'+(v.presentVowel===D?D:K))+a+S+b+v.presentVowel+c+jazm[i]:'');
 const join=(word:string)=>word.replace(/([تن])ْ\1/g, '$1ّ');
 const result={active:[past(false),pres(false,raf),pres(false,nasb),j],passive:v.transitive?[past(true),pres(true,raf),pres(true,nasb),pres(true,jazm)]:null,command:[imperative,j.map((x,i)=>i>=6&&i<=11?'لَا '+x:'')]};
 result.active=result.active.map(column=>column.map(join));
 if(result.passive)result.passive=result.passive.map(column=>column.map(join));
 result.command=result.command.map(column=>column.map(join));
 return result;
}
