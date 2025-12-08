import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { ResultCard } from "@/components/ResultCard";
import { SAMPLE_DATA } from "@/lib/mockData";
import { SearchX } from "lucide-react";

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = SAMPLE_DATA.filter((entry) => {
    const term = searchTerm.toLowerCase();
    return (
      entry.arabic.includes(term) ||
      entry.uzbek.toLowerCase().includes(term) ||
      entry.transliteration?.toLowerCase().includes(term)
    );
  });

  return (
    <Layout>
      <Hero searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      
      <div className="container mx-auto px-4 py-12 -mt-10 relative z-30">
        {searchTerm && (
          <div className="mb-6 text-muted-foreground">
            "{searchTerm}" bo'yicha {filteredData.length} ta natija topildi
          </div>
        )}
        
        <div className="grid gap-6 max-w-4xl mx-auto">
          {filteredData.length > 0 ? (
            filteredData.map((entry, index) => (
              <ResultCard key={entry.id} entry={entry} index={index} />
            ))
          ) : (
            <div className="text-center py-20 bg-card rounded-xl border border-dashed">
              <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchX className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Hech narsa topilmadi</h3>
              <p className="text-muted-foreground">So'z yozilishini tekshirib ko'ring yoki boshqa so'z izlang.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
