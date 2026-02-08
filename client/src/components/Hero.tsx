import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";

interface HeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export function Hero({ searchTerm, setSearchTerm }: HeroProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full min-h-[420px] md:min-h-[460px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0 hero-gradient" />
      <div className="absolute inset-0 z-[1] islamic-pattern opacity-[0.04]" />
      <div className="absolute bottom-0 left-0 right-0 h-32 z-[2] bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center max-w-3xl py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-6 border border-white/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>108,000+ so'z bazasi</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-white font-serif leading-tight tracking-tight">
            Arabcha-O'zbekcha
            <br />
            <span className="hero-text-gradient">Lug'at</span>
          </h1>
          <p className="text-base md:text-lg text-white/70 mb-8 max-w-lg mx-auto leading-relaxed">
            Minglab so'zlarning aniq tarjimasi, grammatik tahlili va jonli misollar bilan boyitilgan professional lug'at
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-xl relative"
        >
          <div className={`absolute -inset-1 rounded-2xl transition-all duration-500 ${
            isFocused 
              ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 opacity-60 blur-md scale-[1.02]' 
              : 'bg-gradient-to-r from-emerald-400/30 via-teal-300/20 to-emerald-400/30 opacity-40 blur-sm'
          }`} />
          <div className={`relative flex items-center bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl transition-all duration-300 ${
            isFocused ? 'shadow-emerald-500/20' : ''
          }`}>
            <Search className={`absolute left-5 h-5 w-5 transition-colors duration-300 ${
              isFocused ? 'text-emerald-600' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="So'z izlash (arabcha yoki o'zbekcha)..."
              className="w-full h-14 md:h-16 pl-14 pr-5 text-base md:text-lg bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-400 rounded-2xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              data-testid="input-search"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
