export interface DictionaryEntry {
  id: number;
  arabic: string;
  arabicVocalized?: string | null;
  arabicDefinition?: string | null;
  arabicDefinitionVocalized?: string | null;
  uzbek?: string | null;
  transliteration?: string | null;
  type: string;
  root?: string | null;
  examplesJson?: string | null;
  meaningsJson?: string | null;
  wordType?: string | null;
  dictionarySource: string;
  processingStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DictionaryStats {
  total: number;
  translated: number;
  pending: number;
}

// Available dictionary sources - G'oniy is the primary/default
export const DICTIONARY_SOURCES = [
  { id: 'Ghoniy', name: 'G\'oniy (الغني)', description: 'Harakatli arabcha izohli lug\'at', isPrimary: true },
  { id: 'Muasir', name: 'Muasir', description: 'Arabcha-O\'zbekcha lug\'at', isPrimary: false },
  { id: 'Roid', name: 'Roid (الرائد)', description: 'Arabcha-Arabcha lug\'at', isPrimary: false },
] as const;

// API Functions
export async function getDictionaryEntries(search?: string, sources?: string[]): Promise<DictionaryEntry[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sources && sources.length > 0) params.set('sources', sources.join(','));
  
  const url = params.toString() ? `/api/dictionary?${params.toString()}` : '/api/dictionary';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch entries');
  return response.json();
}

export async function getDictionarySources(): Promise<{ source: string; count: number }[]> {
  const response = await fetch('/api/dictionary/sources');
  if (!response.ok) throw new Error('Failed to fetch sources');
  return response.json();
}

export async function getDictionaryEntry(id: number): Promise<DictionaryEntry> {
  const response = await fetch(`/api/dictionary/${id}`);
  if (!response.ok) throw new Error('Failed to fetch entry');
  return response.json();
}

export async function createDictionaryEntry(entry: Partial<DictionaryEntry>): Promise<DictionaryEntry> {
  const response = await fetch('/api/dictionary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!response.ok) throw new Error('Failed to create entry');
  return response.json();
}

export async function updateDictionaryEntry(id: number, entry: Partial<DictionaryEntry>): Promise<DictionaryEntry> {
  const response = await fetch(`/api/dictionary/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!response.ok) throw new Error('Failed to update entry');
  return response.json();
}

export async function deleteDictionaryEntry(id: number): Promise<void> {
  const response = await fetch(`/api/dictionary/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete entry');
}

export async function importEntries(entries: any[], dictionarySource: string = "Muasir"): Promise<{ count: number; entries: DictionaryEntry[]; dictionarySource: string }> {
  const response = await fetch('/api/dictionary/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries, dictionarySource }),
  });
  if (!response.ok) throw new Error('Failed to import entries');
  return response.json();
}

export async function translateEntry(id: number): Promise<DictionaryEntry> {
  const response = await fetch(`/api/dictionary/${id}/translate`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to translate entry');
  return response.json();
}

export async function batchTranslate(): Promise<{ message: string; count: number }> {
  const response = await fetch('/api/dictionary/batch-translate', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to batch translate');
  return response.json();
}

export async function getStats(): Promise<DictionaryStats> {
  const response = await fetch('/api/dictionary/stats');
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
}

export async function getRecentlyTranslated(limit: number = 100): Promise<DictionaryEntry[]> {
  const response = await fetch(`/api/dictionary/recent?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch recent entries');
  return response.json();
}

export async function getRelatedWords(id: number): Promise<DictionaryEntry[]> {
  const response = await fetch(`/api/dictionary/related/${id}`);
  if (!response.ok) throw new Error('Failed to fetch related words');
  return response.json();
}
