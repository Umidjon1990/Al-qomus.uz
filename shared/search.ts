export const ARABIC_MARKS_SOURCE =
  "[ؐ-ؚـً-ٰٟۖ-ۭ࣓-ࣿ]";

const ARABIC_MARKS_REGEX = new RegExp(ARABIC_MARKS_SOURCE, "g");
const ARABIC_LETTER_REGEX =
  /[\u0621-\u063A\u0641-\u064A\u066E-\u066F\u0671-\u06D3\u06FA-\u06FC\u0750-\u077F\u0870-\u089F\u08A0-\u08C9]/;
const LATIN_LETTER_REGEX = /[A-Za-z\u00C0-\u024F]/;
const ARABIC_VARIANT_REGEX = /[ٱأإآىؤئیک]/g;
const UZBEK_APOSTROPHE_REGEX = /[ʻʼ’‘`´]/g;

const ARABIC_VARIANTS: Record<string, string> = {
  "ٱ": "ا",
  "أ": "ا",
  "إ": "ا",
  "آ": "ا",
  "ى": "ي",
  "ؤ": "و",
  "ئ": "ي",
  "ی": "ي",
  "ک": "ك",
};

export type SearchScript = "arabic" | "latin" | "neutral";

export function detectSearchScript(value: string): SearchScript {
  for (const character of value.normalize("NFKC")) {
    if (ARABIC_LETTER_REGEX.test(character)) return "arabic";
    if (LATIN_LETTER_REGEX.test(character)) return "latin";
  }

  return "neutral";
}

export function getSearchDirection(value: string): "rtl" | "ltr" {
  return detectSearchScript(value) === "arabic" ? "rtl" : "ltr";
}

export function stripArabicMarks(value: string): string {
  return value.normalize("NFKC").replace(ARABIC_MARKS_REGEX, "");
}

export function normalizeArabicForSearch(value: string): string {
  return stripArabicMarks(value)
    .replace(ARABIC_VARIANT_REGEX, (character) => ARABIC_VARIANTS[character] || character)
    .replace(/[\u200C\u200D\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUzbekForSearch(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(UZBEK_APOSTROPHE_REGEX, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSearchTerm(value: string): string {
  return detectSearchScript(value) === "arabic"
    ? normalizeArabicForSearch(value)
    : normalizeUzbekForSearch(value);
}

export function hasArabicLetters(value: string): boolean {
  return detectSearchScript(value) === "arabic";
}
