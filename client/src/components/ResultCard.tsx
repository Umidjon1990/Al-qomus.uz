import { Link } from 'wouter';
import { extractSarf } from '@shared/sarf';
import { dictionaryVerb } from '@shared/sarf-expanded';
import React, { useEffect, useState } from 'react';
import { Copy, Heart } from 'lucide-react';
import { DictionaryEntry } from '@/lib/api';
import { isFavorite, toggleFavorite } from '@/lib/localStorage';
import { DefinitionFormatter } from './DefinitionFormatter';
import { toast } from '@/hooks/use-toast';

function parseList(value?: string | null): any[] {
  try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

export function ResultCard({ entry }: { entry: DictionaryEntry; index?: number }) {
  const [liked, setLiked] = useState(false);
  useEffect(() => { setLiked(isFavorite(entry.id)); }, [entry.id]);
  const meanings = parseList(entry.meaningsJson);
  const examples = parseList(entry.examplesJson);
  const word = entry.arabicVocalized || entry.arabic;
  const root = entry.root || (entry.dictionarySource === 'Ghoniy' && entry.type?.replace(/[\u200e\u200f]/g, '').length <= 4 ? entry.type : '');
  const type = entry.wordType || entry.arabicDefinition?.match(/^\s*\(([^)]+)\)/)?.[1];
  const firstMeaning = meanings[0]?.uzbekMeaning || meanings[0]?.uzbek_meaning || entry.uzbek;
  const senseExamples = meanings.filter(m => m.arabicExample || m.arabic_example).map(m => ({ arabic: m.arabicExample || m.arabic_example, uzbek: m.uzbekExample || m.uzbek_example }));
  const allExamples = [...senseExamples, ...examples];
  const sarf = extractSarf(entry);
  const definition = entry.arabicDefinitionVocalized || entry.arabicDefinition;
  return <article className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid={`card-product-${entry.id}`}>
    <div className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-arabic dictionary-headword text-gray-900 break-words leading-relaxed" dir="rtl" data-testid={`text-arabic-${entry.id}`}>{word}</h2>
          <p className="dictionary-translation text-gray-800 mt-1 leading-relaxed">{firstMeaning || 'O‘zbekcha tarjima hali kiritilmagan'}</p>
          {meanings[0]?.confidence && meanings[0].confidence < 0.8 && <span className="text-xs text-amber-700">Taxminiy tarjima</span>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
            <span>{entry.dictionarySource}</span>
            {root && <span>Ildiz: <b dir="rtl" className="font-arabic text-base">{root}</b></span>}
            {type && <span>{type}</span>}
            {entry.transliteration && <span>{entry.transliteration}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col sm:flex-row">
          <button aria-label={liked ? 'Saqlanganlardan olib tashlash' : 'So‘zni saqlash'} aria-pressed={liked} className="p-3 rounded-lg hover:bg-teal-50" onClick={() => setLiked(toggleFavorite({ id: entry.id, arabic: entry.arabic, uzbek: entry.uzbek }))}>
            <Heart className={`h-5 w-5 ${liked ? 'fill-teal-500 text-teal-500' : 'text-gray-500'}`} />
          </button>
          <button aria-label="So‘z va tarjimani nusxalash" className="p-3 rounded-lg hover:bg-teal-50 text-gray-500" onClick={async () => {
            try { await navigator.clipboard.writeText(`${word} — ${firstMeaning || ''}`); toast({ title: 'Nusxalandi' }); }
            catch { toast({ title: 'Nusxalab bo‘lmadi', description: 'Matnni belgilab nusxalang.', variant: 'destructive' }); }
          }}><Copy className="h-5 w-5" /></button>
        </div>
      </div>
    </div>
    {(sarf || dictionaryVerb(entry)) && <div className="px-4 sm:px-5 pb-4">{sarf && <p className="font-arabic text-xl mb-2" dir="rtl">{sarf.past} — {sarf.present}</p>}<Link href={`/sarf/${entry.id}`} className="inline-block rounded-lg bg-teal-600 text-white px-4 py-2 text-sm">To‘liq tuslash</Link></div>}
    <div className="dictionary-body border-t border-gray-100 divide-y divide-gray-100">
      {meanings.length > 1 && <details className="px-4 sm:px-5"><summary className="cursor-pointer py-3 text-sm font-medium text-gray-700">Barcha ma’nolar ({meanings.length})</summary>
        <ol className="list-decimal pl-5 pb-4 space-y-3">{meanings.map((m, i) => <li key={i}>{m.uzbekMeaning || m.uzbek_meaning}{m.confidence && m.confidence < 0.8 && <span className="block text-xs text-amber-700">Taxminiy tarjima</span>}</li>)}</ol>
      </details>}
      {allExamples.length > 0 && <details className="px-4 sm:px-5"><summary className="cursor-pointer py-3 text-sm font-medium text-gray-700">Misollar ({allExamples.length})</summary>
        <div className="space-y-4 pb-4">{allExamples.map((ex, i) => <div key={i}><p className="font-arabic leading-loose" dir="rtl">{ex.arabic}</p>{ex.uzbek && <p className="text-gray-600 mt-1">{ex.uzbek}</p>}</div>)}</div>
      </details>}
      {definition && <details className="px-4 sm:px-5"><summary className="cursor-pointer py-3 text-sm font-medium text-gray-700">Arabcha izoh · {entry.dictionarySource}</summary><div className="pb-4"><DefinitionFormatter definition={definition} /></div></details>}
    </div>
  </article>;
}
