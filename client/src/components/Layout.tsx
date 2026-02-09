import React from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Search, Edit3, Menu, LogIn, LogOut, User, MessageSquare, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, logout, isAdmin } = useAuth();

  const { data: telegramStats } = useQuery({
    queryKey: ["telegram-stats"],
    queryFn: async () => {
      const res = await fetch("/api/telegram/stats");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const newMessagesCount = telegramStats?.newMessages || 0;

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = location === href;
    return (
      <Link href={href} className={`text-sm font-medium transition-colors hover:text-orange-500 ${isActive ? "text-orange-500" : "text-gray-500"}`}>
        {children}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              AL-QOMUS<span className="text-orange-500">.UZ</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/">Lug'at</NavLink>
            <NavLink href="/about">Loyiha haqida</NavLink>
            
            {isAdmin && (
              <>
                <NavLink href="/admin">
                   <span className="flex items-center gap-1">
                     <Edit3 className="h-3 w-3" />
                     Lug'at
                   </span>
                </NavLink>
                <NavLink href="/admin/telegram">
                   <span className="flex items-center gap-1">
                     <MessageSquare className="h-3 w-3" />
                     Telegram
                   </span>
                </NavLink>
                <Link href="/admin/telegram" data-testid="link-notifications">
                  <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-4 w-4 text-gray-500" />
                    {newMessagesCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-orange-500"
                        data-testid="badge-new-messages"
                      >
                        {newMessagesCount > 9 ? "9+" : newMessagesCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </>
            )}

            {user && (
              <>
                <div className="h-4 w-px bg-gray-200 mx-1"></div>
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {user.username}
                </span>
                <Button variant="ghost" size="sm" onClick={logout} className="text-gray-400 hover:text-red-500 h-8 text-xs">
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Chiqish
                </Button>
              </>
            )}
          </nav>

          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-white">
                <div className="flex flex-col gap-5 mt-8">
                  <Link href="/" onClick={() => setIsOpen(false)} className="text-base font-medium text-gray-800 hover:text-orange-500 transition-colors">
                    Lug'at
                  </Link>
                  <Link href="/about" onClick={() => setIsOpen(false)} className="text-base font-medium text-gray-800 hover:text-orange-500 transition-colors">
                    Loyiha haqida
                  </Link>
                  
                  {isAdmin && (
                    <>
                      <div className="h-px bg-gray-100"></div>
                      <Link href="/admin" onClick={() => setIsOpen(false)} className="text-base font-medium flex items-center gap-2 text-orange-500">
                        <Edit3 className="h-4 w-4" />
                        Lug'at Tahriri
                      </Link>
                      <Link href="/admin/telegram" onClick={() => setIsOpen(false)} className="text-base font-medium flex items-center gap-2 text-orange-500">
                        <MessageSquare className="h-4 w-4" />
                        Telegram
                      </Link>
                      <Link href="/admin/telegram" onClick={() => setIsOpen(false)} className="text-base font-medium flex items-center gap-2 text-gray-600">
                        <Bell className="h-4 w-4" />
                        Murojaatlar
                        {newMessagesCount > 0 && (
                          <Badge className="bg-orange-500 text-white ml-1">
                            {newMessagesCount}
                          </Badge>
                        )}
                      </Link>
                    </>
                  )}

                  {user && (
                    <>
                      <div className="h-px bg-gray-100"></div>
                      <Button variant="ghost" className="justify-start px-0 text-base font-medium text-red-500 hover:text-red-600" onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Chiqish ({user.username})
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-gray-100 bg-gray-50 py-6">
        <div className="container mx-auto px-4 text-center text-gray-400 text-xs">
          <p>&copy; {new Date().getFullYear()} AL-QOMUS.UZ — Professional Arabcha-O'zbekcha lug'at</p>
        </div>
      </footer>
    </div>
  );
}
