import { db } from './db';
import { dictionaryEntries } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { extractSarf, plain, type SarfVerb } from '@shared/sarf';
let cache:SarfVerb[]=[];let expires=0;let pending:Promise<SarfVerb[]>|null=null;
export async function sarfCatalog():Promise<SarfVerb[]> {
 if(Date.now()<expires)return cache;
 if(pending)return pending;
 pending=(async()=>{
  const rows=await db.select({id:dictionaryEntries.id,arabic:dictionaryEntries.arabic,arabicDefinition:dictionaryEntries.arabicDefinition,uzbek:dictionaryEntries.uzbek,dictionarySource:dictionaryEntries.dictionarySource}).from(dictionaryEntries).where(eq(dictionaryEntries.dictionarySource,'Ghoniy'));
  cache=rows.map(extractSarf).filter((v):v is SarfVerb=>v!==null);expires=Date.now()+300000;return cache;
 })();
 try{return await pending;}finally{pending=null;}
}
export async function searchSarf(query:string){
 const all=await sarfCatalog();const q=plain(query);const exact=query.normalize('NFC').trim();
 const matches=q?all.filter(v=>[v.past,v.present,v.root].some(w=>plain(w).includes(q))||v.meaning.toLowerCase().includes(q.toLowerCase())):all;
 const rank=(v:SarfVerb)=>v.past===exact||v.present===exact?0:plain(v.past)===q||plain(v.present)===q?1:2;
 matches.sort((a,b)=>rank(a)-rank(b)||a.id-b.id);
 return {total:all.length,count:matches.length,verbs:matches.slice(0,60)};
}
