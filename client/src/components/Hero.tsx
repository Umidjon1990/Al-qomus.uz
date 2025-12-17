import React from "react";
import { motion } from "framer-motion";
import { Search, Book, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import stockImage from '@assets/stock_images/islamic_geometric_pa_33a8e635.jpg';

interface HeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchMode: 'dictionary' | 'synonyms';
  setSearchMode: (mode: 'dictionary' | 'synonyms') => void;
}

export function Hero({ searchTerm, setSearchTerm, searchMode, setSearchMode }: HeroProps) {
  return (
    <div className="relative w-full h-[550px] flex items-center justify-center overflow-hidden">
      {/* Background with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${stockImage})` }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-background/90 via-background/80 to-background" />

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 flex flex-col items-center text-center max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block py-1 px-3 rounded-full bg-secondary/10 text-secondary-foreground text-sm font-medium mb-4 border border-secondary/20">
            SAYT • TEST REJIMIDA ISHLAMOQDA..
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-serif leading-tight">
            Arab tili so'z boyligiga  <br/>
            <span className="text-primary italic">professional</span> yechim 
          </h1>
          <p className="text-base text-muted-foreground mb-6 max-w-xl mx-auto">
            Minglab so'zlarning aniq tarjimasi, grammatik tahlili va sinonimlari.
          </p>
        </motion.div>

        {/* Search Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex gap-3 mb-6"
        >
          <button
            data-testid="mode-dictionary"
            onClick={() => setSearchMode('dictionary')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
              searchMode === 'dictionary'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'bg-card/80 text-muted-foreground hover:bg-card border border-border'
            }`}
          >
            <Book className="h-4 w-4" />
            <span>Lug'at qidirish</span>
          </button>
          <button
            data-testid="mode-synonyms"
            onClick={() => setSearchMode('synonyms')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
              searchMode === 'synonyms'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-card/80 text-muted-foreground hover:bg-card border border-border'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Sinonim qidirish</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="w-full max-w-2xl relative group"
        >
          <div className={`absolute -inset-1 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${
            searchMode === 'synonyms' 
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500'
              : 'bg-gradient-to-r from-primary via-secondary to-primary'
          }`}></div>
          <div className="relative flex items-center bg-card rounded-lg shadow-xl border border-border/50">
            <Search className="absolute left-4 h-6 w-6 text-muted-foreground" />
            <Input 
              type="text"
              placeholder={searchMode === 'synonyms' ? "Arabcha so'z kiriting (sinonimlarni topish uchun)..." : "So'z izlash (arabcha yoki o'zbekcha)..."}
              className="w-full h-16 pl-14 pr-4 text-lg bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchMode === 'synonyms' && (
            <p className="text-xs text-emerald-600 mt-2">
              Arabic WordNet bazasidan 9,361 sinonim guruhidan qidiring
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
