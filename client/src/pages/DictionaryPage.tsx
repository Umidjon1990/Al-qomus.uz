import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { ResultCard } from "@/components/ResultCard";
import { SynonymResultCard } from "@/components/SynonymResultCard";
import { AnalysisResultCard } from "@/components/AnalysisResultCard";
import { getDictionaryEntries, getDictionarySources, DICTIONARY_SOURCES, searchWordnetSynonyms, analyzeWord } from "@/lib/api";
import { SearchX, Loader2, Search, Book, Check, History, Heart, X, Trash2, ChevronDown, Plus, ZoomIn, ZoomOut, Users, FlaskConical } from "lucide-react";
import { getSearchHistory, addToHistory, removeFromHistory, clearHistory, getFavorites, FavoriteEntry, HistoryEntry } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchMode, setSearchMode] = useState<'dictionary' | 'synonyms' | 'analysis'>('dictionary');
  const [selectedSources, setSelectedSources] = useState<string[]>(["Ghoniy"]);
  const [popoverOpen, setPopoverOpen] = useState(false);
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
      if (searchTerm.trim() && searchMode === 'dictionary') {
        addToHistory(searchTerm.trim());
        setHistory(getSearchHistory());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchMode]);

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
    enabled: debouncedSearch.length > 0 && selectedSources.length > 0 && searchMode === 'dictionary',
  });

  const { data: synonymResults = [], isLoading: isSynonymLoading } = useQuery({
    queryKey: ['synonyms', debouncedSearch],
    queryFn: () => searchWordnetSynonyms(debouncedSearch),
    enabled: debouncedSearch.length > 0 && searchMode === 'synonyms',
  });

  const { data: analysisResults = [], isLoading: isAnalysisLoading } = useQuery({
    queryKey: ['analysis', debouncedSearch],
    queryFn: () => analyzeWord(debouncedSearch),
    enabled: debouncedSearch.length > 0 && searchMode === 'analysis',
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
      <Hero 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        searchMode={searchMode}
        setSearchMode={setSearchMode}
      />
      
      <div className="container mx-auto px-4 py-12 -mt-10 relative z-30">
        {/* Dictionary sources - only show in dictionary mode */}
        {searchMode === 'dictionary' && (
          <div className="flex flex-wrap gap-3 mb-6 justify-center items-center">
            {/* Primary dictionary - G'oniy */}
            <button
              data-testid="btn-source-Ghoniy"
              onClick={() => {
                setSelectedSources(prev => 
                  prev.includes('Ghoniy') && prev.length > 1
                    ? prev.filter(s => s !== 'Ghoniy')
                    : prev.includes('Ghoniy') ? prev : [...prev, 'Ghoniy']
                );
              }}
              className={`flex flex-col items-center px-6 py-3 rounded-xl border-2 transition-all min-w-[160px] ${
                selectedSources.includes('Ghoniy')
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                  : 'bg-card text-foreground border-border hover:border-primary/50 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Book className="h-4 w-4" />
                <span className="font-semibold">G'oniy (الغني)</span>
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
        )}

        {searchMode === 'dictionary' && selectedSources.length === 0 && (
          <div className="text-center py-6 text-amber-600 bg-amber-50 rounded-lg mb-6">
            Kamida bitta lug'atni tanlang
          </div>
        )}
        
        {debouncedSearch && searchMode === 'dictionary' && selectedSources.length > 0 && (
          <div className="mb-6 text-muted-foreground text-center" data-testid="search-result-count">
            <Book className="inline h-4 w-4 mr-2" />
            "{debouncedSearch}" bo'yicha {entries.length} ta natija topildi
          </div>
        )}
        
        {debouncedSearch && searchMode === 'synonyms' && (
          <div className="mb-6 text-center bg-emerald-50 border border-emerald-200 rounded-lg py-3 px-4" data-testid="synonym-result-count">
            <Users className="inline h-4 w-4 mr-2 text-emerald-600" />
            <span className="text-emerald-700">
              "{debouncedSearch}" uchun {synonymResults.length} ta sinonim guruhi topildi
            </span>
          </div>
        )}
        
        {debouncedSearch && searchMode === 'analysis' && (
          <div className="mb-6 text-center bg-violet-50 border border-violet-200 rounded-lg py-3 px-4" data-testid="analysis-result-count">
            <FlaskConical className="inline h-4 w-4 mr-2 text-violet-600" />
            <span className="text-violet-700">
              "{debouncedSearch}" uchun {analysisResults.length} ta tahlil natijasi
            </span>
          </div>
        )}
        
        {!debouncedSearch ? (
          <div className="max-w-2xl mx-auto">
            {searchMode === 'dictionary' && (
              <div className="text-center py-10 bg-card rounded-xl border border-dashed mb-6">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Book className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Lug'atdan qidiring</h3>
                <p className="text-muted-foreground">Arabcha yoki o'zbekcha so'z yozing</p>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  {sourcesData?.reduce((sum, s) => sum + s.count, 0)?.toLocaleString() || '32,292'} ta so'z bazasidan qidiring
                </p>
              </div>
            )}
            {searchMode === 'synonyms' && (
              <div className="text-center py-10 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 mb-6">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-medium text-emerald-900">Sinonim qidiring</h3>
                <p className="text-emerald-700">Arabcha so'z kiriting, sinonimlarini toping</p>
                <p className="text-sm text-emerald-600/70 mt-2">
                  Arabic WordNet bazasidan 9,361 sinonim guruhidan qidiring
                </p>
              </div>
            )}
            {searchMode === 'analysis' && (
              <div className="text-center py-10 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 mb-6">
                <div className="bg-violet-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FlaskConical className="h-8 w-8 text-violet-600" />
                </div>
                <h3 className="text-lg font-medium text-violet-900">So'z tahlili</h3>
                <p className="text-violet-700">Arabcha so'z kiriting, morfologik tahlilini ko'ring</p>
                <p className="text-sm text-violet-600/70 mt-2">
                  Ildiz, qo'shimchalar va grammatik tuzilishni aniqlang
                </p>
              </div>
            )}

            {/* Tabs for History and Favorites - only in dictionary mode */}
            {searchMode === 'dictionary' && (
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
            )}

            {/* History Tab - only in dictionary mode */}
            {searchMode === 'dictionary' && activeTab === 'history' && (
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

            {/* Favorites Tab - only in dictionary mode */}
            {searchMode === 'dictionary' && activeTab === 'favorites' && (
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
        ) : (isLoading || isSynonymLoading || isAnalysisLoading) ? (
          <div className="text-center py-20">
            <Loader2 className={`h-8 w-8 animate-spin mx-auto ${
              searchMode === 'analysis' ? 'text-violet-600' : 
              searchMode === 'synonyms' ? 'text-emerald-600' : 'text-primary'
            }`} />
            <p className="text-muted-foreground mt-4">Yuklanmoqda...</p>
          </div>
        ) : searchMode === 'analysis' ? (
          <div className="max-w-4xl mx-auto">
            {analysisResults.length > 0 ? (
              <AnalysisResultCard analyses={analysisResults} word={debouncedSearch} />
            ) : (
              <div className="text-center py-20 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                <div className="bg-violet-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FlaskConical className="h-8 w-8 text-violet-600" />
                </div>
                <h3 className="text-lg font-medium text-violet-900">Tahlil natijasi topilmadi</h3>
                <p className="text-violet-700">Boshqa so'z bilan sinab ko'ring.</p>
              </div>
            )}
          </div>
        ) : searchMode === 'synonyms' ? (
          <div className="max-w-4xl mx-auto">
            {synonymResults.length > 0 && (
              <div className="flex justify-end items-center gap-2 mb-4 bg-emerald-50 rounded-lg border border-emerald-200 p-2">
                <span className="text-sm text-emerald-700 mr-2">Shrift o'lchami:</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 70}
                  className="h-8 w-8 border-emerald-300 hover:bg-emerald-100"
                  data-testid="btn-zoom-out"
                >
                  <ZoomOut className="h-4 w-4 text-emerald-600" />
                </Button>
                <button
                  onClick={resetZoom}
                  className="text-sm font-medium min-w-[50px] text-center text-emerald-700 hover:text-emerald-900 transition-colors"
                  data-testid="btn-zoom-reset"
                >
                  {zoomLevel}%
                </button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 150}
                  className="h-8 w-8 border-emerald-300 hover:bg-emerald-100"
                  data-testid="btn-zoom-in"
                >
                  <ZoomIn className="h-4 w-4 text-emerald-600" />
                </Button>
              </div>
            )}
            <div className="grid gap-6">
              {synonymResults.length > 0 ? (
                synonymResults.map((result: any) => (
                  <SynonymResultCard key={result.synset.synsetId} result={result} zoomLevel={zoomLevel} />
                ))
              ) : (
                <div className="text-center py-20 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-medium text-emerald-900">Sinonim topilmadi</h3>
                  <p className="text-emerald-700">Boshqa so'z bilan qidiring.</p>
                </div>
              )}
            </div>
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
