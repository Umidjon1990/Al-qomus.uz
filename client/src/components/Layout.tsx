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

  // Admin uchun yangi xabarlar sonini olish
  const { data: telegramStats } = useQuery({
    queryKey: ["telegram-stats"],
    queryFn: async () => {
      const res = await fetch("/api/telegram/stats");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Har 30 sekundda yangilash
  });

  const newMessagesCount = telegramStats?.newMessages || 0;

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = location === href;
    return (
      <Link href={href} className={`text-sm font-medium transition-colors hover:text-primary ${isActive ? "text-primary" : "text-muted-foreground"}`}>
        {children}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-foreground">
              QOMUS<span className="text-secondary">.UZ</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
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
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {newMessagesCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        data-testid="badge-new-messages"
                      >
                        {newMessagesCount > 9 ? "9+" : newMessagesCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </>
            )}

            <div className="h-4 w-px bg-border mx-2"></div>

            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {user.username}
                </span>
                <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Chiqish
                </Button>
              </div>
            )}
            
            <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-white gap-2 ml-2">
              <Search className="h-4 w-4" />
              Qidirish
            </Button>
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-6 mt-8">
                  <Link href="/" onClick={() => setIsOpen(false)} className="text-lg font-medium">
                    Lug'at
                  </Link>
                  <Link href="/about" onClick={() => setIsOpen(false)} className="text-lg font-medium">
                    Loyiha haqida
                  </Link>
                  
                  {isAdmin && (
                    <>
                      <Link href="/admin" onClick={() => setIsOpen(false)} className="text-lg font-medium flex items-center gap-2 text-primary">
                        <Edit3 className="h-4 w-4" />
                        Lug'at Tahriri
                      </Link>
                      <Link href="/admin/telegram" onClick={() => setIsOpen(false)} className="text-lg font-medium flex items-center gap-2 text-primary">
                        <MessageSquare className="h-4 w-4" />
                        Telegram
                      </Link>
                      <Link href="/admin/telegram" onClick={() => setIsOpen(false)} className="text-lg font-medium flex items-center gap-2 text-orange-600">
                        <Bell className="h-4 w-4" />
                        Murojaatlar
                        {newMessagesCount > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {newMessagesCount}
                          </Badge>
                        )}
                      </Link>
                    </>
                  )}

                  <div className="h-px bg-border my-2"></div>

                  {user && (
                    <Button variant="ghost" className="justify-start px-0 text-lg font-medium text-destructive hover:text-destructive" onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}>
                      <LogOut className="h-5 w-5 mr-2" />
                      Chiqish ({user.username})
                    </Button>
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

      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} QOMUS.UZ. Barcha huquqlar himoyalangan.</p>
          <p className="mt-2">Professional Arabcha-O'zbekcha onlayn lug'at platformasi.</p>
        </div>
      </footer>
    </div>
  );
}
