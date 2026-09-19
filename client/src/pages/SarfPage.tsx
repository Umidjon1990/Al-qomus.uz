import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { persons, formNames, type ExpandedVerb, type SarfDetail, type SarfSearch } from '@shared/sarf-expanded';
import { declineNoun } from '@shared/sarf-nouns';

type DetailResponse=SarfDetail|{candidates:ExpandedVerb[]};
const btn=(on:boolean)=>`px-3 py-2 rounded-lg text-sm border ${on?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-200'}`;
const arabic='font-arabic text-2xl p-3 leading-loose';
const transitivity=(v:ExpandedVerb)=>v.transitive?'O‘timli variant':'O‘timsiz variant';
function Choices({verbs,onChoose}:{verbs:ExpandedVerb[];onChoose:(v:ExpandedVerb)=>void}) {
 return <div className="space-y-3">{verbs.map(v=><button key={v.id} onClick={()=>onChoose(v)} className="block w-full text-left border rounded-xl bg-white p-4 hover:border-orange-400">
  <div className="font-arabic text-2xl leading-loose" dir="rtl">{v.past} — {v.present}</div><p>{v.meaning||'O‘zbekcha tarjima hali bog‘lanmagan'}</p>
  <p className="text-sm text-gray-500 mt-2">{formNames[v.form]||v.form} · {v.kind} · {transitivity(v)} · Ildiz: {v.root}</p>
 </button>)}</div>;
}
async function response<T>(url:string,options?:RequestInit):Promise<T>{const r=await fetch(url,options);const value=await r.json();if(!r.ok)throw Error(value.error||'Ma’lumot yuklanmadi');return value;}

export default function SarfPage({params}:{params?:{id?:string}}) {
 const [,navigate]=useLocation();const [search,setSearch]=useState('');const [q,setQ]=useState('');const [chosen,setChosen]=useState<string>();
 const [section,setSection]=useState('past');const [voice,setVoice]=useState<'active'|'passive'>('active');const [mood,setMood]=useState(1);
 const [emphasis,setEmphasis]=useState(0);const [negative,setNegative]=useState('ma');const [nounType,setNounType]=useState<'subject'|'object'>('subject');
 const [manual,setManual]=useState<SarfDetail>();const [manualOpen,setManualOpen]=useState(false);const [manualBusy,setManualBusy]=useState(false);const [manualError,setManualError]=useState('');
 const [notice,setNotice]=useState('');const [manualPast,setManualPast]=useState('');const [root,setRoot]=useState('');const [futureType,setFutureType]=useState('');const [triliteral,setTriliteral]=useState(true);const [transitive,setTransitive]=useState(false);
 useEffect(()=>{const t=setTimeout(()=>setQ(search.trim()),300);return()=>clearTimeout(t);},[search]);
 const list=useQuery<SarfSearch>({queryKey:['sarf-v2',q],enabled:!params?.id,queryFn:()=>response('/api/sarf?q='+encodeURIComponent(q))});
 const automaticId=q&&search.trim()===q&&list.data?.count===1?String(list.data.verbs[0].id):undefined;
 const selectedId=params?.id||chosen||automaticId;
 const detail=useQuery<DetailResponse>({queryKey:['sarf-v2-entry',selectedId],enabled:!!selectedId&&!manual,queryFn:()=>response('/api/sarf/'+selectedId)});
 const data=manual||(detail.data&&'verb' in detail.data?detail.data:undefined);const v=data?.verb;
 useEffect(()=>{setSection('past');setVoice('active');setMood(1);setNotice('');},[selectedId,manual]);
 const choose=(verb:ExpandedVerb)=>{setManual(undefined);setChosen(String(verb.id));if(params?.id)navigate('/sarf/'+verb.id);};
 const changeSearch=(value:string)=>{setSearch(value);setChosen(undefined);setManual(undefined);};
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
 async function submitManual(e:React.FormEvent){e.preventDefault();setManualBusy(true);setManualError('');try{setManual(await response<SarfDetail>('/api/sarf/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({past:manualPast.trim(),root:root.trim(),futureType,triliteral,transitive})}));setChosen(undefined);}catch(e){setManualError((e as Error).message);}finally{setManualBusy(false);}}
 async function copy(){if(!v)return;const text=[`${v.past} — ${v.present}`,v.meaning,title,...persons.map((p,i)=>forms[i]?`${p}\t${forms[i]}${second?'\t'+second[i]:''}`:'').filter(Boolean)].join('\n');try{await navigator.clipboard.writeText(text);setNotice('Jadval nusxalandi.');}catch{setNotice('Nusxalash bajarilmadi. Brauzerning chop etish tugmasidan foydalaning.');}}
 return <Layout><div className="sarf-page max-w-4xl mx-auto px-4 py-6">
  <style>{`@media print { body * { visibility: hidden; } .sarf-result, .sarf-result * { visibility: visible; } .sarf-result { position: absolute; left: 0; top: 0; width: 100%; } .no-print, .no-print * { display: none !important; } table { break-inside: auto; } tr { break-inside: avoid; } }`}</style>
  <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold">Sarf — fe’l tuslash</h1><Link href="/" className="text-sm text-orange-700">Lug‘atga qaytish</Link></div>
  {!params?.id&&<div className="no-print">
   <p className="text-gray-600 mb-4">Fe’lning moziy, muzori’ yoki tuslangan shaklini kiriting. Avval tarjima, keyin sarf jadvali chiqadi. Bir nechta grammatik variant topilsa, mosini tanlang.</p>
   <input type="search" aria-label="Sarf uchun fe’l qidirish" dir="auto" value={search} onChange={e=>changeSearch(e.target.value)} placeholder="قَالَ · يَقُولُ · قُلْتُ · aytmoq" className="w-full border rounded-xl px-4 py-3 text-xl mb-3"/>
   <div className="flex flex-wrap gap-2 mb-4">{['كَتَبَ','قَالَ','بَاعَ','رَمَى','وَقَى','مَدَّ','أَكْرَمَ','اِسْتَخْرَجَ'].map(w=><button key={w} onClick={()=>changeSearch(w)} className="font-arabic text-lg px-3 py-1 border rounded-lg bg-white">{w}</button>)}</div>
   {list.isLoading&&<p role="status">Fe’llar yuklanmoqda…</p>}
   {list.isError&&<p role="alert">{(list.error as Error).message} <button className="underline" onClick={()=>list.refetch()}>Qayta urinish</button></p>}
   {list.data&&!selectedId&&!manual&&<>
    <p className="text-sm text-gray-500 mb-3">{list.data.total.toLocaleString()} ta grammatik variant. {q&&`${list.data.count} ta natija.`} {list.data.count>60&&'Dastlabki 60 tasi ko‘rsatilmoqda.'}</p>
    {list.data.reverse&&<p className="mb-3 text-orange-800">Tuslangan shakldan topilgan fe’llar:</p>}
    {list.data.count===0&&<p className="p-4 bg-white border rounded-xl mb-3">Mos fe’l topilmadi. Harakatlarni tekshiring yoki quyidagi formula sinoviga moziy va grammatik ma’lumotlarni kiriting.</p>}
    <Choices verbs={list.data.verbs} onChoose={choose}/>
   </>}
   <button className="text-sm underline my-4" onClick={()=>setManualOpen(!manualOpen)} aria-expanded={manualOpen}>Lug‘atda topilmagan fe’lni formula bilan sinash</button>
   {manualOpen&&<form onSubmit={submitManual} className="bg-orange-50 border rounded-xl p-4 mb-5 space-y-3">
    <p className="text-sm">Moziyni to‘liq harakatlang. Ildiz, muzori’ harakati va o‘timlilikni o‘zingiz belgilaysiz; natija shu ma’lumotlarga bog‘liq. Fe’lning lug‘atda mavjudligi bu sinov orqali tasdiqlanmaydi.</p>
    <div className="grid sm:grid-cols-2 gap-3"><label>Moziy<input required aria-label="Formula uchun moziy" value={manualPast} onChange={e=>setManualPast(e.target.value)} dir="rtl" placeholder="كَتَبَ" className="block w-full border rounded p-2 text-xl"/></label>
    <label>Ildiz<input required aria-label="Fe’l ildizi" value={root} onChange={e=>setRoot(e.target.value)} dir="rtl" placeholder="كتب" className="block w-full border rounded p-2 text-xl"/></label></div>
    <label className="block">Muzori’da aynul fe’l harakati<select required value={futureType} onChange={e=>setFutureType(e.target.value)} className="block border rounded p-2"><option value="">Tanlang</option><option value="فتحة">Fatha — َ</option><option value="ضمة">Damma — ُ</option><option value="كسرة">Kasra — ِ</option></select></label>
    <label className="block"><input type="checkbox" checked={triliteral} onChange={e=>setTriliteral(e.target.checked)}/> Sulosiy mujarrad (mazid yoki ruboiy uchun belgini olib tashlang)</label>
    <label className="block"><input type="checkbox" checked={transitive} onChange={e=>setTransitive(e.target.checked)}/> Bevosita o‘timli — majhul shakllarini ham ko‘rsatish</label>
    <button disabled={manualBusy} className={btn(true)}>{manualBusy?'Tuslanmoqda…':'Formula bilan tuslash'}</button>{manualError&&<p role="alert">{manualError}</p>}
   </form>}
  </div>}
  {(selectedId||manual)&&<>
   <button onClick={reset} className="no-print text-sm text-gray-600 mb-4">← Boshqa fe’l qidirish</button>
   {!manual&&detail.isLoading&&<p role="status">Jadval yuklanmoqda…</p>}
   {!manual&&detail.isError&&<p role="alert">{(detail.error as Error).message} <button className="underline" onClick={()=>detail.refetch()}>Qayta urinish</button></p>}
   {!manual&&detail.data&&'candidates' in detail.data&&<><p className="mb-3">Bu lug‘at yozuviga bir nechta grammatik variant mos keldi. Ildiz, muzori’ va o‘timlilikni solishtiring.</p><Choices verbs={detail.data.candidates} onChoose={choose}/></>}
  </>}
  {v&&data&&<div className="sarf-result">
   <div className="bg-white border rounded-xl p-5 mb-5"><p className="text-xs font-semibold text-orange-700 mb-2">TARJIMA</p><h2 className="font-arabic text-3xl leading-loose" dir="rtl">{v.past} — {v.present}</h2>
    <p className="text-lg mt-2">{v.meaning||'O‘zbekcha tarjima hali bog‘lanmagan.'}</p>
    <p className="mt-2 text-sm text-gray-500">{formNames[v.form]||v.form} · {v.kind} · {transitivity(v)} · Ildiz: <span dir="rtl">{v.root}</span></p>
    {v.meanings?.length>1&&<details className="mt-3"><summary className="cursor-pointer text-sm text-orange-700">Lug‘atlardagi ma’nolar ({v.meanings.length})</summary>{v.meanings.map(m=><div key={m.id} className="border-t mt-2 pt-2"><p className="text-xs text-gray-500">{m.source} · #{m.id}</p><p>{m.text||'Tarjima kiritilmagan'}</p></div>)}</details>}
    {v.masdar&&<p className="mt-3">Masdar (lug‘atdan): <span className="font-arabic text-xl" dir="rtl">{v.masdar}</span></p>}
    {v.manual&&<p className="text-sm text-orange-800 mt-3">Formula sinovi: natija siz kiritgan grammatik ma’lumotlardan hosil qilindi.</p>}
   </div>
   <h3 className="font-semibold text-lg mb-3">Tuslanishi</h3>
   <div className="no-print flex flex-wrap gap-2 mb-3" aria-label="Sarf shakllari">{tabs.map(([id,label])=><button key={id} className={btn(section===id)} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</div>
   {!commandOnly&&section!=='nominals'&&<div className="no-print flex flex-wrap gap-2 mb-3"><button className={btn(voice==='active')} aria-pressed={voice==='active'} onClick={()=>setVoice('active')}>Ma’lum</button>{data.tables.passive&&<button className={btn(voice==='passive')} aria-pressed={voice==='passive'} onClick={()=>setVoice('passive')}>Majhul</button>}</div>}
   {!data.tables.passive&&<p className="text-sm text-gray-600 mb-3">Bu variant o‘timsiz deb belgilangan. Majhul va ismi maf’ulning alohida qo‘llanishlari uchun gap konteksti kerak.</p>}
   {section==='present'&&<div className="no-print flex flex-wrap gap-2 mb-3">{['Raf’','Nasb (لَنْ)','Jazm (لَمْ)'].map((label,i)=><button key={label} className={btn(mood===i+1)} aria-pressed={mood===i+1} onClick={()=>setMood(i+1)}>{label}</button>)}</div>}
   {(section==='emphasis'||section==='emphatic-command')&&<><div className="no-print flex gap-2 mb-3">{['Saqila','Xafifa'].map((x,i)=><button key={x} className={btn(emphasis===i)} onClick={()=>setEmphasis(i)}>{x}</button>)}</div><p className="text-sm mb-3">Ta’kid nuni gapdagi shartlariga ko‘ra qo‘llanadi. Xafifa ikkilik va nuni nisvaga ulanmaydi.</p></>}
   {section==='negative'&&<div className="no-print flex flex-wrap gap-2 mb-3">{[['ma','مَا'],['la','لَا'],['lan','لَنْ'],['lam','لَمْ'],['lamma','لَمَّا']].map(([k,l])=><button key={k} className={btn(negative===k)} onClick={()=>setNegative(k)}>{l}</button>)}</div>}
   {section==='nominals'?<>
    <div className="no-print flex gap-2 mb-3"><button className={btn(nounType==='subject')} onClick={()=>setNounType('subject')}>{data.tables.nominals.subjectLabel}</button><button className={btn(nounType==='object')} onClick={()=>setNounType('object')}>Ismi maf’ul</button></div>
    <p className="font-arabic text-3xl text-center my-4" dir="rtl">{noun||'—'}</p>
    {nounRows.length>0?<div className="overflow-x-auto border rounded-xl bg-white"><table className="w-full text-center"><thead><tr>{['Shakl','Raf’','Nasb','Jarr'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{nounRows.map(row=><tr key={row.label} className="border-t"><td className="text-sm p-3">{row.label}</td>{row.forms.map((word,i)=><td key={i} className={arabic} dir="rtl">{word||'—'}</td>)}</tr>)}</tbody></table></div>:<p className="text-sm">Bu ot shakli uchun tekshirilgan qoida yoki lug‘aviy ma’lumot hozircha yetarli emas.</p>}
    <p className="text-sm text-gray-600 mt-3">Otlar zamirlar bo‘yicha tuslanmaydi. Jadval noaniq holatdagi jins, son va i’robni ko‘rsatadi. Solim ko‘plik shaxs bildiruvchi qo‘llanishga tegishli; siniq ko‘plik va lug‘aviy sifatlar alohida tekshiriladi.</p>
   </>:<div className="overflow-x-auto border rounded-xl bg-white"><table className="w-full text-center"><thead className="bg-gray-50"><tr><th className="p-3">Zamir</th><th className="p-3">{title} {!commandOnly&&voice==='passive'?'— majhul':''}</th>{second&&<th className="p-3">Nahiy</th>}</tr></thead><tbody>{persons.map((p,i)=>commandOnly&&(i<6||i>11)?null:<tr key={p} className="border-t"><td className={arabic} dir="rtl">{p}</td><td className={arabic} dir="rtl">{forms[i]||'—'}</td>{second&&<td className={arabic} dir="rtl">{second[i]}</td>}</tr>)}</tbody></table></div>}
   <div className="no-print flex gap-3 my-4">{section!=='nominals'&&<button className={btn(false)} onClick={copy}>Jadvalni nusxalash</button>}<button className={btn(false)} onClick={()=>window.print()}>Chop etish / PDF</button></div>{notice&&<p role="status" className="no-print text-sm">{notice}</p>}
   <p className="text-xs text-gray-500 mt-3">Ma’no manbasi: {v.source}. Sarf: Qutrub qoidalari va Al-qomus qo‘shimchalari. Grammatik variantlar avtomatik bog‘langan; barcha yozuvlar alohida ilmiy tahrirdan o‘tmagan.</p>
   <p className="no-print text-xs mt-2"><a className="underline" href="https://github.com/linuxscout/qutrub">Qutrub</a> · <a className="underline" href="https://github.com/linuxscout/arramooz">Arramooz</a> · <a className="underline" href="https://github.com/Umidjon1990/Al-qomus.uz/tree/main/sarf">Kod va manbalar</a></p>
  </div>}
 </div></Layout>;
}
