import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import stockImage from '@assets/stock_images/islamic_geometric_pa_33a8e635.jpg';

interface HeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export function Hero({ searchTerm, setSearchTerm }: HeroProps) {
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center overflow-hidden">
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
          <span className="inline-block py-1 px-3 rounded-full bg-secondary/10 text-secondary-foreground text-sm font-medium mb-6 border border-secondary/20">
            BETA • Test rejimida
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground font-serif leading-tight">
            Arab tili olamiga <br/>
            <span className="text-primary italic">professional</span> yo'llanma
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Minglab so'zlarning aniq tarjimasi, grammatik tahlili va jonli misollar bilan boyitilgan eng mukammal onlayn lug'at.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-2xl relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-card rounded-lg shadow-xl border border-border/50">
            <Search className="absolute left-4 h-6 w-6 text-muted-foreground" />
            <Input 
              type="text"
              placeholder="So'z izlash (arabcha yoki o'zbekcha)..."
              className="w-full h-16 pl-14 pr-4 text-lg bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
