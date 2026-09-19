import { plain } from './sarf';
export { persons, plain } from './sarf';
export interface Morphology {
 id:number; past:string; present:string; root:string; form:string; kind:string;
 lexicon?:string; futureType:string; triliteral:boolean; transitive:boolean;
}
export interface SarfMeaning { id:number; source:string; text:string; masdar:string; }
export interface ExpandedVerb extends Morphology {
 meaning:string; source:string; masdar:string; meanings:SarfMeaning[]; entryIds:number[];
 match?:string; manual?:boolean;
}
export interface ExpandedTables {
 active:string[][]; passive:string[][]|null; command:string[][];
 emphasis:{active:string[][];passive:string[][]|null;command:string[][]};
 nominals:{subject:string|null;object:string|null;subjectLabel:string;note:string};
}
export interface SarfDetail {verb:ExpandedVerb;tables:ExpandedTables;matched?:{label:string;person:number;word:string}[]}
export interface SarfSearch {total:number;count:number;verbs:ExpandedVerb[];reverse:boolean;spellingSuggestion?:boolean;truncated?:boolean}
export const formNames:Record<string,string> = {'I':'Sulosiy mujarrad','II':'Fa‘‘ala','III':'Fā‘ala','IV':'Af‘ala','V':'Tafa‘‘ala','VI':'Tafā‘ala','VII':'Infa‘ala','VIII':'Ifta‘ala','IX':'If‘alla','X':'Istaf‘ala','Q-I':'Ruboiy mujarrad','Q-II':'Tafa‘lala','Q-derived':'Ruboiy mazid',derived:'Mazid (kam qo‘llanadigan vazn)'};
export const canonical=(s:string)=>s.normalize('NFC').replace(/([ً-ِْ])ّ/g,'ّ$1').replace(/([تن])ْ\1/g,'$1ّ').trim();
const graphemes=(s:string)=>canonical(s).match(/[ء-ي][ً-ْ]*/g)||[];
/** Missing vowels are unknown, but supplied vowels and shadda must never conflict. */
export function compatible(supplied:string,complete:string):boolean {
 const a=graphemes(supplied),b=graphemes(complete);
 return plain(supplied)===plain(complete)&&a.length===b.length&&a.every((x,i)=>x[0]===b[i][0]&&x.slice(1).split('').every(mark=>b[i].includes(mark)));
}
export function fullyVocalized(word:string):boolean {
 const gs=graphemes(word);
 if(!gs.length||gs.join('')!==canonical(word))return false;
 return gs.every((g,i)=>/[َُِْ]/.test(g)||g[0]==='آ'||(i>0&&((g==='ا'||g==='ى')&&gs[i-1].includes('َ')||g==='و'&&gs[i-1].includes('ُ')||g==='ي'&&gs[i-1].includes('ِ'))));
}
export interface DictionarySarfEntry {id:number;arabic:string;arabicDefinition?:string|null;uzbek?:string|null;dictionarySource:string;wordType?:string|null;}
export function dictionaryVerb(e:DictionarySarfEntry):boolean {
 return /fe[‘’ʼ'’]?l|فعل/i.test(e.wordType||'')||/^\s*\(فعل/.test(e.arabicDefinition||'')||e.dictionarySource==='Muasir'&&/فهو|فهي/.test((e.arabicDefinition||'').split('|')[0]);
}
export function matchDictionary(e:DictionarySarfEntry,v:Morphology):boolean {
 if(!dictionaryVerb(e)||!compatible(e.arabic,v.past))return false;
 const def=e.arabicDefinition||'';
 const header=e.dictionarySource==='Ghoniy'?def.slice(def.indexOf(')')+1).split(/(?:\|?\s*1\s*[-ـ]|مصدر|مص\s*:)/)[0]:def.split('|')[0].split('فهو')[0];
 const tokens=header.match(/[ء-ي][ء-يً-ْ]*/g)||[];
 const present=tokens.filter(w=>/^[يأ]/.test(w)&&plain(w).length>=3).map(w=>w.replace(/^أ/,'ي'));
 // Require a grammatical imperfect match, never guess from a headword alone.
 return present.some(w=>compatible(w,v.present));
}
