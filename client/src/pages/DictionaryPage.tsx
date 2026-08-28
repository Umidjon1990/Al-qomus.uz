import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpenText,
  Check,
  ChevronDown,
  ChevronUp,
  Heart,
  History,
  Loader2,
  MessageSquareQuote,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { ResultCard } from "@/components/ResultCard";
import {
  DICTIONARY_SOURCES,
  getDictionaryEntries,
  getDictionarySources,
  searchExamples,
} from "@/lib/api";
import {
  addToHistory,
  clearHistory,
  FavoriteEntry,
  getFavorites,
  getSearchHistory,
  HistoryEntry,
  removeFromHistory,
} from "@/lib/localStorage";
import { Button } from "@/components/ui/button";

interface SourcePanelProps {
  selectedSources: string[];
  toggleSource: (source: string) => void;
  getSourceCount: (source: string) => number;
  compact?: boolean;
}

function SourcePanel({ selectedSources, toggleSource, getSourceCount, compact = false }: SourcePanelProps) {
  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Lug'at manbalari">
        {DICTIONARY_SOURCES.map((source) => {
          const selected = selectedSources.includes(source.id);
          return (
            <button
              type="button"
              key={source.id}
              onClick={() => toggleSource(source.id)}
              aria-pressed={selected}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                selected
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-primary/30"
              }`}
            >
              {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {source.name}
              <span className={selected ? "text-white/65" : "text-slate-400"}>{getSourceCount(source.id).toLocaleString()}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 px-1">
        <BookOpenText className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Lug'at manbalari</h2>
      </div>
      <div className="space-y-1.5">
        {DICTIONARY_SOURCES.map((source) => {
          const selected = selectedSources.includes(source.id);
          return (
            <button
              type="button"
              key={source.id}
              onClick={() => toggleSource(source.id)}
              aria-pressed={selected}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                selected ? "bg-primary/8 text-primary" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"}`}>
                {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{source.name}</span>
                <span className="block truncate text-[11px] text-slate-400">{source.description}</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">{getSourceCount(source.id).toLocaleString()}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface LibraryPanelProps {
  activeTab: "history" | "favorites";
  setActiveTab: (tab: "history" | "favorites") => void;
  history: HistoryEntry[];
  favorites: FavoriteEntry[];
  onSearch: (term: string) => void;
  onRemoveHistory: (term: string) => void;
  onClearHistory: () => void;
}

function LibraryPanel({
  activeTab,
  setActiveTab,
  history,
  favorites,
  onSearch,
  onRemoveHistory,
  onClearHistory,
}: LibraryPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
        >
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          Tarix ({history.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("favorites")}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${activeTab === "favorites" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
        >
          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
          Saqlangan ({favorites.length})
        </button>
      </div>

      {activeTab === "history" ? (
        <div className="mt-3">
          {history.length > 0 ? (
            <>
              <div className="space-y-1">
                {history.slice(0, 8).map((item) => (
                  <div key={item.term} className="group flex items-center gap-1 rounded-lg hover:bg-slate-50">
                    <button
                      type="button"
                      onClick={() => onSearch(item.term)}
                      className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm font-medium text-slate-600 hover:text-primary"
                    >
                      {item.term}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveHistory(item.term)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                      aria-label={`${item.term} so'rovini tarixdan o'chirish`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onClearHistory}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Tarixni tozalash
              </button>
            </>
          ) : (
            <p className="px-2 py-6 text-center text-xs leading-5 text-slate-400">Qidiruvlar hali saqlanmagan</p>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          {favorites.length > 0 ? (
            favorites.slice(0, 8).map((favorite) => (
              <button
                type="button"
                key={favorite.id}
                onClick={() => onSearch(favorite.arabic)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-primary/5"
              >
                <span className="min-w-0">
                  <span className="block truncate font-arabic text-lg leading-7 text-slate-800" dir="rtl" lang="ar">{favorite.arabic}</span>
                  <span className="block truncate text-xs text-slate-400">{favorite.uzbek || "—"}</span>
                </span>
                <Heart className="h-3.5 w-3.5 shrink-0 fill-rose-500 text-rose-500" aria-hidden="true" />
              </button>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-xs leading-5 text-slate-400">Yurakcha bosilgan so'zlar shu yerda turadi</p>
          )}
        </div>
      )}
    </section>
  );
}

export default function DictionaryPage() {
  const initialQuery = React.useMemo(() => new URLSearchParams(window.location.search).get("q") || "", []);
  const [searchTerm, setSearchTerm] = React.useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = React.useState(initialQuery.trim());
  const [selectedSources, setSelectedSources] = React.useState<string[]>(["Ghoniy"]);
  const [showExamples, setShowExamples] = React.useState(false);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = React.useState<FavoriteEntry[]>([]);
  const [activeTab, setActiveTab] = React.useState<"history" | "favorites">("history");

  React.useEffect(() => {
    setHistory(getSearchHistory());
    setFavorites(getFavorites());
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchTerm.trim();
      setDebouncedSearch(nextSearch);
      setShowExamples(false);

      const url = new URL(window.location.href);
      if (nextSearch) url.searchParams.set("q", nextSearch);
      else url.searchParams.delete("q");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const commitSearch = React.useCallback((term = searchTerm) => {
    const normalized = term.trim();
    if (!normalized) return;
    setSearchTerm(normalized);
    addToHistory(normalized);
    setHistory(getSearchHistory());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchTerm]);

  const refreshFavorites = React.useCallback(() => setFavorites(getFavorites()), []);

  const { data: sourcesData } = useQuery({
    queryKey: ["dictionary-sources"],
    queryFn: getDictionarySources,
  });

  const totalWords = sourcesData?.reduce((sum, source) => sum + source.count, 0) || 0;
  const queryIsLongEnough = debouncedSearch.length >= 2;
  const containsArabic = /[\u0600-\u06FF]/.test(debouncedSearch);

  const {
    data: entries = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["dictionary", debouncedSearch, selectedSources],
    queryFn: () => getDictionaryEntries(debouncedSearch, selectedSources),
    enabled: queryIsLongEnough && selectedSources.length > 0,
  });

  const { data: examplesData } = useQuery({
    queryKey: ["examples", debouncedSearch],
    queryFn: () => searchExamples(debouncedSearch, 20),
    enabled: queryIsLongEnough && containsArabic && selectedSources.includes("Ghoniy"),
  });

  React.useEffect(() => {
    if (activeTab === "favorites") refreshFavorites();
  }, [activeTab, refreshFavorites]);

  const toggleSource = (sourceId: string) => {
    setSelectedSources((current) =>
      current.includes(sourceId)
        ? current.filter((source) => source !== sourceId)
        : [...current, sourceId],
    );
  };

  const getSourceCount = (sourceId: string) =>
    sourcesData?.find((source) => source.source === sourceId)?.count || 0;

  const handleRemoveHistory = (term: string) => {
    removeFromHistory(term);
    setHistory(getSearchHistory());
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const handleRelatedSearch = (term: string) => {
    commitSearch(term);
    setSearchTerm(term);
  };

  const highlightWord = (text: string, word: string) => {
    if (!word || !text) return text;
    const normalizedWord = word.replace(/[\u064B-\u0652\u0670\u0671]/g, "");
    const escapedCharacters = Array.from(normalizedWord)
      .map((character) => character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[\u064B-\u0652\u0670\u0671]*");

    if (!escapedCharacters) return text;
    const regex = new RegExp(`(${escapedCharacters})`, "gi");
    return text.split(regex).map((part, index) => {
      const normalizedPart = part.replace(/[\u064B-\u0652\u0670\u0671]/g, "");
      return normalizedPart.toLowerCase() === normalizedWord.toLowerCase() ? (
        <mark key={index} className="rounded bg-amber-100 px-1 text-amber-900">{part}</mark>
      ) : part;
    });
  };

  return (
    <Layout>
      <Hero
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSubmit={() => commitSearch()}
        totalWords={totalWords}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <SourcePanel
          compact
          selectedSources={selectedSources}
          toggleSource={toggleSource}
          getSourceCount={getSourceCount}
        />

        <div className="mt-5 grid items-start gap-6 lg:mt-0 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="sticky top-22 hidden space-y-4 lg:block">
            <SourcePanel
              selectedSources={selectedSources}
              toggleSource={toggleSource}
              getSourceCount={getSourceCount}
            />
            <LibraryPanel
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              history={history}
              favorites={favorites}
              onSearch={handleRelatedSearch}
              onRemoveHistory={handleRemoveHistory}
              onClearHistory={handleClearHistory}
            />
          </aside>

          <div className="min-w-0">
            {selectedSources.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
                <BookOpenText className="mx-auto h-7 w-7 text-amber-600" aria-hidden="true" />
                <h2 className="mt-3 font-bold text-amber-950">Kamida bitta lug'at manbasini tanlang</h2>
                <p className="mt-1 text-sm text-amber-700">Yuqoridagi manbalardan birini bosing.</p>
              </div>
            ) : !debouncedSearch ? (
              <div className="lg:hidden">
                <LibraryPanel
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  history={history}
                  favorites={favorites}
                  onSearch={handleRelatedSearch}
                  onRemoveHistory={handleRemoveHistory}
                  onClearHistory={handleClearHistory}
                />
              </div>
            ) : !queryIsLongEnough ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
                <SearchX className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-600">Qidiruv uchun kamida 2 ta harf kiriting</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                  Lug'atlardan qidirilmoqda…
                </div>
                {[0, 1].map((item) => (
                  <div key={item} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center" role="alert">
                <h2 className="font-bold text-red-900">Qidiruvda vaqtinchalik xatolik yuz berdi</h2>
                <p className="mt-1 text-sm text-red-600">Internetni tekshirib, so'rovni qayta kiriting.</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Qidiruv natijasi</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      “{debouncedSearch}”
                      <span className="ml-2 text-sm font-medium text-slate-400">{entries.length} ta natija</span>
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400">{selectedSources.join(" · ")}</p>
                </div>

                {examplesData && examplesData.examples.length > 0 && (
                  <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-labelledby="examples-title">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                          <MessageSquareQuote className="h-4.5 w-4.5" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 id="examples-title" className="text-sm font-bold text-slate-800">Gap ichida qo'llanishi</h3>
                          <p className="text-xs text-slate-400">{examplesData.count} ta misol topildi</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExamples((current) => !current)}
                        className="rounded-lg text-xs font-semibold text-slate-500 hover:text-primary"
                        aria-expanded={showExamples}
                      >
                        {showExamples ? "Yopish" : "Barchasi"}
                        {showExamples ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                      </Button>
                    </div>

                    <div className={`space-y-2.5 px-4 py-4 sm:px-5 ${showExamples ? "max-h-[560px] overflow-y-auto" : ""}`}>
                      {examplesData.examples.slice(0, showExamples ? examplesData.examples.length : 1).map((example, exampleIndex) => (
                        <div key={`${example.entryId}-${exampleIndex}`} className="rounded-xl bg-[#f8f7f3] px-4 py-3.5">
                          <p className="font-arabic text-right text-lg leading-9 text-slate-800" dir="rtl" lang="ar">
                            {highlightWord(example.arabicExample, debouncedSearch)}
                          </p>
                          <p className="mt-1 border-t border-slate-200/70 pt-2 text-sm leading-6 text-slate-500">
                            {example.uzbekExample || example.uzbekMeaning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {entries.length > 0 ? (
                  <div className="space-y-5">
                    {entries.map((entry, index) => (
                      <ResultCard key={entry.id} entry={entry} index={index} onSearch={handleRelatedSearch} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100">
                      <SearchX className="h-6 w-6 text-slate-400" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold text-slate-800">Bu so'z topilmadi</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                      Yozilishini tekshiring yoki boshqa lug'at manbasini tanlab ko'ring.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
