import { plain, matchDictionary, type ExpandedVerb, type Morphology, type DictionarySarfEntry } from '@shared/sarf-expanded';
export function attachMeanings(rows:DictionarySarfEntry[], morphology:Morphology[]):ExpandedVerb[] {
 const index=new Map<string,DictionarySarfEntry[]>();
 for(const row of rows){const k=plain(row.arabic);const list=index.get(k)||[];list.push(row);index.set(k,list);}
 return morphology.map(v=>{
  const entries=(index.get(plain(v.past))||[]).filter(e=>matchDictionary(e,v));
  entries.sort((a,b)=>['Ghoniy','Muasir','Roid'].indexOf(a.dictionarySource)-['Ghoniy','Muasir','Roid'].indexOf(b.dictionarySource));
  const meanings=entries.map(e=>({id:e.id,source:e.dictionarySource,text:e.uzbek||'',masdar:(e.arabicDefinition||'').match(/(?:مصدر|مص\s*:)\s*([^|.]+)/)?.[1]?.trim()||''}));
  // Reviewed supplemental sense; do not borrow the distinct yanulu entry.
  if(v.id===-20002 && v.past==='نَالَ' && v.present==='يَنَالُ' && !meanings.length) meanings.push({id:-20002,source:'Al-qomus',text:'erishmoq; qo‘lga kiritmoq; yetmoq',masdar:'نَيْلٌ، مَنَالٌ'});
  return {...v,meanings,entryIds:entries.map(e=>e.id),meaning:meanings[0]?.text||'',masdar:meanings.find(m=>m.masdar)?.masdar||'',source:meanings.length?Array.from(new Set(meanings.map(m=>m.source))).join(' · ')+' + '+(v.lexicon||'Arramooz'):(v.lexicon||'Arramooz')};
 });
}
