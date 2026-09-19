import { Link } from 'wouter';
import type { ExpandedVerb } from '@shared/sarf-expanded';
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { ResultCard } from "@/components/ResultCard";
import { getDictionaryEntries, getDictionarySources, DICTIONARY_SOURCES, searchExamples } from "@/lib/api";
import { SearchX, Loader2, History, Heart, X, Trash2, ChevronDown, ChevronUp, ZoomIn, ZoomOut, MessageSquareQuote } from "lucide-react";
import { getSearchHistory, addToHistory, removeFromHistory, clearHistory, getFavorites, FavoriteEntry, HistoryEntry } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";


export default function DictionaryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(DICTIONARY_SOURCES.map(source => source.id));
  const [showExamples, setShowExamples] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem('dictionary-zoom');
    const parsed = Number(saved);
    return saved && Number.isFinite(parsed) ? Math.min(150, Math.max(70, parsed)) : 100;
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

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ['dictionary', debouncedSearch, selectedSources],
    queryFn: () => getDictionaryEntries(debouncedSearch || undefined, selectedSources),
    enabled: debouncedSearch.length > 0 && selectedSources.length > 0,
  });

  const {data: formData, isError: formsError, isFetching: formsLoading} = useQuery({
    queryKey:['dictionary-verb-forms',debouncedSearch],
    queryFn:async()=>{const r=await fetch('/api/dictionary/verb-forms?q='+encodeURIComponent(debouncedSearch));if(!r.ok)throw new Error('Fe’l tahlili yuklanmadi');return r.json() as Promise<{verbs:(ExpandedVerb&{matchedForms:string[]})[];truncated:boolean}>;},
    enabled: /[ء-ي]/.test(debouncedSearch) && debouncedSearch.length<=80 && selectedSources.length>0,
  });
  const formVariants=(formData?.verbs||[]).filter(v=>v.meanings.some(m=>selectedSources.includes(m.source))||(!v.entryIds.length&&selectedSources.length===DICTIONARY_SOURCES.length));

  const { data: examplesData } = useQuery({
    queryKey: ['examples', debouncedSearch],
    queryFn: () => searchExamples(debouncedSearch, 20),
    enabled: debouncedSearch.length >= 2 && selectedSources.includes('Ghoniy'),
  });

  const highlightWord = (text: string, word: string) => {
    if (!word || !text) return text;
    const normalizedWord = word.replace(/[\u064B-\u0652\u0670\u0671]/g, '');
    const escapedLetters = Array.from(normalizedWord, letter => letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedLetters.join('[\\u064B-\\u0652\\u0670]*')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const normalizedPart = part.replace(/[\u064B-\u0652\u0670\u0671]/g, '');
      if (normalizedPart.toLowerCase() === normalizedWord.toLowerCase()) {
        return <span key={i} className="bg-teal-200/60 text-teal-800 px-1 rounded">{part}</span>;
      }
      return part;
    });
  };

  const groups = new Map<string, typeof entries>();
  // Keep Ghoniy first, including cached/offline results; preserve relevance within each source.
  const sourcePriority=(source:string)=>source==='Ghoniy'?0:source==='Muasir'?1:source==='Roid'?2:3;
  const orderedEntries=entries.slice().sort((a,b)=>sourcePriority(a.dictionarySource)-sourcePriority(b.dictionarySource));
  for (const entry of orderedEntries) {
    // Group only identical vocalization; preserve every source and sense by ID.
    const key = (entry.arabicVocalized || entry.arabic).normalize('NFC').trim();
    groups.set(key, [...(groups.get(key) || []), entry]);
  }

  return (
    <Layout>
      <Hero searchTerm={searchTerm} setSearchTerm={setSearchTerm} totalWords={totalWords} />

      <div className="container mx-auto px-4 py-5">
        <div className="max-w-4xl mx-auto mb-5 flex flex-wrap items-center gap-3">
          <label htmlFor="dictionary-source" className="text-sm text-gray-600">Manba:</label>
          <select id="dictionary-source" className="border border-gray-200 rounded-lg bg-white px-3 py-2 text-sm"
            value={selectedSources.length > 1 ? 'all' : selectedSources[0] || 'all'}
            onChange={e => setSelectedSources(e.target.value === 'all' ? DICTIONARY_SOURCES.map(s => s.id) : [e.target.value])}>
            <option value="all">Barcha lug‘atlar</option>
            {DICTIONARY_SOURCES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="ml-auto text-sm text-gray-600 hover:text-teal-600 py-2" onClick={() => { setSearchTerm(''); setActiveTab('favorites'); refreshFavorites(); }}>♡ Saqlanganlar ({favorites.length})</button>
        </div>

        {selectedSources.length === 0 && (
          <div className="text-center py-5 text-teal-600 bg-teal-50 rounded-xl mb-6 border border-teal-200 text-sm">
            Kamida bitta lug'atni tanlang
          </div>
        )}

        {debouncedSearch && selectedSources.length > 0 && (
          <div className="mb-6 text-gray-400 text-center text-sm" data-testid="search-result-count">
            <span className="font-medium text-gray-700">"{debouncedSearch}"</span> bo'yicha {entries.length >= 50 ? 'Dastlabki 50' : entries.length} ta lug‘at yozuvi{formVariants.length>0?` · ${formVariants.length} ta fe’l varianti`:''}
          </div>
        )}

        {!debouncedSearch ? (
          <div className="max-w-2xl mx-auto">


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
                        <div key={item.term} className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-full group hover:border-teal-300 transition-colors">
                          <button
                            onClick={() => handleHistoryClick(item.term)}
                            className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
                            data-testid={`history-item-${item.term}`}
                          >
                            {item.term}
                          </button>
                          <button
                            onClick={() => handleRemoveHistory(item.term)}
                            className="text-gray-300 hover:text-red-500 transition-all"
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
                        className="w-full flex items-center justify-between p-3 bg-white rounded-xl hover:bg-teal-50 transition-colors text-left border border-transparent hover:border-teal-200"
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
        ) : isError ? (
          <div role="alert" className="max-w-4xl mx-auto p-6 rounded-xl border border-teal-200 bg-teal-50">Lug‘atni yuklab bo‘lmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.</div>
        ) : isLoading || formsLoading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 bg-white rounded-2xl shadow-lg px-6 py-4 border border-gray-100">
              <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
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
                  className="text-xs font-medium min-w-[40px] text-center hover:text-teal-500 transition-colors"
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
              className="grid gap-4 dictionary-results"
              style={{ '--dictionary-scale': zoomLevel / 100 } as React.CSSProperties}
            >
              {formVariants.length>0 && <section className="mb-5 space-y-3" aria-label="Fe’lning asl shakllari">
                <h2 className="text-base font-semibold">Fe’lning asl shakllari</h2>
                <p className="text-sm text-gray-600">Bir yozilish bir nechta fe’lga mos kelishi mumkin. Ma’nosiga qarab tanlang.</p>
                {formVariants.map(v=><article key={v.id} className="rounded-xl border border-teal-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-xs text-gray-500">Qidirilgan shakl</p><p dir="rtl" className="text-2xl leading-relaxed">{v.matchedForms.join(' / ')||debouncedSearch}</p></div>
                    <div><p className="text-xs text-gray-500">Lug‘atdagi shakli · moziy — muzori’</p><p dir="rtl" className="text-2xl leading-relaxed">{v.past} — {v.present}</p></div>
                  </div>
                  <p className="mt-2 text-sm">{v.meanings.find(m=>selectedSources.includes(m.source))?.text||v.meaning||'Tarjima hali bog‘lanmagan'}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-gray-500">{v.kind} · {v.transitive?'O‘timli':'O‘timsiz'} · Ildiz: <span dir="rtl">{v.root}</span></span><Link href={'/sarf/'+v.id} className="inline-flex min-h-11 items-center rounded-lg bg-teal-600 px-4 text-white">Tuslanishini ko‘rish</Link></div>
                </article>)}
                {formData?.truncated&&<p className="text-sm text-gray-600">Variantlar ko‘p. Qidiruvni harakatlar bilan aniqlashtiring.</p>}
              </section>}
              {formsError&&<p className="mb-4 text-sm text-gray-600">Fe’l tahlili vaqtincha yuklanmadi. Qidiruvni qayta urinib ko‘ring.</p>}
              {entries.length > 0 ? (
                Array.from(groups.entries()).map(([word, records]) => (
                  <section key={word} aria-label={`${word} lug‘at yozuvlari`} className="space-y-2">
                    <ResultCard entry={records[0]} />
                    {records.length > 1 && <details className="rounded-xl border border-gray-200 bg-gray-50 px-3">
                      <summary className="cursor-pointer py-3 text-sm text-gray-700">Shu yozilishdagi boshqa ma’no va manbalar ({records.length - 1})</summary>
                      <div className="space-y-3 pb-3">{records.slice(1).map(entry => <ResultCard key={entry.id} entry={entry} />)}</div>
                    </details>}
                  </section>
                ))
              ) : formVariants.length ? null : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                  <div className="bg-gray-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <SearchX className="h-7 w-7 text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-700">Hech narsa topilmadi</h3>
                  <p className="text-gray-400 mt-1 text-sm">So'z yozilishini tekshirib ko'ring yoki boshqa so'z izlang.</p>
                </div>
              )}
              {examplesData && examplesData.examples.length > 0 && (
                <div className="mb-6 animate-fade-in-up" data-testid="examples-section">
                  <div className="bg-white rounded-2xl border-2 border-teal-200 overflow-hidden shadow-sm">
                    <div className="bg-gray-700 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <MessageSquareQuote className="h-5 w-5 text-white" />
                        <span className="font-bold text-white text-base">Matnlarda uchraydi</span>
                        <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">
                          {examplesData.count} ta gap
                        </span>
                      </div>
                      <Button
                        onClick={() => setShowExamples(!showExamples)}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20 h-8 px-2"
                        data-testid="btn-toggle-examples"
                      >
                        {showExamples ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {showExamples && (
                      <div className="px-5 py-4 max-h-[600px] overflow-y-auto">
                        <p className="text-sm text-gray-400 mb-3">
                          "<span className="font-bold text-teal-500 font-arabic">{debouncedSearch}</span>" so'zi ishtirok etgan gaplar:
                        </p>
                        <div className="space-y-3">
                          {examplesData.examples.map((example, idx) => (
                            <div
                              key={`${example.entryId}-${idx}`}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-teal-200 hover:shadow-sm transition-all"
                              data-testid={`example-item-${idx}`}
                            >
                              <div className="font-arabic text-lg text-right leading-loose mb-2" dir="rtl">
                                {highlightWord(example.arabicExample, debouncedSearch)}
                              </div>
                              <div className="text-sm text-gray-500 border-t border-dashed border-gray-200 pt-2 mt-2">
                                {example.uzbekExample || example.uzbekMeaning}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs bg-teal-50 text-teal-500 px-2.5 py-0.5 rounded-full border border-teal-100 font-arabic">
                                  {example.arabic}
                                </span>
                                <span className="text-xs text-gray-300">#{idx + 1}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
