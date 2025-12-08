import React from "react";
import { motion } from "framer-motion";
import { DictionaryEntry } from "@/lib/api";
import { Book, Globe, Copy, Share2, Info } from "lucide-react";
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
                {entry.root && (
                  <span className="text-sm font-mono text-muted-foreground bg-background px-2 py-0.5 rounded border">
                    {entry.root}
                  </span>
                )}
              </div>
              <CardDescription className="text-lg font-medium text-foreground/80 flex items-center gap-2">
                {entry.transliteration && <span>{entry.transliteration}</span>}
                <span className="text-muted-foreground text-sm font-normal">• {entry.type}</span>
              </CardDescription>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Nusxalash">
                <Copy className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" title="Ulashish">
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </Button>
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
