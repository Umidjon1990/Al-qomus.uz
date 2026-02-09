import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

interface HeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  totalWords?: number;
}

export function Hero({ searchTerm, setSearchTerm, totalWords }: HeroProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full flex items-center justify-center overflow-hidden" style={{ minHeight: '340px' }}>
      <div className="absolute inset-0 z-0 hero-gradient" />
      <div className="absolute inset-0 z-[1] islamic-pattern opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 right-0 h-24 z-[2] bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center max-w-2xl py-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 text-white leading-tight tracking-tight">
            Arabcha-O'zbekcha
            <br />
            <span className="hero-text-gradient">Lug'at</span>
          </h1>
          <p className="text-sm md:text-base text-white/60 mb-6 max-w-md mx-auto leading-relaxed">
            {totalWords ? `${totalWords.toLocaleString()}+ so'z bazasi` : "Professional tarjima va grammatik tahlil"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-xl relative"
        >
          <div className={`absolute -inset-[2px] rounded-2xl transition-all duration-500 ${
            isFocused ? 'search-border-active' : 'search-border-idle'
          }`} />
          <div className={`relative flex items-center bg-white rounded-2xl shadow-2xl transition-all duration-300 ${
            isFocused ? 'shadow-orange-500/25' : 'search-glow'
          }`}>
            <Search className={`absolute left-5 h-5 w-5 transition-colors duration-300 ${
              isFocused ? 'text-orange-500' : 'text-gray-400'
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-6 text-center"
        >
          <p className="text-white/80 text-lg md:text-2xl font-medium">
            {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
