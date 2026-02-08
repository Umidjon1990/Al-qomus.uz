import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { ResultCard } from "@/components/ResultCard";
import { getDictionaryEntries, getDictionarySources, DICTIONARY_SOURCES, searchExamples, ExampleResult, conjugateVerb, ConjugationData } from "@/lib/api";
import { SearchX, Loader2, Search, Book, Check, History, Heart, X, Trash2, ChevronDown, ChevronUp, Plus, ZoomIn, ZoomOut, WifiOff, MessageSquareQuote, BookOpen } from "lucide-react";
import { getSearchHistory, addToHistory, removeFromHistory, clearHistory, getFavorites, FavoriteEntry, HistoryEntry } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(["Ghoniy"]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');
  const [showTasrif, setShowTasrif] = useState(false);
  const [tasrifVerb, setTasrifVerb] = useState("");
  const [tasrifSearch, setTasrifSearch] = useState("");
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

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dictionary', debouncedSearch, selectedSources],
    queryFn: () => getDictionaryEntries(debouncedSearch || undefined, selectedSources),
    enabled: debouncedSearch.length > 0 && selectedSources.length > 0,
  });

  const { data: tasrifData, isLoading: tasrifLoading, error: tasrifError } = useQuery({
    queryKey: ['tasrif', tasrifSearch],
    queryFn: () => conjugateVerb(tasrifSearch),
    enabled: tasrifSearch.length > 0,
  });

  const handleTasrif = () => {
    if (tasrifVerb.trim()) {
      setTasrifSearch(tasrifVerb.trim());
      setShowTasrif(true);
    }
  };

  // Misol qidirish - har qanday qidiruvda
  const { data: examplesData, isLoading: examplesLoading } = useQuery({
    queryKey: ['examples', debouncedSearch],
    queryFn: () => searchExamples(debouncedSearch, 20),
    enabled: debouncedSearch.length >= 2 && selectedSources.includes('Ghoniy'),
  });

  // So'zni gap ichida rangli ko'rsatish
  const highlightWord = (text: string, word: string) => {
    if (!word || !text) return text;
    const normalizedWord = word.replace(/[\u064B-\u0652\u0670\u0671]/g, '');
    const regex = new RegExp(`(${normalizedWord.split('').join('[\u064B-\u0652\u0670\u0671]*')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const normalizedPart = part.replace(/[\u064B-\u0652\u0670\u0671]/g, '');
      if (normalizedPart.toLowerCase() === normalizedWord.toLowerCase()) {
        return <span key={i} className="bg-primary/30 text-primary px-1 rounded">{part}</span>;
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
      <Hero searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      
      <div className="container mx-auto px-4 py-12 -mt-10 relative z-30">
        <div className="flex flex-wrap gap-3 mb-6 justify-center items-center">
          {/* Primary dictionary - G'oniy */}
          <button
            data-testid="btn-source-Ghoniy"
            onClick={() => {
              if (!selectedSources.includes('Ghoniy')) {
                setSelectedSources(['Ghoniy']);
              }
            }}
            className={`flex flex-col items-center px-6 py-3 rounded-xl border-2 transition-all min-w-[180px] ${
              selectedSources.includes('Ghoniy')
                ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                : 'bg-card text-foreground border-border hover:border-primary/50 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Book className="h-4 w-4" />
              <span className="font-semibold text-lg">G'oniy (الغني)</span>
              {selectedSources.includes('Ghoniy') && (
                <Check className="h-4 w-4" />
              )}
            </div>
            <span className={`text-xs ${
              selectedSources.includes('Ghoniy')
                ? 'text-primary-foreground/80'
                : 'text-muted-foreground'
            }`}>
              Harakatli arabcha izohli lug'at
            </span>
            <span className={`text-xs mt-1 px-2 py-0.5 rounded-full ${
              selectedSources.includes('Ghoniy')
                ? 'bg-primary-foreground/20'
                : 'bg-muted'
            }`}>
              {getSourceCount('Ghoniy').toLocaleString()} so'z
            </span>
          </button>

          {/* Additional dictionaries popover */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto py-3 px-4 rounded-xl border-2 border-dashed"
                data-testid="btn-more-sources"
              >
                <Plus className="h-4 w-4" />
                <span>Boshqa lug'atlar</span>
                {selectedSources.filter(s => s !== 'Ghoniy').length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    +{selectedSources.filter(s => s !== 'Ghoniy').length}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="center">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Qo'shimcha lug'atlarni tanlang:</p>
                {DICTIONARY_SOURCES.filter(s => !s.isPrimary).map((source) => (
                  <button
                    key={source.id}
                    data-testid={`btn-source-${source.id}`}
                    onClick={() => toggleSource(source.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                      selectedSources.includes(source.id)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/50 border-transparent hover:bg-muted'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{source.name}</span>
                      <span className="text-xs text-muted-foreground">{source.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {getSourceCount(source.id).toLocaleString()}
                      </span>
                      {selectedSources.includes(source.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Show selected additional sources */}
          {selectedSources.filter(s => s !== 'Ghoniy').map(sourceId => {
            const source = DICTIONARY_SOURCES.find(s => s.id === sourceId);
            if (!source) return null;
            return (
              <div
                key={sourceId}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-sm"
              >
                <span>{source.name}</span>
                <button
                  onClick={() => toggleSource(sourceId)}
                  className="hover:text-destructive transition-colors"
                  data-testid={`btn-remove-${sourceId}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Tasrif (Fe'l tasrifi) - alohida bo'lim */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 rounded-xl border-2 border-violet-200 dark:border-violet-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" />
                <input
                  type="text"
                  value={tasrifVerb}
                  onChange={(e) => setTasrifVerb(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTasrif()}
                  placeholder="Arabcha fe'l yozing... (masalan: كَتَبَ)"
                  className="flex-1 bg-white dark:bg-background border border-violet-200 dark:border-violet-700 rounded-lg px-4 py-2.5 text-right font-arabic text-lg placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  dir="rtl"
                  data-testid="input-tasrif"
                />
              </div>
              <Button
                onClick={handleTasrif}
                disabled={!tasrifVerb.trim() || tasrifLoading}
                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-lg font-bold shrink-0"
                data-testid="btn-tasrif"
              >
                {tasrifLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Tasrif"
                )}
              </Button>
            </div>
            <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-2 text-center">
              Faqat fe'llar uchun - arabcha fe'lning barcha shakllarini ko'ring
            </p>
          </div>

          <AnimatePresence>
            {showTasrif && tasrifSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {tasrifLoading ? (
                  <div className="text-center py-8 mt-4 bg-card rounded-xl border">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-600" />
                    <p className="text-muted-foreground mt-3">Tasrif tayyorlanmoqda...</p>
                  </div>
                ) : tasrifError ? (
                  <div className="text-center py-6 mt-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
                    <p className="text-red-600 dark:text-red-400">Xatolik yuz berdi. Fe'lni tekshirib qaytadan urinib ko'ring.</p>
                  </div>
                ) : tasrifData ? (
                  <div className="mt-4 space-y-4 p-5 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 rounded-xl border-2 border-violet-200 dark:border-violet-800/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-violet-700 dark:text-violet-300 flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        <span className="font-arabic text-2xl" dir="rtl">{tasrifData.verb || tasrifSearch}</span>
                      </h3>
                      <button
                        onClick={() => { setShowTasrif(false); setTasrifSearch(""); setTasrifVerb(""); }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="btn-close-tasrif"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {tasrifData.verb_type && (
                      <div className="text-center">
                        <span className="px-4 py-1.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium">
                          {tasrifData.verb_type}
                        </span>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-violet-700 dark:text-violet-400 mb-2">O'tgan zamon (الماضي)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {tasrifData.past && Object.entries(tasrifData.past).map(([key, form]) => (
                          <div key={key} className="flex justify-between items-center bg-white/60 dark:bg-white/5 px-3 py-2 rounded-lg text-sm">
                            <span className="font-arabic text-lg" dir="rtl">{form.arabic}</span>
                            <span className="text-muted-foreground">{form.uzbek}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2">Hozirgi zamon (المضارع)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {tasrifData.present && Object.entries(tasrifData.present).map(([key, form]) => (
                          <div key={key} className="flex justify-between items-center bg-white/60 dark:bg-white/5 px-3 py-2 rounded-lg text-sm">
                            <span className="font-arabic text-lg" dir="rtl">{form.arabic}</span>
                            <span className="text-muted-foreground">{form.uzbek}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-2">Buyruq shakli (الأمر)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {tasrifData.imperative && Object.entries(tasrifData.imperative).map(([key, form]) => (
                          <div key={key} className="flex justify-between items-center bg-white/60 dark:bg-white/5 px-3 py-2 rounded-lg text-sm">
                            <span className="font-arabic text-lg" dir="rtl">{form.arabic}</span>
                            <span className="text-muted-foreground">{form.uzbek}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-2">Boshqa shakllar</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                        {tasrifData.masdar && (
                          <div className="bg-white/60 dark:bg-white/5 px-3 py-3 rounded-lg text-center">
                            <span className="text-xs text-muted-foreground block mb-1">Masdar</span>
                            <span className="font-arabic text-xl block" dir="rtl">{tasrifData.masdar.arabic}</span>
                            <span className="text-sm text-muted-foreground">{tasrifData.masdar.uzbek}</span>
                          </div>
                        )}
                        {tasrifData.active_participle && (
                          <div className="bg-white/60 dark:bg-white/5 px-3 py-3 rounded-lg text-center">
                            <span className="text-xs text-muted-foreground block mb-1">Ismu foil</span>
                            <span className="font-arabic text-xl block" dir="rtl">{tasrifData.active_participle.arabic}</span>
                            <span className="text-sm text-muted-foreground">{tasrifData.active_participle.uzbek}</span>
                          </div>
                        )}
                        {tasrifData.passive_participle && (
                          <div className="bg-white/60 dark:bg-white/5 px-3 py-3 rounded-lg text-center">
                            <span className="text-xs text-muted-foreground block mb-1">Ismu maf'ul</span>
                            <span className="font-arabic text-xl block" dir="rtl">{tasrifData.passive_participle.arabic}</span>
                            <span className="text-sm text-muted-foreground">{tasrifData.passive_participle.uzbek}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
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
          <div className="max-w-2xl mx-auto">
            <div className="text-center py-10 bg-card rounded-xl border border-dashed mb-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground">So'z izlang</h3>
              <p className="text-muted-foreground">Arabcha yoki o'zbekcha so'z yozing</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                {sourcesData?.reduce((sum, s) => sum + s.count, 0)?.toLocaleString() || '32,292'} ta so'z bazasidan qidiring
              </p>
            </div>


            {/* Tabs for History and Favorites */}
            <div className="flex gap-2 mb-4 justify-center">
              <Button
                variant={activeTab === 'history' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setActiveTab('history'); refreshFavorites(); }}
                data-testid="tab-history"
              >
                <History className="h-4 w-4 mr-2" />
                Qidirilganlar ({history.length})
              </Button>
              <Button
                variant={activeTab === 'favorites' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setActiveTab('favorites'); refreshFavorites(); }}
                data-testid="tab-favorites"
              >
                <Heart className="h-4 w-4 mr-2" />
                Yoqtirilganlar ({favorites.length})
              </Button>
            </div>

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="bg-card rounded-xl border p-4">
                {history.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Qidiruv tarixi</h4>
                      <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-xs text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Tozalash
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {history.map((item) => (
                        <div key={item.term} className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full group">
                          <button
                            onClick={() => handleHistoryClick(item.term)}
                            className="text-sm hover:text-primary transition-colors"
                            data-testid={`history-item-${item.term}`}
                          >
                            {item.term}
                          </button>
                          <button
                            onClick={() => handleRemoveHistory(item.term)}
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-4">Qidiruv tarixi bo'sh</p>
                )}
              </div>
            )}

            {/* Favorites Tab */}
            {activeTab === 'favorites' && (
              <div className="bg-card rounded-xl border p-4">
                {favorites.length > 0 ? (
                  <div className="space-y-2">
                    {favorites.map((fav) => (
                      <button
                        key={fav.id}
                        onClick={() => setSearchTerm(fav.arabic)}
                        className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
                        data-testid={`favorite-item-${fav.id}`}
                      >
                        <div>
                          <span className="font-arabic text-xl text-primary" dir="rtl">{fav.arabic}</span>
                          {fav.uzbek && <span className="text-sm text-muted-foreground ml-3">{fav.uzbek}</span>}
                        </div>
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Yoqtirilgan so'zlar yo'q. So'z yonidagi yurakchani bosing.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-4">Yuklanmoqda...</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {entries.length > 0 && (
              <div className="flex justify-end items-center gap-2 mb-4 bg-card rounded-lg border p-2">
                <span className="text-sm text-muted-foreground mr-2">Shrift o'lchami:</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 70}
                  className="h-8 w-8"
                  data-testid="btn-zoom-out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <button
                  onClick={resetZoom}
                  className="text-sm font-medium min-w-[50px] text-center hover:text-primary transition-colors"
                  data-testid="btn-zoom-reset"
                >
                  {zoomLevel}%
                </button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 150}
                  className="h-8 w-8"
                  data-testid="btn-zoom-in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div 
              className="grid gap-6 origin-top" 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              {/* Misollar tugmasi - har doim birinchi ko'rinadi */}
              {examplesData && examplesData.examples.length > 0 && (
                <div className="mb-6" data-testid="examples-section">
                  <Button
                    onClick={() => setShowExamples(!showExamples)}
                    variant="outline"
                    className="w-full py-6 border-2 border-primary/30 bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/20 dark:to-emerald-950/20 hover:border-primary/50 transition-all"
                    data-testid="btn-toggle-examples"
                  >
                    <MessageSquareQuote className="h-6 w-6 text-primary mr-3" />
                    <span className="font-bold text-foreground text-xl">Misollar</span>
                    <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      {examplesData.count} ta gap
                    </span>
                    {showExamples ? (
                      <ChevronUp className="h-5 w-5 ml-auto text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 ml-auto text-muted-foreground" />
                    )}
                  </Button>
                  
                  {showExamples && (
                    <div className="mt-4 bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-950/20 dark:to-emerald-950/20 rounded-xl border-2 border-primary/20 p-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        "{debouncedSearch}" so'zi ishtirok etgan gaplar:
                      </p>
                      <div className="space-y-3">
                        {examplesData.examples.map((example, idx) => (
                          <div 
                            key={`${example.entryId}-${idx}`} 
                            className="bg-background/80 backdrop-blur rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors"
                            data-testid={`example-item-${idx}`}
                          >
                            <div className="font-arabic text-base text-right leading-relaxed mb-2" dir="rtl">
                              {highlightWord(example.arabicExample, debouncedSearch)}
                            </div>
                            <div className="text-sm text-muted-foreground border-t border-dashed pt-2 mt-2">
                              {example.uzbekExample || example.uzbekMeaning}
                            </div>
                            <div className="text-xs text-muted-foreground/60 mt-1">
                              Manba: <span className="font-arabic">{example.arabic}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Natijalar */}
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
          </div>
        )}
      </div>
    </Layout>
  );
}
