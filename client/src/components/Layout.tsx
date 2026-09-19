import React from 'react';
import { Link, useLocation } from 'wouter';
import { BookOpen, Languages, Info, MessagesSquare, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const destinations=[
  {href:'/',label:'Lug‘at',Icon:BookOpen,tone:'mint'},
  {href:'/sarf',label:'Sarf',Icon:Languages,tone:'blue'},
  {href:'/about',label:'Loyiha haqida',Icon:Info,tone:'violet'},
  {href:'/contact',label:'Biz bilan aloqa',Icon:MessagesSquare,tone:'aqua'},
];
export function Layout({children}:{children:React.ReactNode}){
 const [location]=useLocation();const {user,isAdmin,logout}=useAuth();
 return <div className="app-shell min-h-screen flex flex-col font-sans">
  <header className="app-header sticky top-0 z-50">
   <div className="mx-auto max-w-5xl px-4 h-10 flex items-center justify-between">
    <Link href="/" aria-label="Al-Qomus bosh sahifa" className="flex items-center gap-2.5"><span className="brand-mark"><BookOpen size={15}/></span><span className="text-[13px] font-bold tracking-wide">AL-QOMUS<span className="text-emerald-300">.UZ</span></span></Link>
    <span className="text-[10px] tracking-widest text-slate-300">ARABCHA · O‘ZBEKCHA</span>
   </div>
  </header>
  {user&&<div className="no-print mx-auto max-w-5xl flex flex-wrap items-center gap-4 px-4 py-2 text-xs">{isAdmin&&<><Link href="/admin">Lug‘at tahriri</Link><Link href="/admin/telegram">Telegram · Murojaatlar</Link></>}<button onClick={logout} className="flex items-center gap-1"><LogOut size={14}/> Chiqish ({user.username})</button></div>}
  <main className="flex-1">{children}</main>
  <footer className="app-bottom no-print">
   <nav aria-label="Asosiy navigatsiya" className="mx-auto grid max-w-xl grid-cols-4 px-2">
    {destinations.map(({href,label,Icon,tone})=>{const active=href==='/'?location==='/':location===href||location.startsWith(href+'/');return <Link key={href} href={href} aria-current={active?'page':undefined} className={'app-tab '+(active?'is-active':'')}><span className={'app-icon '+tone}><Icon size={23} strokeWidth={1.8}/></span><span className="tab-label">{label}</span></Link>;})}
   </nav>
  </footer>
 </div>;
}
