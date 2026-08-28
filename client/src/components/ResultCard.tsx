import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy,
  Heart,
  Languages,
  Loader2,
  Network,
  Share2,
} from "lucide-react";
import { DictionaryEntry, getRelatedWords } from "@/lib/api";
import { isFavorite, toggleFavorite } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
import { DefinitionFormatter } from "./DefinitionFormatter";
import { toast } from "@/hooks/use-toast";

interface ResultCardProps {
  entry: DictionaryEntry;
  index: number;
  onSearch: (term: string) => void;
}

interface StructuredMeaning {
  index?: number;
  uzbekMeaning?: string;
  uzbek_meaning?: string;
  arabicExample?: string;
  arabic_example?: string;
  uzbekExample?: string;
  uzbek_example?: string;
  confidence?: number;
}

interface EntryExample {
  arabic?: string;
  uzbek?: string;
}

function parseArray<T>(value?: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractWordType(definition?: string | null) {
  if (!definition) return { wordType: null, cleanDefinition: definition };
  const match = definition.match(/^\s*\(([^)]+)\)\s*[.|]?\s*/);
  if (!match) return { wordType: null, cleanDefinition: definition };

  return {
    wordType: match[1].trim(),
    cleanDefinition: definition.slice(match[0].length).trim(),
  };
}

export function ResultCard({ entry, index, onSearch }: ResultCardProps) {
  const [showRelated, setShowRelated] = React.useState(false);
  const [showAllMeanings, setShowAllMeanings] = React.useState(false);
  const [liked, setLiked] = React.useState(false);

  React.useEffect(() => {
    setLiked(isFavorite(entry.id));
    setShowAllMeanings(false);
    setShowRelated(false);
  }, [entry.id]);

  const { data: relatedWords = [], isLoading: isLoadingRelated } = useQuery({
    queryKey: ["related", entry.id],
    queryFn: () => getRelatedWords(entry.id),
    enabled: showRelated,
  });

  const examples = parseArray<EntryExample>(entry.examplesJson);
  const structuredMeanings = parseArray<StructuredMeaning>(entry.meaningsJson);
  const visibleMeanings = showAllMeanings ? structuredMeanings : structuredMeanings.slice(0, 3);
  const { wordType: extractedWordType, cleanDefinition } = extractWordType(entry.arabicDefinition);

  const storedRoot = entry.root?.trim() || "";
  const typeValue = entry.type?.replace(/\u200f/g, "").trim();
  const inferredRoot = entry.dictionarySource === "Ghoniy" && typeValue && typeValue.length <= 4 ? typeValue : "";
  const root = storedRoot || inferredRoot;
  const displayType = entry.wordType || extractedWordType || (!inferredRoot && typeValue !== "aniqlanmagan" ? typeValue : null);

  const handleToggleFavorite = () => {
    const isNowFavorite = toggleFavorite({ id: entry.id, arabic: entry.arabic, uzbek: entry.uzbek });
    setLiked(isNowFavorite);
    toast({
      title: isNowFavorite ? "Saqlangan so'zlarga qo'shildi" : "Saqlanganlardan olib tashlandi",
    });
  };

  const copyEntry = async () => {
    await navigator.clipboard.writeText(`${entry.arabic} — ${entry.uzbek || ""}`);
    toast({ title: "So'z va tarjima nusxalandi" });
  };

  const shareEntry = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("q", entry.arabic);
    const shareData = {
      title: `${entry.arabic} — AL-QOMUS.UZ`,
      text: `${entry.arabic} — ${entry.uzbek || "Arabcha-o'zbekcha lug'at"}`,
      url: url.toString(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url.toString());
    toast({ title: "So'z havolasi nusxalandi" });
  };

  return (
    <article
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
      data-testid={`card-product-${entry.id}`}
      aria-labelledby={`entry-title-${entry.id}`}
    >
      <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                {entry.dictionarySource}
              </span>
              {index === 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  Eng mos natija
                </span>
              )}
            </div>

            <h2
              id={`entry-title-${entry.id}`}
              className="font-arabic text-[34px] font-semibold leading-[1.55] text-slate-950 sm:text-[42px]"
              dir="rtl"
              lang="ar"
              data-testid={`text-arabic-${entry.id}`}
            >
              {entry.arabic}
            </h2>

            {entry.transliteration && (
              <p className="mt-0.5 text-sm font-medium text-slate-500">{entry.transliteration}</p>
            )}

            {(root || displayType) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {root && (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-500">
                    ildiz
                    <b className="font-arabic text-base text-slate-800" dir="rtl" lang="ar">{root}</b>
                  </span>
                )}
                {displayType && (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold text-slate-600">
                    {displayType}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className="h-9 w-9 rounded-lg hover:bg-white"
              aria-label={liked ? "Saqlanganlardan olib tashlash" : "So'zni saqlash"}
              title={liked ? "Saqlanganlardan olib tashlash" : "So'zni saqlash"}
              data-testid={`btn-favorite-${entry.id}`}
            >
              <Heart className={`h-4.5 w-4.5 ${liked ? "fill-rose-500 text-rose-500" : "text-slate-500"}`} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={copyEntry}
              className="h-9 w-9 rounded-lg hover:bg-white"
              aria-label="So'z va tarjimani nusxalash"
              title="Nusxalash"
            >
              <Copy className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={shareEntry}
              className="h-9 w-9 rounded-lg hover:bg-white"
              aria-label="So'zni ulashish"
              title="Ulashish"
            >
              <Share2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        <section aria-label="O'zbekcha ma'nolar">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
            O'zbekcha ma'no
          </div>

          {structuredMeanings.length > 0 ? (
            <div className="space-y-2.5">
              {visibleMeanings.map((meaning, meaningIndex) => {
                const uzbekMeaning = meaning.uzbekMeaning || meaning.uzbek_meaning || "Tarjima kiritilmagan";
                const arabicExample = meaning.arabicExample || meaning.arabic_example;
                const uzbekExample = meaning.uzbekExample || meaning.uzbek_example;

                return (
                  <div key={meaningIndex} className="flex gap-3 rounded-xl bg-[#f8f7f3] px-3.5 py-3.5 sm:px-4">
                    <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-white px-1 text-xs font-bold text-primary shadow-sm ring-1 ring-slate-200">
                      {meaning.index || meaningIndex + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-6 text-slate-800 sm:text-base">{uzbekMeaning}</p>
                      {arabicExample && (
                        <div className="mt-2 border-r-2 border-primary/20 pr-3" dir="rtl">
                          <p className="font-arabic text-[17px] leading-8 text-slate-700" lang="ar">{arabicExample}</p>
                          {uzbekExample && (
                            <p className="mt-0.5 text-left text-sm font-normal text-slate-500" dir="ltr">{uzbekExample}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {structuredMeanings.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllMeanings((current) => !current)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {showAllMeanings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showAllMeanings ? "Qisqartirish" : `Yana ${structuredMeanings.length - 3} ta ma'no`}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-[#f8f7f3] px-4 py-4">
              <p className="text-base font-semibold leading-7 text-slate-800">
                {entry.uzbek || <span className="font-normal italic text-slate-400">Tarjima kiritilmagan</span>}
              </p>
            </div>
          )}
        </section>

        {entry.arabicDefinition && (
          <details className="group rounded-xl border border-slate-200 bg-slate-50/70 open:bg-slate-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              <span className="inline-flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" aria-hidden="true" />
                Arabcha izoh
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-slate-200 p-3 sm:p-4">
              <DefinitionFormatter definition={cleanDefinition || entry.arabicDefinition} />
            </div>
          </details>
        )}

        {examples.length > 0 && (
          <details className="group rounded-xl border border-slate-200 bg-slate-50/70 open:bg-slate-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              <span>Qo'shimcha misollar ({examples.length})</span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="space-y-3 border-t border-slate-200 p-4">
              {examples.map((example, exampleIndex) => (
                <div key={exampleIndex} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                  {example.arabic && <p className="font-arabic text-right text-lg leading-8 text-slate-800" dir="rtl" lang="ar">{example.arabic}</p>}
                  {example.uzbek && <p className="mt-1 text-sm text-slate-500">{example.uzbek}</p>}
                </div>
              ))}
            </div>
          </details>
        )}

        <section className="border-t border-slate-100 pt-4" aria-label="Bir ildizli va o'xshash so'zlar">
          <button
            type="button"
            onClick={() => setShowRelated((current) => !current)}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            data-testid={`button-related-${entry.id}`}
            aria-expanded={showRelated}
          >
            <span className="inline-flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" aria-hidden="true" />
              Bir ildizli va o'xshash so'zlar
            </span>
            {showRelated ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showRelated && (
            <div className="mt-3">
              {isLoadingRelated ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Yuklanmoqda…
                </div>
              ) : relatedWords.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedWords.slice(0, 12).map((related) => (
                    <button
                      type="button"
                      key={related.id}
                      onClick={() => onSearch(related.arabic)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      data-testid={`related-word-${related.id}`}
                    >
                      <span className="block font-arabic text-xl leading-8 text-slate-900" dir="rtl" lang="ar">{related.arabic}</span>
                      <span className="block truncate text-xs text-slate-500">{related.uzbek || "—"}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-center text-sm text-slate-400">O'xshash so'zlar topilmadi</p>
              )}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
