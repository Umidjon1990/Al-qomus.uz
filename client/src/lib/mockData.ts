export interface DictionaryEntry {
  id: string;
  arabic: string;
  transliteration?: string;
  uzbek: string;
  arabic_definition?: string; // New field for the Arabic explanation from Excel
  type: string; // noun, verb, etc.
  examples: { arabic: string; uzbek: string }[];
  root?: string; // o'zak
}

export const SAMPLE_DATA: DictionaryEntry[] = [
  {
    id: "1",
    arabic: "كِتَاب",
    transliteration: "Kitab",
    uzbek: "Kitob",
    arabic_definition: "صحف مجمعة بين دفتين",
    type: "ot",
    root: "k-t-b",
    examples: [
      { arabic: "قَرَأْتُ الْكِتَابَ", uzbek: "Kitobni o'qidim" },
      { arabic: "هَذَا كِتَابٌ مُفِيدٌ", uzbek: "Bu foydali kitob" }
    ]
  },
  {
    id: "2",
    arabic: "سَلَام",
    transliteration: "Salam",
    uzbek: "Tinchlik, omonlik; Salom",
    arabic_definition: "الأمان والعافية",
    type: "ot",
    root: "s-l-m",
    examples: [
      { arabic: "السَّلَامُ عَلَيْكُمْ", uzbek: "Sizga tinchlik bo'lsin (Assalomu alaykum)" }
    ]
  },
  {
    id: "3",
    arabic: "جَمِيل",
    transliteration: "Jamil",
    uzbek: "Chiroyli, go'zal",
    type: "sifat",
    root: "j-m-l",
    examples: [
      { arabic: "مَنْظَرٌ جَمِيلٌ", uzbek: "Go'zal manzara" }
    ]
  },
  {
    id: "4",
    arabic: "عِلْم",
    transliteration: "'Ilm",
    uzbek: "Ilm, bilim",
    type: "ot",
    root: "a-l-m",
    examples: [
      { arabic: "طَلَبُ الْعِلْمِ فَرِيضَةٌ", uzbek: "Ilm o'rganish farzdir" }
    ]
  },
  {
    id: "5",
    arabic: "مَدْرَسَة",
    transliteration: "Madrasa",
    uzbek: "Maktab, madrasa",
    type: "ot",
    root: "d-r-s",
    examples: [
      { arabic: "ذَهَبْتُ إِلَى الْمَدْرَسَةِ", uzbek: "Maktabga bordim" }
    ]
  },
  {
    id: "6",
    arabic: "قَلْب",
    transliteration: "Qalb",
    uzbek: "Yurak, ko'ngil",
    type: "ot",
    root: "q-l-b",
    examples: [
      { arabic: "قَلْبٌ سَلِيمٌ", uzbek: "Sog'lom qalb" }
    ]
  },
  {
    id: "7",
    arabic: "شُكْر",
    transliteration: "Shukr",
    uzbek: "Rahmat aytish, minnatdorchilik",
    type: "ot",
    root: "sh-k-r",
    examples: [
      { arabic: "الشُّكْرُ لِلَّهِ", uzbek: "Allohga shukr" }
    ]
  }
];
