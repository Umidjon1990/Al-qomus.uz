import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { attachMeanings } from '../server/sarf-catalog';
import { compatible, fullyVocalized, type DictionarySarfEntry, type Morphology } from '../shared/sarf-expanded';
import { declineNoun } from '../shared/sarf-nouns';
let active=false;let names:string[]=[];const entries:DictionarySarfEntry[]=[];
for(const line of readFileSync('dictionary_backup.sql','utf8').split('\n')){
 if(line.startsWith('COPY public.dictionary_entries ')){names=line.split('(')[1].split(')')[0].split(', ');active=true;continue;}
 if(line==='\\.'){active=false;continue;}if(!active)continue;
 const cells=line.split('\t');const d=Object.fromEntries(names.map((name,i)=>[name,cells[i]==='\\N'?null:cells[i]]));
 entries.push({id:Number(d.id),arabic:d.arabic!,arabicDefinition:d.arabic_definition,uzbek:d.uzbek,dictionarySource:d.dictionary_source!,wordType:d.word_type});
}
const morphology:Morphology[]=JSON.parse(readFileSync('sarf/generated/catalog.json','utf8'));
const all=attachMeanings(entries,morphology);
assert(all.length>13000);
const qal=all.filter(v=>v.past==='قَالَ');assert(qal.length>=2);
const speak=qal.find(v=>v.present==='يَقُولُ');const nap=qal.find(v=>v.present==='يَقِيلُ');assert(speak);assert(nap);
assert(speak.entryIds.includes(23624));assert(!speak.entryIds.includes(23758));assert(nap.entryIds.includes(23758));assert(!nap.entryIds.includes(23624));
for(const w of ['كَتَبَ','قَالَ','بَاعَ','رَمَى','دَعَا','وَعَدَ','مَدَّ','أَكَلَ','وَقَى','طَوَى','أَقَامَ','اِسْتَخْرَجَ','دَحْرَجَ'])assert(all.some(v=>v.past===w&&v.meaning),`Translation missing ${w}`);
assert(!compatible('يَكْتُبُ','يُكْتِبُ'));assert(compatible('يكتب','يَكْتُبُ'));assert(!compatible('يَقِيلُ','يَقُولُ'));
for(const w of ['كَتَبَ','قَالَ','مَدَّ','أَكْرَمَ','رَمَى'])assert(fullyVocalized(w));
for(const w of ['كتب','كَتبَ','قال','<script>','كَتَبَ ;'])assert(!fullyVocalized(w));
assert.deepEqual(declineNoun('كَاتِبٌ')[0].forms,['كَاتِبٌ','كَاتِبًا','كَاتِبٍ']);
assert.deepEqual(declineNoun('رَامٍ')[0].forms,['رَامٍ','رَامِيًا','رَامٍ']);
assert.equal(declineNoun('مُعْطًى')[5].forms[0],'مُعْطَاتٌ');
assert.equal(declineNoun('رَامٍ')[3].forms[0],'رَامِيَةٌ');
const summary={variants:all.length,translated:all.filter(v=>v.meaning).length,linkedEntries:new Set(all.flatMap(v=>v.entryIds)).size,byForm:Object.fromEntries(Array.from(new Set(all.map(v=>v.form))).sort().map(form=>[form,all.filter(v=>v.form===form).length]))};
console.log(JSON.stringify(summary,null,2));
if(process.env.SARF_CATALOG_FIXTURE)writeFileSync(process.env.SARF_CATALOG_FIXTURE,JSON.stringify(all));
console.log('Dictionary sense isolation, vocalization and nominal regression checks passed.');
