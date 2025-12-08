import React from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Search, Edit3, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

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
            <NavLink href="/admin">Tahrirlovchi</NavLink>
            <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-white gap-2">
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
                  <Link href="/admin" onClick={() => setIsOpen(false)} className="text-lg font-medium flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Tahrirlovchi
                  </Link>
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
