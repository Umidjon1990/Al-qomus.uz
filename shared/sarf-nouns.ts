import { canonical } from './sarf-expanded';
/** Productive sound number forms; broken plurals require a lexical entry. */
export function declineNoun(noun:string):{label:string;forms:string[]}[] {
 const s=canonical(noun);
 const manqus=s.endsWith('ٍ');const maqsur=s.endsWith('ًى');
 const base=maqsur?s.slice(0,-2):s.replace(/[ٌٍ]$/,'');
 if(!manqus&&!maqsur&&!s.endsWith('ٌ'))return [];
 const fem=base+(manqus?'ِيَ':maqsur?'َا':'َ');
 const stem=base+(manqus?'ِي':maqsur?'َي':'');
 // Final hamza dual/feminine seating needs its own spelling module.
 if(/[ءأإؤئ]$/.test(base))return [{label:'Muzakkar birlik',forms:[noun,'','']}];
 const acc=base+(base.endsWith('ة')?'ً':'ًا');
 return [
  {label:'Muzakkar birlik',forms:manqus?[s,base+'ِيًا',s]:maqsur?[s,s,s]:[s,acc,base+'ٍ']},
  {label:'Muzakkar ikkilik',forms:[stem+'َانِ',stem+'َيْنِ',stem+'َيْنِ']},
  {label:'Muzakkar ko‘plik (solim)',forms:maqsur?[base+'َوْنَ',base+'َيْنَ',base+'َيْنَ']:[base+'ُونَ',base+'ِينَ',base+'ِينَ']},
  {label:'Muannas birlik',forms:[fem+'ةٌ',fem+'ةً',fem+'ةٍ']},
  {label:'Muannas ikkilik',forms:[fem+'تَانِ',fem+'تَيْنِ',fem+'تَيْنِ']},
  {label:'Muannas ko‘plik (solim)',forms:[fem.replace(/ا$/, '')+'اتٌ',fem.replace(/ا$/, '')+'اتٍ',fem.replace(/ا$/, '')+'اتٍ']},
 ];
}
