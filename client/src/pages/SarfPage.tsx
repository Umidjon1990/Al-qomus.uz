import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { persons, plain, type SarfVerb, type conjugate } from '@shared/sarf';

export default function SarfPage({params}:{params?:{id?:string}}) {
 const [,navigate]=useLocation();const [search,setSearch]=useState('');const [q,setQ]=useState('');
 const [section,setSection]=useState('past');const [voice,setVoice]=useState('active');const [mood,setMood]=useState(1);
 useEffect(()=>{const t=setTimeout(()=>setQ(search.trim()),300);return()=>clearTimeout(t);},[search]);
 const list=useQuery<{total:number;count:number;verbs:SarfVerb[]}>({queryKey:['sarf',q],enabled:!params?.id,queryFn:async()=>{const r=await fetch('/api/sarf?q='+encodeURIComponent(q));if(!r.ok)throw Error();return r.json();}});
 const matches=list.data?.verbs || [];
 const exact=matches.filter(v=>v.past.normalize('NFC')===q.normalize('NFC')||v.present.normalize('NFC')===q.normalize('NFC'));
 const normalized=matches.filter(v=>plain(v.past)===plain(q)||plain(v.present)===plain(q));
 const candidates=exact.length ? exact : normalized;
 const automaticId=q && search.trim()===q && candidates.length===1 ? String(candidates[0].id) : undefined;
 const selectedId=params?.id || automaticId;
 useEffect(()=>{setSection('past');setVoice('active');setMood(1);},[selectedId]);
 const detail=useQuery<{verb:SarfVerb;tables:ReturnType<typeof conjugate>}>({queryKey:['sarf-entry',selectedId],enabled:!!selectedId,queryFn:async()=>{const r=await fetch('/api/sarf/'+selectedId);if(!r.ok)throw Error();return r.json();}});
 const data=detail.data;const v=data?.verb;
 const selected=data?(voice==='passive'?data.tables.passive:data.tables.active):null;
 const forms=section==='command'?data?.tables.command[0]:selected?.[section==='past'?0:mood];
 const tabs=[['past','Moziy'],['present','Muzori’'],['command','Amr va nahiy']];
 const button=(active:boolean)=>`px-4 py-2 rounded-lg text-sm border ${active?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-200'}`;
 return <Layout><div className="max-w-4xl mx-auto px-4 py-6">
   <div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold">Sarf — fe’l tuslash</h1><Link href="/" className="text-sm text-orange-700">Lug‘atga qaytish</Link></div>
   {!params?.id && <>
     <p className="text-gray-600 mb-4">Sulosiy mujarradning solim fe’llari va Af’ala solim. Fe’lni yozing: avval tarjimasi, keyin tuslanishi chiqadi. Bir nechta variant topilsa, ma’nosini tanlang.</p>
     <input type="search" aria-label="Sarf uchun fe’l qidirish" dir="auto" value={search} onChange={e=>setSearch(e.target.value)} placeholder="كَتَبَ · يَكْتُبُ · yozmoq" className="w-full border rounded-xl px-4 py-3 text-xl mb-3" />
     <div className="flex flex-wrap gap-2 mb-5">{['كَتَبَ','سَمِعَ','كَرُمَ','أَكْرَمَ'].map(w=><button key={w} onClick={()=>setSearch(w)} className="font-arabic text-lg px-3 py-1 border rounded-lg bg-white">{w}</button>)}</div>
     {list.isLoading&&<p role="status">Fe’llar yuklanmoqda…</p>}
     {list.isError&&<p role="alert">Ma’lumot yuklanmadi. <button onClick={()=>list.refetch()} className="underline">Qayta urinish</button></p>}
     {list.data&&!selectedId&&<><p className="text-sm text-gray-500 mb-3">{list.data.total} ta yozuvda ushbu bosqich uchun yetarli ma’lumot bor. {q&&`${list.data.count} ta natija.`} {list.data.count>60&&'Dastlabki 60 tasi ko‘rsatilmoqda.'}</p>
       {list.data.count===0&&<p className="p-5 border rounded-xl bg-white">Bu so‘rov uchun tayyor fe’l topilmadi. Illatli, mahmuz va mudaaf fe’llar keyingi bosqichda qo‘shiladi.</p>}
       <div className="space-y-3">{list.data.verbs.map(verb=><Link key={verb.id} href={`/sarf/${verb.id}`} className="block border rounded-xl bg-white p-4 hover:border-orange-400">
         <div className="font-arabic text-2xl leading-loose" dir="rtl">{verb.past} — {verb.present}</div>
         <p className="text-gray-800">{verb.meaning||'Ma’nosi lug‘at izohida'}</p><p className="text-sm text-gray-500 mt-1">{verb.form==='I'?`Sulosiy mujarrad · ${verb.bab}-bob`:'Af’ala'} · {verb.source} · Tuslash →</p>
       </Link>)}</div></>}
   </>}
   {selectedId && <>
     <button onClick={()=>{setSearch('');setQ('');navigate('/sarf');}} className="text-sm text-gray-600 mb-4">← Boshqa fe’l qidirish</button>
     {detail.isLoading&&<p role="status">Jadval yuklanmoqda…</p>}
     {detail.isError&&<p role="alert">Bu yozuvning grammatik ma’lumotlari hozircha tayyor emas yoki yuklanmadi. <button className="underline" onClick={()=>detail.refetch()}>Qayta urinish</button></p>}
     {v&&data&&<>
       <div className="bg-white border rounded-xl p-5 mb-5"><p className="text-xs font-semibold text-orange-700 mb-2">TARJIMA</p><h2 className="font-arabic text-3xl leading-loose" dir="rtl">{v.past} — {v.present}</h2><p className="text-lg mt-2">{v.meaning || 'O‘zbekcha tarjima hali kiritilmagan'}</p><p className="mt-2 text-sm text-gray-500">{v.form==='I'?`Sulosiy mujarrad · ${v.bab}-bob`:'Af’ala bobi'} · Solim · Ildiz: <span dir="rtl">{v.root}</span> · Manba: {v.source}</p>
       {v.masdar&&<p className="mt-2">Masdar (lug‘atdan): <span className="font-arabic text-xl" dir="rtl">{v.masdar}</span></p>}</div>
       <h3 className="font-semibold text-lg mb-3">Tuslanishi</h3><div className="flex flex-wrap gap-2 mb-3" aria-label="Zamon">{tabs.map(([id,label])=><button key={id} className={button(section===id)} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</div>
       {section!=='command'&&<div className="flex flex-wrap gap-2 mb-3"><button className={button(voice==='active')} aria-pressed={voice==='active'} onClick={()=>setVoice('active')}>Ma’lum</button>{data.tables.passive&&<button className={button(voice==='passive')} aria-pressed={voice==='passive'} onClick={()=>setVoice('passive')}>Majhul</button>}</div>}
       {!data.tables.passive&&<p className="text-sm text-gray-600 mb-3">Manbada bevosita o‘timlilik bir ma’noli belgilanmagani uchun majhul jadvali ochilmagan.</p>}
       {section==='present'&&<div className="flex flex-wrap gap-2 mb-3">{['Raf’','Nasb (لَنْ)','Jazm (لَمْ)'].map((label,i)=><button key={label} className={button(mood===i+1)} aria-pressed={mood===i+1} onClick={()=>setMood(i+1)}>{label}</button>)}</div>}
       <div className="overflow-x-auto border rounded-xl bg-white"><table className="w-full text-center"><thead className="bg-gray-50"><tr><th className="p-3">Zamir</th><th className="p-3">{section==='command'?'Amr':section==='past'?'Moziy':'Muzori’'}</th>{section==='command'&&<th className="p-3">Nahiy</th>}</tr></thead><tbody>
       {persons.map((person,i)=>section==='command'&&(i<6||i>11)?null:<tr key={person} className="border-t"><td className="font-arabic text-xl p-3" dir="rtl">{person}</td><td className="font-arabic text-2xl p-3 leading-loose" dir="rtl">{section==='present'&&mood===2?'لَنْ ':section==='present'&&mood===3?'لَمْ ':''}{forms?.[i]}</td>{section==='command'&&<td className="font-arabic text-2xl p-3 leading-loose" dir="rtl">{data.tables.command[1][i]}</td>}</tr>)}</tbody></table></div>
       <p className="text-sm text-gray-600 mt-4">{section==='past'?'Moziy bajarilgan ish-harakatni bildiradi. Shaxs-son qo‘shimchalari fe’l oxiriga qo‘shiladi.':section==='command'?'Amr buyruqni, nahiy taqiqni bildiradi. Nahiy: لَا + muzori’ning jazm shakli.':'Nasb va jazmda af’oli xamsaning nuni tushadi. Nuni nisva saqlanadi.'}</p>
       <p className="text-xs text-gray-500 mt-3">Moziy–muzori’ juftligi lug‘at ta’rifidan ajratilgan. Har bir yozuv alohida ilmiy tahrirdan o‘tgan deb hisoblanmaydi.</p>
     </>}
   </>}
 </div></Layout>;
}
