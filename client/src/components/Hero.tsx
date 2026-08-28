import React from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { detectSearchScript, getSearchDirection } from "@shared/search";

interface HeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSubmit: () => void;
  totalWords?: number;
}

export function Hero({ searchTerm, setSearchTerm, onSubmit, totalWords }: HeroProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const searchScript = detectSearchScript(searchTerm);
  const isArabic = searchScript === "arabic";
  const inputDirection = getSearchDirection(searchTerm);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const clearSearch = () => {
    setSearchTerm("");
    inputRef.current?.focus();
  };

  return (
    <section className="relative overflow-hidden bg-[#173f35] text-white">
      <div className="dictionary-grid-pattern absolute inset-0 opacity-35" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-9 sm:px-6 sm:py-11 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-emerald-100/80">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
              Arabcha · O'zbekcha
            </span>
            {totalWords ? (
              <span>{totalWords.toLocaleString("uz-UZ")} ta lug'at yozuvi</span>
            ) : (
              <span>Professional e-lug'at</span>
            )}
          </div>

          <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl lg:text-[34px]">
            So'zning aniq ma'nosini toping
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-emerald-50/70 sm:text-base">
            Arabcha harakatli yoki harakatsiz, shuningdek o'zbekcha so'z bilan qidiring.
          </p>

          <form
            role="search"
            aria-label="Lug'atdan so'z qidirish"
            onSubmit={handleSubmit}
            className="mx-auto mt-6 max-w-2xl"
          >
            <div className="group relative flex min-h-16 items-center rounded-2xl bg-white p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.22)] ring-1 ring-black/5 transition focus-within:ring-4 focus-within:ring-amber-300/35">
              <Search className="ml-4 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                inputMode="search"
                enterKeyHint="search"
                dir={inputDirection}
                lang={isArabic ? "ar" : "uz"}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Arabcha yoki o'zbekcha so'z"
                aria-describedby="search-guidance"
                placeholder="Masalan: كِتَابٌ yoki kitob"
                className={`h-12 min-w-0 flex-1 bg-transparent px-3 font-medium text-slate-900 outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-slate-400 sm:placeholder:text-lg ${
                  isArabic
                    ? "font-arabic text-right text-xl leading-[1.8] sm:text-2xl"
                    : "font-sans text-left text-base sm:text-lg"
                }`}
                data-testid="input-search"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Qidiruvni tozalash"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}

              <button
                type="submit"
                aria-label="Qidirish"
                className="ml-1 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#bd7b2a] px-4 text-sm font-bold text-white transition hover:bg-[#a96b22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:px-5"
              >
                <span className="hidden sm:inline">Qidirish</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          <p id="search-guidance" className="mt-3 text-xs text-emerald-50/55" aria-live="polite">
            {isArabic
              ? "Arabcha qidiruv · harakatli va harakatsiz yozuv bir xil topiladi"
              : searchScript === "latin"
                ? "O'zbekcha qidiruv · so'z yozilishi avtomatik aniqlandi"
                : "Arabcha yoki o'zbekcha yozing · yozuv yo'nalishi avtomatik aniqlanadi"}
          </p>
        </div>
      </div>
    </section>
  );
}
