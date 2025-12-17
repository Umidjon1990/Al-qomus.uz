import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { motion } from "framer-motion";

interface WordnetLemma {
  id: number;
  synsetId: string;
  arabicWord: string;
  arabicWordNormalized: string | null;
  dictionaryEntryId: number | null;
}

interface WordnetSynset {
  id: number;
  synsetId: string;
  partOfSpeech: string | null;
  arabicGloss: string | null;
  arabicExamples: string | null;
  englishLemmas: string | null;
  englishGloss: string | null;
}

interface SynsetResult {
  synset: WordnetSynset;
  lemmas: WordnetLemma[];
}

const posLabels: Record<string, string> = {
  noun: "ism (اسم)",
  verb: "fe'l (فعل)",
  adjective: "sifat (صفة)",
  adverb: "zarf (ظرف)",
};

interface SynonymResultCardProps {
  result: SynsetResult;
  zoomLevel?: number;
}

export function SynonymResultCard({ result, zoomLevel = 100 }: SynonymResultCardProps) {
  const scale = zoomLevel / 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ fontSize: `${scale}rem` }}
    >
      <Card className="hover:shadow-lg transition-shadow border-emerald-200 bg-gradient-to-r from-emerald-50 to-white" data-testid={`synonym-card-${result.synset.synsetId}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-arabic text-emerald-800" dir="rtl">
                {result.lemmas.map(l => l.arabicWord).join(" ، ")}
              </CardTitle>
              {result.synset.englishLemmas && (
                <p className="text-sm text-gray-500 mt-1">
                  {result.synset.englishLemmas}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                مرادفات
              </Badge>
              {result.synset.partOfSpeech && (
                <Badge variant="outline" className="text-xs">
                  {posLabels[result.synset.partOfSpeech] || result.synset.partOfSpeech}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {result.synset.arabicGloss && (
            <p className="text-gray-700 font-arabic mb-2" dir="rtl">
              {result.synset.arabicGloss}
            </p>
          )}
          {result.synset.englishGloss && (
            <p className="text-sm text-gray-500 italic mb-3">
              {result.synset.englishGloss}
            </p>
          )}
          {result.synset.arabicExamples && (
            <div className="bg-amber-50 rounded-lg p-3 mt-2">
              <p className="text-sm text-amber-800 font-arabic" dir="rtl">
                📖 {result.synset.arabicExamples}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {result.lemmas.filter(l => l.dictionaryEntryId).map(lemma => (
              <Link key={lemma.id} href={`/?search=${encodeURIComponent(lemma.arabicWord)}`}>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-emerald-100 border-emerald-300 text-xs"
                  data-testid={`badge-lemma-${lemma.id}`}
                >
                  🔍 {lemma.arabicWord}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
