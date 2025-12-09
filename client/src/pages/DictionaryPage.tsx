import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { ResultCard } from "@/components/ResultCard";
import { getDictionaryEntries } from "@/lib/api";
import { SearchX, Loader2, Search } from "lucide-react";

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dictionary', debouncedSearch],
    queryFn: () => getDictionaryEntries(debouncedSearch || undefined),
    enabled: debouncedSearch.length > 0,
  });

  return (
    <Layout>
      <Hero searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      
      <div className="container mx-auto px-4 py-12 -mt-10 relative z-30">
        {debouncedSearch && (
          <div className="mb-6 text-muted-foreground">
            "{debouncedSearch}" bo'yicha {entries.length} ta natija topildi
          </div>
        )}
        
        {!debouncedSearch ? (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed max-w-2xl mx-auto">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground">So'z izlang</h3>
            <p className="text-muted-foreground">Arabcha yoki o'zbekcha so'z yozing</p>
            <p className="text-sm text-muted-foreground/70 mt-2">32,292 ta so'z bazasidan qidiring</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">Yuklanmoqda...</p>
          </div>
        ) : (
          <div className="grid gap-6 max-w-4xl mx-auto">
            {entries.length > 0 ? (
              entries.map((entry, index) => (
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
        )}
      </div>
    </Layout>
  );
}
