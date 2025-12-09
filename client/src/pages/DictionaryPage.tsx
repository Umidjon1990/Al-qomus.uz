import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { ResultCard } from "@/components/ResultCard";
import { getDictionaryEntries, getDictionarySources, DICTIONARY_SOURCES } from "@/lib/api";
import { SearchX, Loader2, Search, Book, Check } from "lucide-react";

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(["Muasir"]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: sourcesData } = useQuery({
    queryKey: ['dictionary-sources'],
    queryFn: getDictionarySources,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dictionary', debouncedSearch, selectedSources],
    queryFn: () => getDictionaryEntries(debouncedSearch || undefined, selectedSources),
    enabled: debouncedSearch.length > 0 && selectedSources.length > 0,
  });

  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev => 
      prev.includes(sourceId)
        ? prev.filter(s => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const getSourceCount = (sourceId: string) => {
    const found = sourcesData?.find(s => s.source === sourceId);
    return found?.count || 0;
  };

  return (
    <Layout>
      <Hero searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      
      <div className="container mx-auto px-4 py-12 -mt-10 relative z-30">
        <div className="flex flex-wrap gap-4 mb-6 justify-center">
          {DICTIONARY_SOURCES.map((source) => (
            <button
              key={source.id}
              data-testid={`btn-source-${source.id}`}
              onClick={() => toggleSource(source.id)}
              className={`flex flex-col items-center px-6 py-3 rounded-xl border-2 transition-all min-w-[160px] ${
                selectedSources.includes(source.id)
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                  : 'bg-card text-foreground border-border hover:border-primary/50 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Book className="h-4 w-4" />
                <span className="font-semibold text-lg">{source.name}</span>
                {selectedSources.includes(source.id) && (
                  <Check className="h-4 w-4" />
                )}
              </div>
              <span className={`text-xs ${
                selectedSources.includes(source.id)
                  ? 'text-primary-foreground/80'
                  : 'text-muted-foreground'
              }`}>
                {source.description}
              </span>
              <span className={`text-xs mt-1 px-2 py-0.5 rounded-full ${
                selectedSources.includes(source.id)
                  ? 'bg-primary-foreground/20'
                  : 'bg-muted'
              }`}>
                {getSourceCount(source.id).toLocaleString()} so'z
              </span>
            </button>
          ))}
        </div>

        {selectedSources.length === 0 && (
          <div className="text-center py-6 text-amber-600 bg-amber-50 rounded-lg mb-6">
            Kamida bitta lug'atni tanlang
          </div>
        )}
        
        {debouncedSearch && selectedSources.length > 0 && (
          <div className="mb-6 text-muted-foreground text-center" data-testid="search-result-count">
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
            <p className="text-sm text-muted-foreground/70 mt-2">
              {sourcesData?.reduce((sum, s) => sum + s.count, 0)?.toLocaleString() || '32,292'} ta so'z bazasidan qidiring
            </p>
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
