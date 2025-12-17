import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, BookOpen, ArrowLeft, Users, BookText, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface WordnetStats {
  totalSynsets: number;
  totalLemmas: number;
  matchedLemmas: number;
}

const posLabels: Record<string, string> = {
  noun: "ism (اسم)",
  verb: "fe'l (فعل)",
  adjective: "sifat (صفة)",
  adverb: "zarf (ظرف)",
};

export default function SynonymsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: stats } = useQuery<WordnetStats>({
    queryKey: ["/api/wordnet/stats"],
    queryFn: async () => {
      const res = await fetch("/api/wordnet/stats");
      return res.json();
    },
  });

  const { data: results, isLoading } = useQuery<SynsetResult[]>({
    queryKey: ["/api/wordnet/search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const res = await fetch(`/api/wordnet/search?q=${encodeURIComponent(debouncedQuery)}`);
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white py-8 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-emerald-600" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                Sinonimlar (مرادفات)
              </h1>
              <p className="text-emerald-100 text-sm mt-1">
                Arabic WordNet - bir xil ma'noli so'zlar guruhi
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
            <Input
              type="text"
              placeholder="Arabcha yoki inglizcha so'z qidiring..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-6 text-lg rounded-xl border-0 shadow-lg text-gray-800 placeholder-gray-400"
              data-testid="input-search"
              dir="auto"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {stats && !debouncedQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-4 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <div className="text-2xl font-bold">{stats.totalSynsets.toLocaleString()}</div>
                <div className="text-sm opacity-80">Synset guruhlari</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <CardContent className="p-4 text-center">
                <BookText className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <div className="text-2xl font-bold">{stats.totalLemmas.toLocaleString()}</div>
                <div className="text-sm opacity-80">Jami so'zlar</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
              <CardContent className="p-4 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <div className="text-2xl font-bold">{stats.matchedLemmas.toLocaleString()}</div>
                <div className="text-sm opacity-80">Lug'atga bog'langan</div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!debouncedQuery && (
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
              <h3 className="text-lg font-semibold text-emerald-800 mb-2">
                Sinonimlar qidiring
              </h3>
              <p className="text-emerald-600">
                Arabcha yoki inglizcha so'z kiriting va bir xil ma'noli so'zlar guruhini toping.
                <br />
                Masalan: <span className="font-arabic text-lg">كتاب</span> yoki "book"
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-4">Qidirilmoqda...</p>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{results.length} ta natija topildi</p>
            {results.map((result) => (
              <motion.div
                key={result.synset.synsetId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
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
                      {result.synset.partOfSpeech && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                          {posLabels[result.synset.partOfSpeech] || result.synset.partOfSpeech}
                        </Badge>
                      )}
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
                            className="cursor-pointer hover:bg-emerald-100 border-emerald-300"
                            data-testid={`badge-lemma-${lemma.id}`}
                          >
                            Lug'atda qidirish: {lemma.arabicWord}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {results && results.length === 0 && debouncedQuery && (
          <Card className="bg-gray-50">
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Natija topilmadi
              </h3>
              <p className="text-gray-500">
                "{debouncedQuery}" uchun sinonim guruhi topilmadi.
                <br />
                Boshqa so'z bilan urinib ko'ring.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
