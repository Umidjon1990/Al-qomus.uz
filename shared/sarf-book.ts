import {persons,formNames,type SarfDetail} from './sarf-expanded';
import {declineNoun} from './sarf-nouns';
import type {SarfBook} from './sarf-export';
/** Export every supported table, independently of the currently visible UI tab. */
export function buildSarfBook({verb:v,tables:t}:SarfDetail):SarfBook{
 const sections:SarfBook['sections']=[];
 const note='«—» belgisi tizimda ushbu shakl berilmaganini bildiradi.';
 const prefix=(forms:string[]|undefined,p:string)=>(forms||[]).map(w=>w?p+w:'');
 const add=(title:string,headers:string[],columns:(string[]|undefined)[],command=false)=>{
  sections.push({title,headers:['Zamir',...headers],rows:persons.flatMap((p,i)=>command&&(i<6||i>11)?[]:[[p,...columns.map(c=>c?.[i]||'—')]]),note});
 };
 const pair=(title:string,index:number,p='')=>add(title,['Ma’lum','Majhul'],[prefix(t.active[index],p),prefix(t.passive?.[index],p)]);
 pair('Moziy',0);
 pair('Muzori’ — raf’',1);
 pair('Muzori’ — nasb',2,'لَنْ ');
 pair('Muzori’ — jazm',3,'لَمْ ');
 add('Amr va nahiy',['Amr','Nahiy'],t.command,true);
 pair('Lomi amr',3,'لِ');
 for(let i=0;i<2;i++)add('Ta’kidli muzori’ — '+(i?'xafifa':'saqila'),['Ma’lum','Majhul'],[t.emphasis.active[i],t.emphasis.passive?.[i]]);
 add('Ta’kidli amr',['Saqila','Xafifa'],t.emphasis.command,true);
 for(const [label,index,p] of [['Mā — moziy',0,'مَا '],['Lā — muzori’',1,'لَا '],['Lan — nasb',2,'لَنْ '],['Lam — jazm',3,'لَمْ '],['Lammā — jazm',3,'لَمَّا ']] as const)pair('Inkor: '+label,index,p);
 for(const [key,title] of [['subject',t.nominals.subjectLabel||'Ismi foil'],['object','Ismi maf’ul']] as const){
  const noun=t.nominals[key];const declined=noun?declineNoun(noun):[];
  sections.push({title,headers:declined.length?['Shakl','Raf’','Nasb','Jarr']:['Shakl','So‘z'],
   rows:declined.length?declined.map(r=>[r.label,...r.forms.map(w=>w||'—')]):[[title,noun||'—']],
   note:[t.nominals.note,'Ot shakllari noaniq holatda. Solim ko‘plik shaxs bildiruvchi qo‘llanishga tegishli.',note].filter(Boolean).join(' ')});
 }
 // Masdar is lexical: retain recorded forms rather than inventing a pattern.
 const masdars=Array.from(new Set([v.masdar,...v.meanings.map(m=>m.masdar)].filter(Boolean)));
 if(masdars.length)sections.push({title:'Masdar',headers:['Manba','Shakl'],rows:masdars.slice(0,20).map(m=>['Lug‘atda berilgan',m]),note:'Masdar shakllari lug‘atdan olingan.'});
 return {past:v.past,present:v.present,meaning:v.meaning||'',classification:[formNames[v.form]||v.form,v.kind,v.transitive?'O‘timli variant':'O‘timsiz variant'].join(' · '),source:v.source,sections};
}
