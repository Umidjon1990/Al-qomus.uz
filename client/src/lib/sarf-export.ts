/** Clipboard may be unavailable in in-app browsers. Never claim success on failure. */
export async function copySarfText(text:string):Promise<boolean>{
 try {if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}}catch{/* fall back */}
 const previous=document.activeElement as HTMLElement|null;
 const field=document.createElement('textarea');field.value=text;field.readOnly=true;
 field.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
 document.body.appendChild(field);
 try {field.focus();field.select();field.setSelectionRange(0,text.length);return document.execCommand('copy');}
 catch {return false;}finally{field.remove();previous?.focus({preventScroll:true});}
}
