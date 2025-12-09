import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { DictionaryEntry, getRelatedWords } from "@/lib/api";
import { Book, Globe, Copy, Share2, Info, ChevronDown, ChevronUp, Link2, Heart } from "lucide-react";
import { isFavorite, toggleFavorite } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
import { DefinitionFormatter } from "./DefinitionFormatter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
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

  // Parse examples from JSON
  const examples = entry.examplesJson ? JSON.parse(entry.examplesJson) : [];
  
  // Parse structured meanings from JSON (for Ghoniy with AI translations)
  const structuredMeanings = entry.meaningsJson ? JSON.parse(entry.meaningsJson) : [];

  // Extract word type from definition if it's in parentheses at the beginning (for Ghoniy)
  const extractWordTypeFromDefinition = (definition: string | null | undefined) => {
    if (!definition) return { wordType: null, cleanDefinition: definition };
    
    // Match Arabic text in parentheses at the start: (مصدر تَزَلَّفَ) or similar
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
  
  // Priority for word type display:
  // 1. wordType field from AI processing (e.g., "masdar", "feʼl", "ot")
  // 2. Extracted from definition parentheses
  // 3. entry.type if it's long (not just root)
  const displayType = entry.wordType 
    ? entry.wordType 
    : (extractedWordType || (entry.type && entry.type !== 'aniqlanmagan' && entry.type.length > 4 ? entry.type : null));
  
  // For Ghoniy, entry.type is the root (3-4 Arabic letters)
  const isGhoniyRoot = entry.dictionarySource === 'Ghoniy' && entry.type && entry.type.length <= 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/30 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950/30 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-baseline gap-3 mb-2">
                <CardTitle className="text-4xl font-arabic text-blue-700 dark:text-blue-400 leading-relaxed drop-shadow-sm" dir="rtl">
                  {entry.arabic}
                </CardTitle>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* Show root - either from root field or from type field (for Ghoniy) */}
                {(entry.root || isGhoniyRoot) && (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/20 px-3 py-1.5 rounded-full border border-purple-300 dark:border-purple-700">
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">ildiz:</span>
                    <span className="text-lg font-arabic text-purple-700 dark:text-purple-300 font-bold" dir="rtl">
                      {entry.root || entry.type}
                    </span>
                  </div>
                )}
                
                {/* Show word type - from AI wordType, extracted from definition, or from type field if long */}
                {displayType && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/30 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-700">
                    {displayType}
                  </span>
                )}
              </div>
              
              {entry.transliteration && (
                <CardDescription className="text-base font-medium text-teal-600 dark:text-teal-400 mt-2">
                  {entry.transliteration}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                entry.dictionarySource === 'Roid' 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`} data-testid={`badge-source-${entry.id}`}>
                {entry.dictionarySource}
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleToggleFavorite} 
                  title={liked ? "Yoqtirilganlardan olib tashlash" : "Yoqtirish"}
                  data-testid={`btn-favorite-${entry.id}`}
                >
                  <Heart className={`h-5 w-5 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Nusxalash" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" title="Ulashish" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Structured Meanings Display - for Ghoniy with AI translations */}
          {structuredMeanings.length > 0 ? (
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">O'zbekcha tarjima ({structuredMeanings.length} ma'no)</span>
              </div>
              {structuredMeanings.map((meaning: any, idx: number) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    idx % 3 === 0 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border-green-200 dark:border-green-800/50'
                      : idx % 3 === 1
                        ? 'bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20 border-teal-200 dark:border-teal-800/50'
                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shrink-0 ${
                      idx % 3 === 0 
                        ? 'bg-green-600 text-white'
                        : idx % 3 === 1
                          ? 'bg-teal-600 text-white'
                          : 'bg-blue-600 text-white'
                    }`}>
                      {meaning.index || idx + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold mb-1 ${
                        idx % 3 === 0 
                          ? 'text-green-700 dark:text-green-300'
                          : idx % 3 === 1
                            ? 'text-teal-700 dark:text-teal-300'
                            : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        {meaning.uzbekMeaning || meaning.uzbek_meaning}
                      </h3>
                      
                      {(meaning.arabicExample || meaning.arabic_example) && (
                        <div className="mt-2 pt-2 border-t border-current/10">
                          <p className="text-sm font-arabic text-foreground/80" dir="rtl">
                            {meaning.arabicExample || meaning.arabic_example}
                          </p>
                          {(meaning.uzbekExample || meaning.uzbek_example) && (
                            <p className="text-sm text-muted-foreground italic mt-1">
                              ↳ {meaning.uzbekExample || meaning.uzbek_example}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {meaning.confidence && meaning.confidence < 0.8 && (
                        <span className="inline-flex items-center px-2 py-0.5 mt-2 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Taxminiy tarjima
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800/50">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">O'zbekcha tarjima</span>
              </div>
              <h3 className="text-xl font-bold text-green-700 dark:text-green-300">
                {entry.uzbek || <span className="text-muted-foreground italic text-sm font-normal">Tarjima qilinmagan</span>}
              </h3>
            </div>
          )}

          {entry.arabicDefinition && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-800/30">
              <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Arabcha izohi
              </h4>
              <DefinitionFormatter definition={cleanDefinition || entry.arabicDefinition} />
            </div>
          )}

          {examples.length > 0 && (
            <div className="space-y-3 bg-accent/30 p-4 rounded-lg border border-accent">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Book className="h-4 w-4" />
                Misollar
              </h4>
              <div className="space-y-3">
                {examples.map((ex: any, idx: number) => (
                  <div key={idx} className="grid md:grid-cols-2 gap-2 md:gap-8 text-sm md:text-base border-b border-border/50 last:border-0 pb-2 last:pb-0">
                    <p className="font-arabic text-right text-foreground/90 text-lg" dir="rtl">{ex.arabic}</p>
                    <p className="text-muted-foreground italic">{ex.uzbek}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRelated(!showRelated)}
              className="w-full justify-between text-muted-foreground hover:text-foreground"
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
                  <div className="mt-3 space-y-2">
                    {isLoadingRelated ? (
                      <p className="text-sm text-muted-foreground text-center py-2">Yuklanmoqda...</p>
                    ) : relatedWords.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {relatedWords.slice(0, 12).map((related) => (
                          <div
                            key={related.id}
                            className="p-2 bg-muted/50 rounded-md border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                            data-testid={`related-word-${related.id}`}
                          >
                            <p className="font-arabic text-lg text-primary" dir="rtl">{related.arabic}</p>
                            <p className="text-xs text-muted-foreground truncate">{related.uzbek || "—"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">O'xshash so'zlar topilmadi</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
