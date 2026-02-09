import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles } from "lucide-react";

interface HeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  totalWords?: number;
}

const POPULAR_SEARCHES = [
  "كتب", "علم", "صلاة", "قرأ", "جمل", "حسن", "عمل", "نور"
];

export function Hero({ searchTerm, setSearchTerm, totalWords }: HeroProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    const p = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 3,
    }));
    setParticles(p);
  }, []);

  return (
    <div className="relative w-full flex items-center justify-center overflow-hidden" style={{ minHeight: '380px' }}>
      <div className="absolute inset-0 z-0 bg-black" />

      <div className="absolute inset-0 z-[1]">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-orange-500/30"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-[2]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-[100px] animate-pulse" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-orange-600/3 blur-[80px]" style={{ animation: 'float 8s ease-in-out infinite' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-amber-500/3 blur-[60px]" style={{ animation: 'float 6s ease-in-out infinite reverse' }} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 z-[3] bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center max-w-2xl py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <motion.h1
            className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 leading-tight tracking-tight"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-white">Arabcha-O'zbekcha</span>
            <br />
            <span className="search-title-gradient">Lug'at</span>
          </motion.h1>
          <motion.p
            className="text-sm md:text-base text-gray-500 mb-8 max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {totalWords ? `${totalWords.toLocaleString()}+ so'z bazasi` : "Professional tarjima va grammatik tahlil"}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-xl relative group"
        >
          <div className="absolute -inset-[2px] rounded-2xl search-border-glow z-0" />

          <AnimatePresence>
            {isFocused && (
              <motion.div
                className="absolute -inset-3 rounded-3xl z-0"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 blur-xl animate-pulse" />
                <div className="absolute inset-0 rounded-3xl search-ring-spin" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`relative flex items-center rounded-2xl transition-all duration-500 ${
            isFocused 
              ? 'bg-gray-950 shadow-2xl shadow-orange-500/10' 
              : 'bg-gray-950/80 shadow-xl shadow-black/50'
          }`}>
            <div className="absolute left-5 flex items-center justify-center">
              <motion.div
                animate={isFocused ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Search className={`h-5 w-5 transition-colors duration-500 ${
                  isFocused ? 'text-orange-400' : 'text-gray-600'
                }`} />
              </motion.div>
              {isFocused && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.8, 0], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="w-5 h-5 rounded-full border border-orange-400/50" />
                </motion.div>
              )}
            </div>

            <input
              type="text"
              placeholder="So'z izlash (arabcha yoki o'zbekcha)..."
              className="w-full h-14 md:h-16 pl-14 pr-5 text-base md:text-lg bg-transparent border-none outline-none text-white placeholder:text-gray-600 rounded-2xl caret-orange-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              data-testid="input-search"
            />

            {searchTerm && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-4"
              >
                <Sparkles className="h-4 w-4 text-orange-400 animate-pulse" />
              </motion.div>
            )}
          </div>

          <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 h-[1px] search-bottom-line" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-6 flex flex-col items-center gap-2.5"
        >
          <span className="text-gray-600 text-xs tracking-wider uppercase">Mashhur qidiruvlar</span>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_SEARCHES.map((term, i) => (
              <motion.button
                key={term}
                onClick={() => setSearchTerm(term)}
                className="px-4 py-1.5 rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-orange-400 text-sm font-arabic border border-gray-800 hover:border-orange-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5"
                data-testid={`popular-search-${term}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {term}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
