import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { extractSarf, conjugate } from '../shared/sarf';
let active=false;let columns:string[]=[];const verbs=[];let candidates=0;
for(const line of readFileSync('dictionary_backup.sql','utf8').split('\n')){
 if(line.startsWith('COPY public.dictionary_entries ')){columns=line.split('(')[1].split(')')[0].split(', ');active=true;continue;}
 if(line==='\\.'){active=false;continue;}if(!active)continue;
 const d=Object.fromEntries(columns.map((c,i)=>[c,line.split('\t')[i]]));
 if(d.dictionary_source==='Ghoniy'&&d.arabic_definition.startsWith('(فعل'))candidates++;
 const verb=extractSarf({id:Number(d.id),arabic:d.arabic,arabicDefinition:d.arabic_definition,uzbek:d.uzbek==='\\N'?'':d.uzbek,dictionarySource:d.dictionary_source});
 if(verb)verbs.push(verb);
}
assert(verbs.length>100);
for(const verb of verbs){const table=conjugate(verb);assert.equal(table.active[0][0],verb.past);assert.equal(table.active[1][0],verb.present);}
const kataba=verbs.find(v=>v.past==='كَتَبَ')!;assert(kataba);assert.equal(conjugate(kataba).command[0][6],'اُكْتُبْ');
assert.equal(extractSarf({id:1,arabic:'قَالَ',dictionarySource:'Ghoniy',arabicDefinition:'(فعل: ثلاثي) قُلْتُ، أَقُولُ، مصدر قَوْلٌ.'}),null);
assert.equal(extractSarf({id:2,arabic:'كَتَبَ',dictionarySource:'Ghoniy',arabicDefinition:'(فعل: ثلاثي) مصدر كَتْبٌ.|1- يَكْتُبُ كِتَابًا'}),null);
const summary={candidateVerbs:candidates,accepted:verbs.length,byForm:verbs.reduce((a,v)=>(a[v.form==='IV'?'IV':`I-${v.bab}`]=(a[v.form==='IV'?'IV':`I-${v.bab}`]||0)+1,a),{} as Record<string,number>)};
console.log(summary);
if(process.env.SARF_AUDIT_OUTPUT)writeFileSync(process.env.SARF_AUDIT_OUTPUT,JSON.stringify(verbs.map(v=>({verb:v,tables:conjugate(v)}))));
for(const [pv,fv] of [['َ','ُ'],['َ','ِ'],['َ','َ'],['ِ','َ'],['ُ','ُ'],['ِ','ِ']]){
 const sample=verbs.find(v=>v.form==='I'&&v.pastVowel===pv&&v.presentVowel===fv);assert(sample,`Missing bab ${pv}/${fv}`);
}
const multiple=extractSarf({id:3,arabic:'كَتَبَ',dictionarySource:'Ghoniy',arabicDefinition:'(فعل: ثلاثي متعد) كَتَبْتُ، أَكْتُبُ، أَكْتِبُ، مصدر كَتْبٌ.'});assert.equal(multiple,null);
const iv=verbs.find(v=>v.past==='أَكْرَمَ')!;assert(iv);assert.equal(conjugate(iv).active[1][0],'يُكْرِمُ');
assert.equal(conjugate(kataba).active[3][8],'تَكْتُبُوا');
assert.equal(conjugate(kataba).command[1][9],'لَا تَكْتُبِي');
console.log('All six babs, IV, ambiguity rejection and jazm/nahiy checks passed.');
