import { attachMeanings } from './sarf-catalog';
import { readFileSync } from 'node:fs';
import { db } from './db';
import { dictionaryEntries } from '@shared/schema';
import { inArray } from 'drizzle-orm';
import { extractSarf, conjugate } from '@shared/sarf';
import { canonical, plain, compatible, fullyVocalized, matchDictionary, type ExpandedVerb, type Morphology, type SarfDetail, type SarfSearch, type DictionarySarfEntry } from '@shared/sarf-expanded';
import { sarfProcess } from './sarf-process';
let cache:ExpandedVerb[]=[];let expires=0;let pending:Promise<ExpandedVerb[]>|null=null;
const morphology: Morphology[]=JSON.parse(readFileSync('sarf/generated/catalog.json','utf8'));

export async function sarfCatalog():Promise<ExpandedVerb[]> {
 if(Date.now()<expires)return cache;if(pending)return pending;
 pending=(async()=>{
  const rows=await db.select({id:dictionaryEntries.id,arabic:dictionaryEntries.arabic,arabicDefinition:dictionaryEntries.arabicDefinition,uzbek:dictionaryEntries.uzbek,dictionarySource:dictionaryEntries.dictionarySource,wordType:dictionaryEntries.wordType}).from(dictionaryEntries).where(inArray(dictionaryEntries.dictionarySource,['Ghoniy','Muasir','Roid']));
  cache=attachMeanings(rows,morphology);expires=Date.now()+300000;return cache;
 })();try{return await pending;}finally{pending=null;}
}
const reverseCache=new Map<string,{ids:number[];exact:boolean}>();
export async function searchSarf(query:string):Promise<SarfSearch>{
 query=query.replace(/^(?:لَمْ|لَنْ|لَا|لم|لن|لا)\s+/, '');
 const all=await sarfCatalog();const q=plain(query);const exact=canonical(query);
 let reverse=false;let ids:number[]=[];
 if(q&&/^[ء-يً-ْ]+$/.test(query)){
  let result=reverseCache.get(exact);
  if(!result){result=await sarfProcess<{ids:number[];exact:boolean}>('lookup',{query});if(reverseCache.size>=200)reverseCache.delete(reverseCache.keys().next().value!);reverseCache.set(exact,result);}
  ids=result.ids;reverse=ids.length>0&&!all.some(v=>canonical(v.past)===exact||canonical(v.present)===exact);
 }
 const idSet=new Set(ids);
 let matches=q?all.filter(v=>idSet.has(v.id)||[v.past,v.present,v.root].some(w=>plain(w).includes(q))||v.meanings.some(m=>m.text.toLowerCase().includes(q.toLowerCase()))):all;
 // Exact vocalization dominates substring candidates; all lexical senses stay separate.
 if(/[ً-ْ]/.test(query))matches=matches.filter(v=>idSet.has(v.id)||compatible(query,v.past)||compatible(query,v.present));
 const exacts=matches.filter(v=>canonical(v.past)===exact||canonical(v.present)===exact);
 if(exacts.length)matches=exacts;
 else if(reverse&&ids.length)matches=matches.filter(v=>idSet.has(v.id));
 const rank=(v:ExpandedVerb)=>(canonical(v.past)===exact||canonical(v.present)===exact?0:idSet.has(v.id)?1:plain(v.past)===q||plain(v.present)===q?2:3)+(v.meaning?0:0.5);
 matches.sort((a,b)=>rank(a)-rank(b)||Math.abs(a.id)-Math.abs(b.id));
 return {total:all.length,count:matches.length,verbs:matches.slice(0,60),reverse,truncated:ids.length>200};
}
const detailCache=new Map<number,SarfDetail>();
export async function sarfDetail(id:number):Promise<SarfDetail|{candidates:ExpandedVerb[]}|null>{
 const all=await sarfCatalog();
 const candidates=id<0?all.filter(v=>v.id===id):all.filter(v=>v.entryIds.includes(id));
 if(candidates.length>1)return {candidates};
 const verb=candidates[0];if(!verb)return null;
 const cached=detailCache.get(verb.id);if(cached)return {...cached,verb};
 const result=await sarfProcess<{tables:SarfDetail['tables']}>('engine',{past:verb.past,futureType:verb.futureType,root:verb.root,triliteral:verb.triliteral,transitive:verb.transitive});
 const value={verb,tables:result.tables};
 if(detailCache.size>=300)detailCache.delete(detailCache.keys().next().value!);detailCache.set(verb.id,value);
 return value;
}
export async function manualSarf(input:unknown):Promise<SarfDetail>{
 const d=input as Record<string,unknown>;
 if(!d||typeof d.past!=='string'||d.past.length>30||!fullyVocalized(d.past)||typeof d.root!=='string'||!/^[ءأإؤئبتثجحخدذرزسشصضطظعغفقكلمنهوي]{3,4}$/.test(d.root)||!['فتحة','ضمة','كسرة'].includes(String(d.futureType))||typeof d.transitive!=='boolean'||typeof d.triliteral!=='boolean')throw Error('Moziy, ildiz va muzori’ harakatini to‘liq kiriting');
 const result=await sarfProcess<Morphology&{tables:SarfDetail['tables']}>('engine',d);
 const {tables,...metadata}=result;
 const verb:ExpandedVerb={...metadata,id:0,root:d.root,transitive:d.transitive,triliteral:d.triliteral,futureType:String(d.futureType),meaning:'',meanings:[],entryIds:[],masdar:'',source:'Kiritilgan ma’lumot',manual:true};
 // Never silently accept an engine correction to supplied vocalization.
 if(canonical(result.past)!==canonical(d.past))throw Error('Kiritilgan moziy ushbu vaznga mos emas');
 return {verb,tables:result.tables};
}
