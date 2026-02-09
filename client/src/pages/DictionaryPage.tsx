import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { ResultCard } from "@/components/ResultCard";
import { getDictionaryEntries, getDictionarySources, DICTIONARY_SOURCES, searchExamples, ExampleResult } from "@/lib/api";
import { SearchX, Loader2, Search, Book, Check, History, Heart, X, Trash2, ChevronDown, ChevronUp, Plus, ZoomIn, ZoomOut, WifiOff, MessageSquareQuote, Volume2, Sparkles } from "lucide-react";
import { getSearchHistory, addToHistory, removeFromHistory, clearHistory, getFavorites, FavoriteEntry, HistoryEntry } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function WordOfTheDay() {
  const { data: wordData, isLoading } = useQuery({
    queryKey: ['word-of-day'],
    queryFn: async () => {
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const res = await fetch(`/api/dictionary/random?seed=${seed}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
  });

  if (isLoading || !wordData) return null;

  const meanings = wordData.meaningsJson ? JSON.parse(wordData.meaningsJson) : [];
  const firstMeaning = meanings[0]?.uzbekMeaning || meanings[0]?.uzbek_meaning || wordData.uzbek || '';

  return (
    <div className="max-w-md mx-auto mt-6 mb-2">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            <span className="font-medium uppercase tracking-wider">Kunning so'zi</span>
            <span className="ml-auto">{new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        <div className="px-5 pb-5 text-center">
          <h3 className="text-3xl font-arabic text-orange-500 font-bold mb-1" dir="rtl" data-testid="text-word-of-day">
            {wordData.arabic}
          </h3>
          {wordData.transliteration && (
            <p className="text-sm text-gray-400 mb-2">[{wordData.transliteration}]</p>
          )}
          <p className="text-base text-gray-700 font-medium">{firstMeaning}</p>
        </div>
      </div>
    </div>
  );
}

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(["Ghoniy"]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem('dictionary-zoom');
    return saved ? parseInt(saved) : 100;
  });

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 10, 150);
    setZoomLevel(newZoom);
    localStorage.setItem('dictionary-zoom', newZoom.toString());
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 10, 70);
    setZoomLevel(newZoom);
    localStorage.setItem('dictionary-zoom', newZoom.toString());
  };

  const resetZoom = () => {
    setZoomLevel(100);
    localStorage.setItem('dictionary-zoom', '100');
  };

  useEffect(() => {
    setHistory(getSearchHistory());
    setFavorites(getFavorites());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm.trim()) {
        addToHistory(searchTerm.trim());
        setHistory(getSearchHistory());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleHistoryClick = (term: string) => {
    setSearchTerm(term);
  };

  const handleRemoveHistory = (term: string) => {
    removeFromHistory(term);
    setHistory(getSearchHistory());
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const refreshFavorites = () => {
    setFavorites(getFavorites());
  };

  const { data: sourcesData } = useQuery({
    queryKey: ['dictionary-sources'],
    queryFn: getDictionarySources,
  });

  const totalWords = sourcesData?.reduce((sum, s) => sum + s.count, 0) || 0;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dictionary', debouncedSearch, selectedSources],
    queryFn: () => getDictionaryEntries(debouncedSearch || undefined, selectedSources),
    enabled: debouncedSearch.length > 0 && selectedSources.length > 0,
  });

  const { data: examplesData, isLoading: examplesLoading } = useQuery({
    queryKey: ['examples', debouncedSearch],
    queryFn: () => searchExamples(debouncedSearch, 20),
    enabled: debouncedSearch.length >= 2 && selectedSources.includes('Ghoniy'),
  });

  const highlightWord = (text: string, word: string) => {
    if (!word || !text) return text;
    const normalizedWord = word.replace(/[\u064B-\u0652\u0670\u0671]/g, '');
    const regex = new RegExp(`(${normalizedWord.split('').join('[\u064B-\u0652\u0670\u0671]*')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const normalizedPart = part.replace(/[\u064B-\u0652\u0670\u0671]/g, '');
      if (normalizedPart.toLowerCase() === normalizedWord.toLowerCase()) {
        return <span key={i} className="bg-orange-200/60 text-orange-800 px-1 rounded">{part}</span>;
      }
      return part;
    });
  };

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
      <Hero searchTerm={searchTerm} setSearchTerm={setSearchTerm} totalWords={totalWords} />
      
      <div className="container mx-auto px-4 py-6 -mt-6 relative z-30">
        <div className="flex flex-wrap gap-2 mb-6 justify-center items-center">
          <button
            data-testid="btn-source-Ghoniy"
            onClick={() => {
              if (!selectedSources.includes('Ghoniy')) {
                setSelectedSources(['Ghoniy']);
              }
            }}
            className={`group flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all duration-300 text-sm ${
              selectedSources.includes('Ghoniy')
                ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20'
                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:shadow-md'
            }`}
          >
            <Book className="h-3.5 w-3.5" />
            <span className="font-semibold">G'oniy (الغني)</span>
            {selectedSources.includes('Ghoniy') && <Check className="h-3.5 w-3.5" />}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              selectedSources.includes('Ghoniy')
                ? 'bg-white/15'
                : 'bg-gray-100'
            }`}>
              {getSourceCount('Ghoniy').toLocaleString()}
            </span>
          </button>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto py-2 px-3.5 rounded-full border border-dashed border-gray-300 hover:border-orange-300 text-sm"
                data-testid="btn-more-sources"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Boshqa lug'atlar</span>
                {selectedSources.filter(s => s !== 'Ghoniy').length > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                    +{selectedSources.filter(s => s !== 'Ghoniy').length}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 rounded-xl" align="center">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 mb-2">Qo'shimcha lug'atlar:</p>
                {DICTIONARY_SOURCES.filter(s => !s.isPrimary).map((source) => (
                  <button
                    key={source.id}
                    data-testid={`btn-source-${source.id}`}
                    onClick={() => toggleSource(source.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      selectedSources.includes(source.id)
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-gray-50 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{source.name}</span>
                      <span className="text-xs text-gray-400">{source.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full border">
                        {getSourceCount(source.id).toLocaleString()}
                      </span>
                      {selectedSources.includes(source.id) && (
                        <Check className="h-3.5 w-3.5 text-orange-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {selectedSources.filter(s => s !== 'Ghoniy').map(sourceId => {
            const source = DICTIONARY_SOURCES.find(s => s.id === sourceId);
            if (!source) return null;
            return (
              <div
                key={sourceId}
                className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-sm border border-orange-200"
              >
                <span>{source.name}</span>
                <button
                  onClick={() => toggleSource(sourceId)}
                  className="hover:text-red-500 transition-colors"
                  data-testid={`btn-remove-${sourceId}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {selectedSources.length === 0 && (
          <div className="text-center py-5 text-orange-600 bg-orange-50 rounded-xl mb-6 border border-orange-200 text-sm">
            Kamida bitta lug'atni tanlang
          </div>
        )}
        
        {debouncedSearch && selectedSources.length > 0 && (
          <div className="mb-6 text-gray-400 text-center text-sm" data-testid="search-result-count">
            <span className="font-medium text-gray-700">"{debouncedSearch}"</span> bo'yicha {entries.length} ta natija topildi
          </div>
        )}
        
        {!debouncedSearch ? (
          <div className="max-w-2xl mx-auto">
            <WordOfTheDay />

            <div className="flex gap-2 mb-4 justify-center mt-6">
              <Button
                variant={activeTab === 'history' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setActiveTab('history'); refreshFavorites(); }}
                className={`rounded-full ${activeTab === 'history' ? 'bg-gray-900 hover:bg-gray-800' : ''}`}
                data-testid="tab-history"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                Qidirilganlar ({history.length})
              </Button>
              <Button
                variant={activeTab === 'favorites' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setActiveTab('favorites'); refreshFavorites(); }}
                className={`rounded-full ${activeTab === 'favorites' ? 'bg-gray-900 hover:bg-gray-800' : ''}`}
                data-testid="tab-favorites"
              >
                <Heart className="h-3.5 w-3.5 mr-1.5" />
                Yoqtirilganlar ({favorites.length})
              </Button>
            </div>

            {activeTab === 'history' && (
              <div className="glass-card rounded-2xl p-5">
                {history.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Qidiruv tarixi</h4>
                      <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-xs text-gray-400 hover:text-red-500 h-7">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Tozalash
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {history.map((item) => (
                        <div key={item.term} className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-full group hover:border-orange-300 transition-colors">
                          <button
                            onClick={() => handleHistoryClick(item.term)}
                            className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
                            data-testid={`history-item-${item.term}`}
                          >
                            {item.term}
                          </button>
                          <button
                            onClick={() => handleRemoveHistory(item.term)}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-400 text-sm py-6">Qidiruv tarixi bo'sh</p>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="glass-card rounded-2xl p-5">
                {favorites.length > 0 ? (
                  <div className="space-y-2">
                    {favorites.map((fav) => (
                      <button
                        key={fav.id}
                        onClick={() => setSearchTerm(fav.arabic)}
                        className="w-full flex items-center justify-between p-3 bg-white rounded-xl hover:bg-orange-50 transition-colors text-left border border-transparent hover:border-orange-200"
                        data-testid={`favorite-item-${fav.id}`}
                      >
                        <div>
                          <span className="font-arabic text-xl text-gray-800" dir="rtl">{fav.arabic}</span>
                          {fav.uzbek && <span className="text-sm text-gray-400 ml-3">{fav.uzbek}</span>}
                        </div>
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-sm py-6">
                    Yoqtirilgan so'zlar yo'q. So'z yonidagi yurakchani bosing.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 bg-white rounded-2xl shadow-lg px-6 py-4 border border-gray-100">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              <p className="text-gray-500 font-medium text-sm">Qidirilmoqda...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {entries.length > 0 && (
              <div className="flex justify-end items-center gap-2 mb-4 bg-white/80 backdrop-blur rounded-xl border border-gray-100 p-2">
                <span className="text-xs text-gray-400 mr-2">Shrift:</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 70}
                  className="h-7 w-7 rounded-lg"
                  data-testid="btn-zoom-out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <button
                  onClick={resetZoom}
                  className="text-xs font-medium min-w-[40px] text-center hover:text-orange-500 transition-colors"
                  data-testid="btn-zoom-reset"
                >
                  {zoomLevel}%
                </button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 150}
                  className="h-7 w-7 rounded-lg"
                  data-testid="btn-zoom-in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div 
              className="grid gap-5 origin-top" 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              {examplesData && examplesData.examples.length > 0 && (
                <div className="mb-4 animate-fade-in-up" data-testid="examples-section">
                  <Button
                    onClick={() => setShowExamples(!showExamples)}
                    variant="outline"
                    className="w-full py-5 rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-orange-50/80 to-amber-50/80 hover:border-orange-300 transition-all backdrop-blur"
                    data-testid="btn-toggle-examples"
                  >
                    <MessageSquareQuote className="h-5 w-5 text-orange-500 mr-3" />
                    <span className="font-bold text-gray-800 text-lg">Misollar</span>
                    <span className="ml-2 bg-orange-500 text-white text-xs px-2.5 py-1 rounded-full">
                      {examplesData.count} ta gap
                    </span>
                    {showExamples ? (
                      <ChevronUp className="h-5 w-5 ml-auto text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 ml-auto text-gray-400" />
                    )}
                  </Button>
                  
                  {showExamples && (
                    <div className="mt-3 bg-white rounded-2xl border border-orange-200 p-5">
                      <p className="text-sm text-gray-400 mb-4">
                        "<span className="font-medium text-gray-700">{debouncedSearch}</span>" so'zi ishtirok etgan gaplar:
                      </p>
                      <div className="space-y-2.5">
                        {examplesData.examples.map((example, idx) => (
                          <div 
                            key={`${example.entryId}-${idx}`} 
                            className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all"
                            data-testid={`example-item-${idx}`}
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <div className="font-arabic text-base text-right leading-relaxed mb-2" dir="rtl">
                              {highlightWord(example.arabicExample, debouncedSearch)}
                            </div>
                            <div className="text-sm text-gray-500 border-t border-dashed border-gray-200 pt-2 mt-2">
                              {example.uzbekExample || example.uzbekMeaning}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              <span className="font-arabic">{example.arabic}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {entries.length > 0 ? (
                entries.map((entry, index) => (
                  <ResultCard key={entry.id} entry={entry} index={index} />
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                  <div className="bg-gray-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <SearchX className="h-7 w-7 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-700">Hech narsa topilmadi</h3>
                  <p className="text-gray-400 mt-1 text-sm">So'z yozilishini tekshirib ko'ring yoki boshqa so'z izlang.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
