import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { DictionaryEntry, getRelatedWords } from "@/lib/api";
import { Book, Globe, Copy, Share2, Info, ChevronDown, ChevronUp, Link2, Heart, Loader2 } from "lucide-react";
import { isFavorite, toggleFavorite } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
import { DefinitionFormatter } from "./DefinitionFormatter";
import { toast } from "@/hooks/use-toast";

interface ResultCardProps {
  entry: DictionaryEntry;
  index: number;
}

export function ResultCard({ entry, index }: ResultCardProps) {
  const [showRelated, setShowRelated] = useState(false);
  const [liked, setLiked] = useState(false);
  
  useEffect(() => {
    setLiked(isFavorite(entry.id));
  }, [entry.id]);
  
  const { data: relatedWords = [], isLoading: isLoadingRelated } = useQuery({
    queryKey: ['related', entry.id],
    queryFn: () => getRelatedWords(entry.id),
    enabled: showRelated,
  });

  const handleToggleFavorite = () => {
    const isNowFavorite = toggleFavorite({
      id: entry.id,
      arabic: entry.arabic,
      uzbek: entry.uzbek,
    });
    setLiked(isNowFavorite);
    toast({
      title: isNowFavorite ? "Yoqtirilganlarga qo'shildi" : "Yoqtirilganlardan olib tashlandi",
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${entry.arabic} - ${entry.uzbek}`);
    toast({
      title: "Nusxalandi",
      description: "So'z va tarjimasi nusxalandi",
    });
  };

  const examples = entry.examplesJson ? JSON.parse(entry.examplesJson) : [];
  const structuredMeanings = entry.meaningsJson ? JSON.parse(entry.meaningsJson) : [];

  const extractWordTypeFromDefinition = (definition: string | null | undefined) => {
    if (!definition) return { wordType: null, cleanDefinition: definition };
    const match = definition.match(/^\s*\(([^)]+)\)\s*[.|]?\s*/);
    if (match) {
      return {
        wordType: match[1].trim(),
        cleanDefinition: definition.slice(match[0].length).trim()
      };
    }
    return { wordType: null, cleanDefinition: definition };
  };

  const { wordType: extractedWordType, cleanDefinition } = extractWordTypeFromDefinition(entry.arabicDefinition);
  
  const displayType = entry.wordType 
    ? entry.wordType 
    : (extractedWordType || (entry.type && entry.type !== 'aniqlanmagan' && entry.type.length > 4 ? entry.type : null));
  
  const isGhoniyRoot = entry.dictionarySource === 'Ghoniy' && entry.type && entry.type.length <= 4;

  const meaningColors = [
    { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-600', text: 'text-emerald-800' },
    { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-600', text: 'text-teal-800' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-600', text: 'text-cyan-800' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
    >
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-emerald-200 overflow-hidden group">
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-slate-50 to-emerald-50/30">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-3xl md:text-4xl font-arabic text-emerald-800 leading-relaxed" dir="rtl">
                  {entry.arabic}
                </h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {(entry.root || isGhoniyRoot) && (
                  <div className="inline-flex items-center gap-1.5 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                    <span className="text-xs text-purple-500 font-medium">ildiz:</span>
                    <span className="text-base font-arabic text-purple-700 font-bold" dir="rtl">
                      {entry.root || entry.type}
                    </span>
                  </div>
                )}
                
                {displayType && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    {displayType}
                  </span>
                )}
              </div>
              
              {entry.transliteration && (
                <p className="text-sm font-medium text-teal-600 mt-2">
                  {entry.transliteration}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                entry.dictionarySource === 'Roid' 
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : entry.dictionarySource === 'Muasir'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`} data-testid={`badge-source-${entry.id}`}>
                {entry.dictionarySource}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleToggleFavorite} 
                className="h-9 w-9 rounded-full"
                data-testid={`btn-favorite-${entry.id}`}
              >
                <Heart className={`h-5 w-5 transition-all ${liked ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-400'}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Copy className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {structuredMeanings.length > 0 ? (
            <div className="mb-5 space-y-2.5">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">O'zbekcha tarjima ({structuredMeanings.length} ma'no)</span>
              </div>
              {structuredMeanings.map((meaning: any, idx: number) => {
                const color = meaningColors[idx % 3];
                return (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl border ${color.bg} ${color.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0 ${color.badge}`}>
                        {meaning.index || idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base font-bold ${color.text}`}>
                          {meaning.uzbekMeaning || meaning.uzbek_meaning}
                        </h3>
                        
                        {(meaning.arabicExample || meaning.arabic_example) && (
                          <div className="mt-2 pt-2 border-t border-current/10">
                            <p className="text-sm font-arabic text-gray-600" dir="rtl">
                              {meaning.arabicExample || meaning.arabic_example}
                            </p>
                            {(meaning.uzbekExample || meaning.uzbek_example) && (
                              <p className="text-sm text-gray-500 italic mt-1">
                                ↳ {meaning.uzbekExample || meaning.uzbek_example}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {meaning.confidence && meaning.confidence < 0.8 && (
                          <span className="inline-flex items-center px-2 py-0.5 mt-2 text-xs rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            Taxminiy tarjima
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-5 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">O'zbekcha tarjima</span>
              </div>
              <h3 className="text-lg font-bold text-emerald-800">
                {entry.uzbek || <span className="text-gray-400 italic text-sm font-normal">Tarjima qilinmagan</span>}
              </h3>
            </div>
          )}

          {entry.arabicDefinition && (
            <div className="mb-5 bg-amber-50/60 p-4 rounded-xl border border-amber-200/60">
              <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Arabcha izohi
              </h4>
              <DefinitionFormatter definition={cleanDefinition || entry.arabicDefinition} />
            </div>
          )}

          {examples.length > 0 && (
            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Book className="h-3.5 w-3.5" />
                Misollar
              </h4>
              <div className="space-y-2.5">
                {examples.map((ex: any, idx: number) => (
                  <div key={idx} className="grid md:grid-cols-2 gap-2 md:gap-6 text-sm md:text-base border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                    <p className="font-arabic text-right text-gray-700 text-base" dir="rtl">{ex.arabic}</p>
                    <p className="text-gray-500 italic">{ex.uzbek}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRelated(!showRelated)}
              className="w-full justify-between text-gray-400 hover:text-foreground rounded-xl"
              data-testid={`button-related-${entry.id}`}
            >
              <span className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                O'xshash so'zlar
              </span>
              {showRelated ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            <AnimatePresence>
              {showRelated && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-2">
                    {isLoadingRelated ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Yuklanmoqda...
                      </div>
                    ) : relatedWords.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {relatedWords.slice(0, 12).map((related) => (
                          <div
                            key={related.id}
                            className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer"
                            data-testid={`related-word-${related.id}`}
                          >
                            <p className="font-arabic text-lg text-emerald-800" dir="rtl">{related.arabic}</p>
                            <p className="text-xs text-gray-400 truncate">{related.uzbek || "—"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-3">O'xshash so'zlar topilmadi</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
