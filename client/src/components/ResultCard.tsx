import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { DictionaryEntry, getRelatedWords } from "@/lib/api";
import { Book, Globe, Copy, Share2, Info, ChevronDown, ChevronUp, Link2, Heart } from "lucide-react";
import { isFavorite, toggleFavorite } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/30 overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-baseline gap-3 mb-1">
                <CardTitle className="text-4xl font-arabic text-primary leading-relaxed" dir="rtl">
                  {entry.arabic}
                </CardTitle>
              </div>
              {entry.root && (
                <div className="flex items-center gap-2 mt-2 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 w-fit">
                  <span className="text-xs text-muted-foreground font-medium">So'z o'zagi:</span>
                  <span className="text-xl font-arabic text-primary font-semibold" dir="rtl">
                    {entry.root}
                  </span>
                </div>
              )}
              <CardDescription className="text-lg font-medium text-foreground/80 flex items-center gap-2">
                {entry.transliteration && <span>{entry.transliteration}</span>}
                <span className="text-muted-foreground text-sm font-normal">• {entry.type}</span>
              </CardDescription>
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
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
              <Globe className="h-5 w-5 text-secondary" />
              {entry.uzbek || <span className="text-muted-foreground italic text-sm">Tarjima qilinmagan</span>}
            </h3>
          </div>

          {entry.arabicDefinition && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-md border border-amber-100 dark:border-amber-800/30">
              <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Arabcha izohi
              </h4>
              <p className="font-arabic text-right text-lg leading-relaxed text-foreground/90" dir="rtl">
                {entry.arabicDefinition}
              </p>
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
