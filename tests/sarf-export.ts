import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sarfExportSchema,exportText} from '../shared/sarf-export';
import {copySarfText} from '../client/src/lib/sarf-export';
import {sarfProcess} from '../server/sarf-process';
async function main(){
 const d={past:'كَتَبَ',present:'يَكْتُبُ',meaning:'yozmoq',classification:'Solim',title:'Moziy · Ma’lum',source:'Al-Qomus',headers:['Zamir','Moziy'],rows:[['هُوَ','كَتَبَ']],note:''};
 assert(sarfExportSchema.safeParse(d).success);
 assert(!sarfExportSchema.safeParse({...d,rows:[['هُوَ']]}).success);
 assert(!sarfExportSchema.safeParse({...d,meaning:'x'.repeat(5001)}).success);
 assert(exportText(d).includes('هُوَ\tكَتَبَ'));
 let copied='',legacy=false,removed=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async(t:string)=>{copied=t;}}}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:null,body:{appendChild(){}},createElement(){return {style:{},focus(){},select(){},setSelectionRange(){},remove(){removed++;}}},execCommand(){legacy=true;return true;}}});
 assert(await copySarfText('كَتَبَ'));assert.equal(copied,'كَتَبَ');assert(!legacy);
 navigator.clipboard.writeText=async()=>{throw Error('denied');};
 assert(await copySarfText('كَتَبَ'));assert(legacy);assert.equal(removed,1);
 document.execCommand=()=>false;assert.equal(await copySarfText('كَتَبَ'),false);assert.equal(removed,2);
 const result=await sarfProcess<{pdf:string}>('export_pdf',d);
 assert(Buffer.from(result.pdf,'base64').subarray(0,5).equals(Buffer.from('%PDF-')));
 console.log('Export schema, Arabic text, clipboard success/fallback/failure, PDF subprocess: passed');
}
main().catch(e=>{console.error(e);process.exit(1);});
