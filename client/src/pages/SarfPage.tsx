import { buildSarfBook } from '@shared/sarf-book';
import { exportText, type SarfExport } from '@shared/sarf-export';
import { copySarfText } from '@/lib/sarf-export';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { persons, formNames, type ExpandedVerb, type SarfDetail, type SarfSearch } from '@shared/sarf-expanded';
import { Search, X } from 'lucide-react';
import { declineNoun } from '@shared/sarf-nouns';

type DetailResponse=SarfDetail|{candidates:ExpandedVerb[]};
const btn=(on:boolean)=>`px-3 py-2 rounded-lg text-sm border ${on?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-200'}`;
const arabic='font-arabic text-xl sm:text-2xl px-2 py-2 sm:p-3 leading-loose';
const transitivity=(v:ExpandedVerb)=>v.transitive?'O‘timli variant':'O‘timsiz variant';
function Choices({verbs,onChoose}:{verbs:ExpandedVerb[];onChoose:(v:ExpandedVerb)=>void}) {
 return <div className="space-y-3">{verbs.map(v=><button key={v.id} onClick={()=>onChoose(v)} className="block w-full text-left border rounded-xl bg-white p-3 sm:p-4 hover:border-teal-400">
  <div className="font-arabic text-2xl leading-loose" dir="rtl">{v.past} — {v.present}</div><p className="line-clamp-2 text-sm sm:text-base">{v.meaning||'O‘zbekcha tarjima hali bog‘lanmagan'}</p>
  <p className="text-sm text-gray-500 mt-2">{formNames[v.form]||v.form} · {v.kind} · {transitivity(v)} · Ildiz: {v.root}</p>
 </button>)}</div>;
}
async function response<T>(url:string,options?:RequestInit):Promise<T>{const r=await fetch(url,options);const value=await r.json();if(!r.ok)throw Error(value.error||'Ma’lumot yuklanmadi');return value;}

export default function SarfPage({params}:{params?:{id?:string}}) {
 const [pdfBusy,setPdfBusy]=useState(false);const [pdfUrl,setPdfUrl]=useState('');const [copyFallback,setCopyFallback]=useState('');
 useEffect(()=>()=>{if(pdfUrl)URL.revokeObjectURL(pdfUrl);},[pdfUrl]);
 const resultRef=useRef<HTMLDivElement>(null);
 const inputRef=useRef<HTMLInputElement>(null);
 const [,navigate]=useLocation();const [search,setSearch]=useState('');const [q,setQ]=useState('');const [chosen,setChosen]=useState<string>();
 const [section,setSection]=useState('past');const [voice,setVoice]=useState<'active'|'passive'>('active');const [mood,setMood]=useState(1);
 const [emphasis,setEmphasis]=useState(0);const [negative,setNegative]=useState('ma');const [nounType,setNounType]=useState<'subject'|'object'>('subject');
 const [manual,setManual]=useState<SarfDetail>();const [manualOpen,setManualOpen]=useState(false);const [manualBusy,setManualBusy]=useState(false);const [manualError,setManualError]=useState('');
 const [notice,setNotice]=useState('');const [manualPast,setManualPast]=useState('');const [root,setRoot]=useState('');const [futureType,setFutureType]=useState('');const [triliteral,setTriliteral]=useState(true);const [transitive,setTransitive]=useState(false);
 useEffect(()=>{const t=setTimeout(()=>setQ(search.trim()),300);return()=>clearTimeout(t);},[search]);
 const list=useQuery<SarfSearch>({queryKey:['sarf-v2',q],enabled:!params?.id&&q.length>0,queryFn:()=>response('/api/sarf?q='+encodeURIComponent(q))});
 const automaticId=q&&search.trim()===q&&list.data?.count===1?String(list.data.verbs[0].id):undefined;
 const selectedId=params?.id||chosen||automaticId;
 const detail=useQuery<DetailResponse>({queryKey:['sarf-v2-entry',selectedId],enabled:!!selectedId&&!manual,queryFn:()=>response('/api/sarf/'+selectedId)});
 const data=manual||(detail.data&&'verb' in detail.data?detail.data:undefined);const v=data?.verb;
 useEffect(()=>{setSection('past');setVoice('active');setMood(1);setNotice('');},[selectedId,manual]);
 useEffect(()=>{if(v&&(chosen||manual||params?.id)&&window.scrollY>120)resultRef.current?.scrollIntoView({block:'start'});},[v?.id,chosen,manual,params?.id]);
 const choose=(verb:ExpandedVerb)=>{inputRef.current?.blur();setManualOpen(false);setManual(undefined);setChosen(String(verb.id));if(params?.id)navigate('/sarf/'+verb.id);};
 const changeSearch=(value:string)=>{setManualOpen(false);setSearch(value);setChosen(undefined);setManual(undefined);};
 const reset=()=>{changeSearch('');setQ('');navigate('/sarf');};
 const selected=data?(voice==='passive'?data.tables.passive:data.tables.active):null;
 let forms:string[]=[];let second:string[]|undefined;let title='';
 if(data){
  const t=data.tables;
  if(section==='past'){forms=selected?.[0]||[];title='Moziy';}
  if(section==='present'){forms=(selected?.[mood]||[]).map(w=>(mood===2?'لَنْ ':mood===3?'لَمْ ':'')+w);title='Muzori’';}
  if(section==='command'){forms=t.command[0];second=t.command[1];title='Amr';}
  if(section==='lam'){forms=(selected?.[3]||[]).map(w=>'لِ'+w);title='Lomi amr';}
  if(section==='emphasis'){forms=t.emphasis[voice]?.[emphasis]||[];title=emphasis?'Nuni ta’kid xafifa':'Nuni ta’kid saqila';}
  if(section==='emphatic-command'){forms=t.emphasis.command[emphasis];title='Ta’kidli amr';}
  if(section==='negative'){const col=negative==='ma'?0:negative==='la'?1:negative==='lan'?2:3;forms=(selected?.[col]||[]).map(w=>({ma:'مَا ',la:'لَا ',lan:'لَنْ ',lam:'لَمْ ',lamma:'لَمَّا '}[negative]||'')+w);title='Inkor';}
 }
 const commandOnly=section==='command'||section==='emphatic-command';
 const tabs=[['past','Moziy'],['present','Muzori’'],['command','Amr va nahiy'],['lam','Lomi amr'],['nominals','Foil va maf’ul'],['negative','Inkor'],['emphasis','Ta’kidli muzori’'],['emphatic-command','Ta’kidli amr']];
 const noun=data?.tables.nominals[nounType];const nounRows=noun?declineNoun(noun):[];
 async function submitManual(e:React.FormEvent){e.preventDefault();setManualBusy(true);setManualError('');try{setManual(await response<SarfDetail>('/api/sarf/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({past:manualPast.trim(),root:root.trim(),futureType,triliteral,transitive})}));setChosen(undefined);setManualOpen(false);}catch(e){setManualError((e as Error).message);}finally{setManualBusy(false);}}
 const exportTitle=section==='nominals'?(nounType==='subject'?data?.tables.nominals.subjectLabel||'Ismi foil':'Ismi maf’ul'):
  [title,commandOnly?'':voice==='passive'?'Majhul':'Ma’lum',section==='present'?['','Raf’','Nasb','Jazm'][mood]:'',section==='emphatic-command'?(emphasis?'Xafifa':'Saqila'):''].filter(Boolean).join(' · ');
 const exportData:SarfExport|undefined=v?{
  past:v.past,present:v.present,meaning:v.meaning||'',classification:[formNames[v.form]||v.form,v.kind,transitivity(v)].join(' · '),title:exportTitle,source:v.source,
  headers:section==='nominals'?['Shakl','Raf’','Nasb','Jarr']:['Zamir',title,...(second?['Nahiy']:[])],
  rows:section==='nominals'?nounRows.map(r=>[r.label,...r.forms.map(w=>w||'—')]):persons.flatMap((p,i)=>commandOnly&&(i<6||i>11)?[]:[[p,forms[i]||'—',...(second?[second[i]||'—']:[])]]),
  note:section==='nominals'?'Ot shakllari: noaniq holatdagi jins, son va i’rob. Solim ko‘plik shaxs bildiruvchi qo‘llanishga tegishli.':'Tanlangan grammatik shakl. «—» belgisi ushbu shakl berilmaganini bildiradi.'
 }:undefined;
 const exportKey=JSON.stringify(exportData);
 const latestExport=useRef(exportKey);latestExport.current=exportKey;
 useEffect(()=>{setPdfUrl('');setCopyFallback('');setNotice('');},[exportKey]);
 async function copy(){if(!exportData)return;const text=exportText(exportData);if(await copySarfText(text)){setCopyFallback('');setNotice('Jadval nusxalandi.');}else{setCopyFallback(text);setNotice('Brauzer avtomatik nusxalashga ruxsat bermadi. Quyidagi matnni belgilab, nusxalang.');}}
 async function downloadPdf(){if(!data||pdfBusy)return;setPdfBusy(true);setNotice('');try{
  const r=await fetch('/api/sarf/export/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(buildSarfBook(data))});
  if(!r.ok)throw new Error('PDF tayyorlanmadi. Qayta urinib ko‘ring.');
  const blob=await r.blob();if(!blob.type.includes('application/pdf'))throw new Error('PDF javobi noto‘g‘ri.');
  if(latestExport.current!==exportKey)return;
  const url=URL.createObjectURL(blob);setPdfUrl(url);
  const a=document.createElement('a');a.href=url;a.download='Al-Qomus-Sarf.pdf';document.body.appendChild(a);a.click();a.remove();
  setNotice('Barcha shakllar PDFi tayyor. Yuklash boshlanmasa, quyidagi havolani bosing.');
 }catch(e){setNotice((e as Error).message);}finally{setPdfBusy(false);}}
 return <Layout><div className="sarf-page max-w-4xl mx-auto px-3 sm:px-4 pb-6">
  <style>{`@media print { body * { visibility: hidden; } .sarf-result, .sarf-result * { visibility: visible; } .sarf-result { position: absolute; left: 0; top: 0; width: 100%; } .no-print, .no-print * { display: none !important; } table { break-inside: auto; } tr { break-inside: avoid; } }`}</style>
  <div className="no-print sticky top-10 z-40 -mx-3 sm:-mx-4 border-b border-gray-200 bg-white px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
   <div className="flex items-center justify-between gap-2 mb-2"><h1 className="text-sm font-semibold text-gray-800">Sarf — fe’l tuslash</h1><Link href="/" className="text-xs text-teal-700 py-1">Lug‘atga qaytish</Link></div>
   {!params?.id?<form role="search" onSubmit={e=>{e.preventDefault();setQ(search.trim());inputRef.current?.blur();}} className="relative flex items-center rounded-xl border-2 border-teal-500 bg-white shadow-sm focus-within:ring-2 focus-within:ring-teal-200">
    <Search aria-hidden="true" className="absolute left-3 h-5 w-5 text-teal-600"/>
    <input ref={inputRef} type="search" enterKeyHint="search" autoComplete="off" aria-label="Sarf uchun fe’l qidirish" dir="auto" value={search} onChange={e=>changeSearch(e.target.value)} placeholder="Fe’l yozing…" className="w-full h-12 bg-white text-gray-950 placeholder:text-gray-500 rounded-xl pl-10 pr-11 text-lg outline-none"/>
    {search&&<button type="button" aria-label="Sarf qidiruvini tozalash" onClick={()=>{reset();inputRef.current?.focus();}} className="absolute right-0 p-3 text-gray-600"><X className="h-5 w-5"/></button>}
   </form>:<button onClick={reset} className="w-full text-left rounded-xl border-2 border-teal-500 bg-white px-3 py-3 text-sm text-teal-800">← Boshqa fe’l qidirish</button>}
  </div>
  {!params?.id&&<div className="no-print pt-3">
   {!search.trim()&&!manual&&!chosen&&<div className="mb-3"><p className="text-sm text-gray-500 mb-2">Fe’lni yozing — tarjima va tuslanishi chiqadi.</p><div className="flex gap-2">{['كَتَبَ','قَالَ','رَمَى'].map(w=><button key={w} onClick={()=>changeSearch(w)} className="font-arabic text-xl px-4 py-2 border rounded-lg bg-white">{w}</button>)}</div></div>}
   {q&&search.trim()===q&&list.data?.spellingSuggestion&&<p role="status" className="text-sm text-teal-900 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mb-2">«{q}» o‘rniga quyidagi yozilish topildi. Fe’l oxiridagi ا va ى farqiga e’tibor bering.</p>}
   {q&&list.isLoading&&<p role="status">Fe’llar yuklanmoqda…</p>}
   {q&&list.isError&&<p role="alert">{(list.error as Error).message} <button className="underline" onClick={()=>list.refetch()}>Qayta urinish</button></p>}
   {q&&search.trim()===q&&list.data&&!selectedId&&!manual&&<>
    <p className="text-sm text-gray-500 mb-3">{list.data.count} ta natija. Mos ma’noni tanlang. {list.data.count>60&&'Dastlabki 60 tasi ko‘rsatilmoqda.'}</p>
    {list.data.reverse&&<p className="mb-3 text-teal-800">Tuslangan shakldan topilgan fe’llar:</p>}
    {list.data.count===0&&<p className="p-4 bg-white border rounded-xl mb-3">Mos fe’l topilmadi. Harakatlarni tekshiring yoki quyidagi formula sinoviga moziy va grammatik ma’lumotlarni kiriting.</p>}
    <Choices verbs={list.data.verbs} onChoose={choose}/>
   </>}

  </div>}
  {(selectedId||manual)&&<>

   {!manual&&detail.isLoading&&<p role="status">Jadval yuklanmoqda…</p>}
   {!manual&&detail.isError&&<p role="alert">{(detail.error as Error).message} <button className="underline" onClick={()=>detail.refetch()}>Qayta urinish</button></p>}
   {!manual&&detail.data&&'candidates' in detail.data&&<><p className="mb-3">Bu lug‘at yozuviga bir nechta grammatik variant mos keldi. Ildiz, muzori’ va o‘timlilikni solishtiring.</p><Choices verbs={detail.data.candidates} onChoose={choose}/></>}
  </>}
  {v&&data&&<div ref={resultRef} className="sarf-result scroll-mt-44 pt-3">
   <div className="bg-white border rounded-xl p-3 sm:p-5 mb-3">
    <h2 className="font-arabic text-2xl sm:text-3xl leading-relaxed" dir="rtl">{v.past} — {v.present}</h2>
    <p className="text-base mt-1 line-clamp-2">{v.meaning?.split(';')[0]||'O‘zbekcha tarjima hali bog‘lanmagan.'}</p>
    <p className="mt-1 text-xs text-gray-500">{formNames[v.form]||v.form} · {v.kind}</p>
    <details key={v.id} className="mt-2"><summary className="cursor-pointer text-sm text-teal-700 py-1">Barcha ma’nolar va fe’l haqida</summary>
     <p className="mt-2">{v.meaning||'Tarjima hali bog‘lanmagan.'}</p><p className="mt-2 text-sm">{transitivity(v)} · Ildiz: <span dir="rtl">{v.root}</span></p>
     {v.meanings?.length>1&&v.meanings.map(m=><div key={m.id} className="border-t mt-2 pt-2"><p className="text-xs text-gray-500">{m.source}</p><p>{m.text||'Tarjima kiritilmagan'}</p></div>)}
     {v.masdar&&<p className="mt-2">Masdar: <span className="font-arabic text-xl" dir="rtl">{v.masdar}</span></p>}
    </details>
    {v.manual&&<p className="text-xs text-teal-800 mt-2">Formula sinovi: kiritilgan grammatik ma’lumotlarga asoslangan.</p>}
   </div>
   <h3 className="sr-only">Tuslanishi</h3>
   <label className="no-print sm:hidden flex items-center gap-3 mb-2 text-sm font-medium">Shakl<select aria-label="Tuslanish shakli" value={section} onChange={e=>setSection(e.target.value)} className="min-w-0 flex-1 bg-white border border-gray-300 rounded-lg px-3 py-3">{tabs.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <div className="no-print hidden sm:flex flex-wrap gap-2 mb-3" aria-label="Sarf shakllari">{tabs.map(([id,label])=><button key={id} className={btn(section===id)} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</div>
   {!commandOnly&&section!=='nominals'&&<div className="no-print flex flex-wrap gap-2 mb-3"><button className={btn(voice==='active')} aria-pressed={voice==='active'} onClick={()=>setVoice('active')}>Ma’lum</button>{data.tables.passive&&<button className={btn(voice==='passive')} aria-pressed={voice==='passive'} onClick={()=>setVoice('passive')}>Majhul</button>}</div>}
   {!data.tables.passive&&section==='nominals'&&nounType==='object'&&<p className="text-sm text-gray-600 mb-3">Bu variant o‘timsiz deb belgilangan. Majhul va ismi maf’ulning alohida qo‘llanishlari uchun gap konteksti kerak.</p>}
   {section==='present'&&<div className="no-print flex flex-wrap gap-2 mb-3">{['Raf’','Nasb (لَنْ)','Jazm (لَمْ)'].map((label,i)=><button key={label} className={btn(mood===i+1)} aria-pressed={mood===i+1} onClick={()=>setMood(i+1)}>{label}</button>)}</div>}
   {(section==='emphasis'||section==='emphatic-command')&&<><div className="no-print flex gap-2 mb-3">{['Saqila','Xafifa'].map((x,i)=><button key={x} className={btn(emphasis===i)} onClick={()=>setEmphasis(i)}>{x}</button>)}</div><p className="text-sm mb-3">Ta’kid nuni gapdagi shartlariga ko‘ra qo‘llanadi. Xafifa ikkilik va nuni nisvaga ulanmaydi.</p></>}
   {section==='negative'&&<div className="no-print flex flex-wrap gap-2 mb-3">{[['ma','مَا'],['la','لَا'],['lan','لَنْ'],['lam','لَمْ'],['lamma','لَمَّا']].map(([k,l])=><button key={k} className={btn(negative===k)} onClick={()=>setNegative(k)}>{l}</button>)}</div>}
   {section==='nominals'?<>
    <div className="no-print flex gap-2 mb-3"><button className={btn(nounType==='subject')} onClick={()=>setNounType('subject')}>{data.tables.nominals.subjectLabel}</button><button className={btn(nounType==='object')} onClick={()=>setNounType('object')}>Ismi maf’ul</button></div>
    <p className="font-arabic text-3xl text-center my-4" dir="rtl">{noun||'—'}</p>
    {nounRows.length>0?<div className="overflow-x-auto border rounded-xl bg-white"><table className="w-full text-center"><thead><tr>{['Shakl','Raf’','Nasb','Jarr'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{nounRows.map(row=><tr key={row.label} className="border-t"><td className="text-sm p-3">{row.label}</td>{row.forms.map((word,i)=><td key={i} className={arabic} dir="rtl">{word||'—'}</td>)}</tr>)}</tbody></table></div>:<p className="text-sm">Bu ot shakli uchun tekshirilgan qoida yoki lug‘aviy ma’lumot hozircha yetarli emas.</p>}
    <p className="text-sm text-gray-600 mt-3">Otlar zamirlar bo‘yicha tuslanmaydi. Jadval noaniq holatdagi jins, son va i’robni ko‘rsatadi. Solim ko‘plik shaxs bildiruvchi qo‘llanishga tegishli; siniq ko‘plik va lug‘aviy sifatlar alohida tekshiriladi.</p>
   </>:<div className="overflow-x-auto border rounded-xl bg-white"><table className="w-full text-center"><thead className="bg-gray-50"><tr><th className="p-3">Zamir</th><th className="p-3">{title} {!commandOnly&&voice==='passive'?'— majhul':''}</th>{second&&<th className="p-3">Nahiy</th>}</tr></thead><tbody>{persons.map((p,i)=>commandOnly&&(i<6||i>11)?null:<tr key={p} className="border-t"><td className={arabic} dir="rtl">{p}</td><td className={arabic} dir="rtl">{forms[i]||'—'}</td>{second&&<td className={arabic} dir="rtl">{second[i]}</td>}</tr>)}</tbody></table></div>}
   <div className="no-print my-4">
    <p className="mb-2 text-xs text-gray-500">Hozir tanlangan jadval: {exportTitle}</p>
    <p className="text-xs text-gray-500">PDFga ushbu fe’lning barcha mavjud shakllari kiritiladi.</p><div className="flex flex-wrap gap-2"><button disabled={!exportData?.rows.length} className={btn(false)} onClick={copy}>Jadvalni nusxalash</button><button disabled={pdfBusy||!data} className={btn(true)} onClick={downloadPdf}>{pdfBusy?'PDF tayyorlanmoqda…':'Barcha shakllar — PDF'}</button></div>
    {notice&&<p role="status" className="mt-2 text-sm">{notice}</p>}
    {pdfUrl&&<a className="mt-2 inline-block underline text-teal-700 py-2" href={pdfUrl} download="Al-Qomus-Sarf.pdf" target="_blank" rel="noopener noreferrer">Tayyor PDFni ochish / yuklash</a>}
    {copyFallback&&<label className="block text-sm mt-3">Nusxalash uchun matn<textarea aria-label="Nusxalash uchun jadval" readOnly value={copyFallback} onFocus={e=>{e.currentTarget.select();e.currentTarget.setSelectionRange(0,e.currentTarget.value.length);}} className="block w-full h-64 mt-2 p-3 border rounded-xl bg-white text-base" dir="auto"/></label>}
   </div>
   <p className="text-xs text-gray-500 mt-3">Ma’no manbasi: {v.source}. Sarf: Qutrub qoidalari va Al-qomus qo‘shimchalari. Grammatik variantlar avtomatik bog‘langan; barcha yozuvlar alohida ilmiy tahrirdan o‘tmagan.</p>
   <p className="no-print text-xs mt-2"><a className="underline" href="https://github.com/linuxscout/qutrub">Qutrub</a> · <a className="underline" href="https://github.com/linuxscout/arramooz">Arramooz</a> · <a className="underline" href="https://github.com/Umidjon1990/Al-qomus.uz/tree/main/sarf">Kod va manbalar</a></p>
  </div>}
  {!params?.id&&<div className="no-print mt-3">   <button className="text-sm underline my-4" onClick={()=>setManualOpen(!manualOpen)} aria-expanded={manualOpen}>Lug‘atda topilmagan fe’lni formula bilan sinash</button>
   {manualOpen&&<form onSubmit={submitManual} className="bg-teal-50 border rounded-xl p-4 mb-5 space-y-3">
    <p className="text-sm">Moziyni to‘liq harakatlang. Ildiz, muzori’ harakati va o‘timlilikni o‘zingiz belgilaysiz; natija shu ma’lumotlarga bog‘liq. Fe’lning lug‘atda mavjudligi bu sinov orqali tasdiqlanmaydi.</p>
    <div className="grid sm:grid-cols-2 gap-3"><label>Moziy<input required aria-label="Formula uchun moziy" value={manualPast} onChange={e=>setManualPast(e.target.value)} dir="rtl" placeholder="كَتَبَ" className="block w-full border rounded p-2 text-xl"/></label>
    <label>Ildiz<input required aria-label="Fe’l ildizi" value={root} onChange={e=>setRoot(e.target.value)} dir="rtl" placeholder="كتب" className="block w-full border rounded p-2 text-xl"/></label></div>
    <label className="block">Muzori’da aynul fe’l harakati<select required value={futureType} onChange={e=>setFutureType(e.target.value)} className="block border rounded p-2"><option value="">Tanlang</option><option value="فتحة">Fatha — َ</option><option value="ضمة">Damma — ُ</option><option value="كسرة">Kasra — ِ</option></select></label>
    <label className="block"><input type="checkbox" checked={triliteral} onChange={e=>setTriliteral(e.target.checked)}/> Sulosiy mujarrad (mazid yoki ruboiy uchun belgini olib tashlang)</label>
    <label className="block"><input type="checkbox" checked={transitive} onChange={e=>setTransitive(e.target.checked)}/> Bevosita o‘timli — majhul shakllarini ham ko‘rsatish</label>
    <button disabled={manualBusy} className={btn(true)}>{manualBusy?'Tuslanmoqda…':'Formula bilan tuslash'}</button>{manualError&&<p role="alert">{manualError}</p>}
   </form>}
  </div>}
 </div></Layout>;
}
