import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
let active=0;
/** Small bounded JSON protocol: user text is never a command-line argument. */
export async function sarfProcess<T>(script:'engine'|'lookup',input:unknown):Promise<T> {
 if(active>=8)throw Error('Sarf band, qayta urinib ko‘ring');
 active++;
 try { return await new Promise<T>((ok,fail)=>{
  const child=spawn(process.env.PYTHON||'python3',[resolve('sarf',script+'.py')],{stdio:['pipe','pipe','pipe']});
  let output='';let settled=false;
  const finish=(error?:Error,value?:T)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)fail(error);else ok(value!);};
  const timer=setTimeout(()=>{child.kill();finish(Error('Sarf vaqti tugadi'));},8000);
  child.on('error',e=>finish(e));
  child.stdin.on('error',e=>finish(e));
  child.stdout.on('data',chunk=>{output+=chunk;if(output.length>256000){child.kill();finish(Error('Sarf javobi juda katta'));}});
  // Drain stderr without exposing internal paths or server information to the client.
  child.stderr.on('data',()=>{});
  child.on('close',code=>{if(code!==0)return finish(Error('Fe’l ma’lumotlari bilan tuslashning iloji bo‘lmadi'));try{finish(undefined,JSON.parse(output));}catch{finish(Error('Sarf javobi noto‘g‘ri'));}});
  child.stdin.end(JSON.stringify(input));
 }); } finally { active--; }
}
