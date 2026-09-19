import { plain, compatible, type Morphology } from './sarf-expanded';
/** Suggest, never merge, final alif spellings when no exact analysis exists. */
export function suggestFinalAlif<T extends Morphology>(query:string,verbs:T[],analysisIds:number[]):T[]{
 if(analysisIds.length||!/^[ء-يً-ْ]+$/.test(query)||plain(query).length<3)return [];
 if(verbs.some(v=>[v.past,v.present].some(w=>compatible(query,w))))return [];
 const alternate=query.replace(/[اى](?=[ً-ْ]*$)/,letter=>letter==='ا'?'ى':'ا');
 if(alternate===query)return [];
 return verbs.filter(v=>[v.past,v.present].some(w=>compatible(alternate,w)));
}
