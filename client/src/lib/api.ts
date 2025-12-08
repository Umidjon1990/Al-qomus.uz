export interface DictionaryEntry {
  id: number;
  arabic: string;
  arabicDefinition?: string | null;
  uzbek?: string | null;
  transliteration?: string | null;
  type: string;
  root?: string | null;
  examplesJson?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DictionaryStats {
  total: number;
  translated: number;
  pending: number;
}

// API Functions
export async function getDictionaryEntries(search?: string): Promise<DictionaryEntry[]> {
  const url = search ? `/api/dictionary?search=${encodeURIComponent(search)}` : '/api/dictionary';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch entries');
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

export async function importEntries(entries: any[]): Promise<{ count: number; entries: DictionaryEntry[] }> {
  const response = await fetch('/api/dictionary/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
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
