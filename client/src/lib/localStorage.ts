const FAVORITES_KEY = 'qomus_favorites';
const HISTORY_KEY = 'qomus_search_history';
const MAX_HISTORY = 20;

export interface FavoriteEntry {
  id: number;
  arabic: string;
  uzbek?: string | null;
  addedAt: number;
}

export interface HistoryEntry {
  term: string;
  timestamp: number;
}

// Favorites
export function getFavorites(): FavoriteEntry[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addFavorite(entry: { id: number; arabic: string; uzbek?: string | null }): void {
  const favorites = getFavorites();
  if (!favorites.some(f => f.id === entry.id)) {
    favorites.unshift({ ...entry, addedAt: Date.now() });
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export function removeFavorite(id: number): void {
  const favorites = getFavorites().filter(f => f.id !== id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function isFavorite(id: number): boolean {
  return getFavorites().some(f => f.id === id);
}

export function toggleFavorite(entry: { id: number; arabic: string; uzbek?: string | null }): boolean {
  if (isFavorite(entry.id)) {
    removeFavorite(entry.id);
    return false;
  } else {
    addFavorite(entry);
    return true;
  }
}

// Search History
export function getSearchHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToHistory(term: string): void {
  if (!term.trim()) return;
  
  let history = getSearchHistory().filter(h => h.term !== term);
  history.unshift({ term, timestamp: Date.now() });
  history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}

export function removeFromHistory(term: string): void {
  const history = getSearchHistory().filter(h => h.term !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
