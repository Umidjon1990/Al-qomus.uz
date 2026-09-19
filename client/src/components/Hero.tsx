import React from "react";
import { Search, X } from "lucide-react";

interface HeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  totalWords?: number;
}

export function Hero({ searchTerm, setSearchTerm, totalWords }: HeroProps) {
  return (
    <section className="sticky top-14 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h1 className="text-sm font-semibold text-gray-700">Arabcha–o‘zbekcha lug‘at</h1>
          {!!totalWords && <span className="text-xs text-gray-500">{totalWords.toLocaleString()} yozuv</span>}
        </div>
        <div className="relative flex items-center rounded-xl border-2 border-orange-500 bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
          <Search className="absolute left-4 h-5 w-5 text-orange-600" aria-hidden="true" />
          <input aria-label="Arabcha yoki o‘zbekcha so‘z qidirish" dir="auto" type="search"
            placeholder="Arabcha yoki o‘zbekcha so‘z yozing…"
            className="w-full h-12 sm:h-14 px-12 text-lg text-gray-950 placeholder:text-gray-500 bg-white outline-none rounded-xl"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} data-testid="input-search" />
          {searchTerm && <button type="button" aria-label="Qidiruvni tozalash" onClick={() => setSearchTerm('')} className="absolute right-1 p-3 text-gray-500 hover:text-orange-600"><X className="h-5 w-5" /></button>}
        </div>
      </div>
    </section>
  );
}
