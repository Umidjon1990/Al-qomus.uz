import React from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpenText,
  GraduationCap,
  Info,
  LogOut,
  Menu,
  MessageSquare,
  PencilLine,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";

const publicLinks = [
  { href: "/", label: "Lug'at", icon: BookOpenText },
  { href: "/quiz", label: "So'z mashqi", icon: GraduationCap },
  { href: "/about", label: "Loyiha", icon: Info },
];

function HeaderLink({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const active = location === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? "bg-primary/10 text-primary"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      {label}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="AL-QOMUS.UZ bosh sahifasi"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#173f35] font-arabic text-2xl font-bold text-white shadow-sm transition-transform group-hover:-translate-y-0.5">
              ق
            </span>
            <span className="leading-none">
              <span className="block text-[15px] font-extrabold tracking-[0.08em] text-slate-950">
                AL-QOMUS
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Arabcha · O'zbekcha
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Asosiy navigatsiya">
            {publicLinks.map((link) => (
              <HeaderLink key={link.href} href={link.href} label={link.label} />
            ))}

            {isAdmin && (
              <>
                <span className="mx-2 h-6 w-px bg-slate-200" />
                <HeaderLink href="/admin" label="Tahririyat" />
                <HeaderLink href="/admin/telegram" label="Telegram" />
              </>
            )}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user && (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {user.username}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-9 w-9 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
                  aria-label="Tizimdan chiqish"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl"
                  aria-label="Menyuni ochish"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[86vw] max-w-sm bg-white p-0">
                <div className="border-b border-slate-100 px-6 py-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Menyu</p>
                </div>
                <nav className="space-y-1 p-4" aria-label="Mobil navigatsiya">
                  {publicLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      {label}
                    </Link>
                  ))}

                  {isAdmin && (
                    <>
                      <div className="my-3 h-px bg-slate-100" />
                      <Link
                        href="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <PencilLine className="h-4 w-4 text-primary" aria-hidden="true" />
                        Lug'at tahriri
                      </Link>
                      <Link
                        href="/admin/telegram"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                        Telegram boshqaruvi
                      </Link>
                    </>
                  )}

                  {user && (
                    <>
                      <div className="my-3 h-px bg-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Tizimdan chiqish
                      </button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} AL-QOMUS.UZ — bepul arabcha-o'zbekcha e-lug'at</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="font-medium hover:text-primary">Loyiha haqida</Link>
            <span aria-hidden="true">·</span>
            <span>108 000+ so'z va ibora</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
