import React from "react";
import { FlaskConical, Layers, GitBranch } from "lucide-react";
import type { WordAnalysis } from "@/lib/api";

interface AnalysisResultCardProps {
  analyses: WordAnalysis[];
  word: string;
}

export function AnalysisResultCard({ analyses, word }: AnalysisResultCardProps) {
  if (!analyses || analyses.length === 0) {
    return null;
  }

  const roots = [...new Set(analyses.map(a => a.root).filter(Boolean))];

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 overflow-hidden">
      <div className="bg-violet-600 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6" />
          <div>
            <h3 className="text-2xl font-arabic font-bold" dir="rtl">{word}</h3>
            <p className="text-violet-200 text-sm">Morfologik tahlil natijalari</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {roots.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-violet-200">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="h-5 w-5 text-violet-600" />
              <span className="font-semibold text-violet-800">Ildiz (الجذر)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {roots.map((root, idx) => (
                <span 
                  key={idx}
                  className="px-4 py-2 bg-violet-100 text-violet-800 rounded-full font-arabic text-xl font-bold"
                  dir="rtl"
                >
                  {root}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-violet-600" />
          <span className="font-semibold text-violet-800">Tahlil natijalari ({analyses.length} ta)</span>
        </div>

        <div className="space-y-3">
          {analyses.map((analysis, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-lg border border-violet-100 p-4"
            >
              <div className="flex flex-wrap gap-4">
                {analysis.lemma && (
                  <div className="flex flex-col">
                    <span className="text-xs text-violet-500 mb-1">Lemma</span>
                    <span className="font-arabic text-lg font-semibold text-violet-900" dir="rtl">
                      {analysis.lemma}
                    </span>
                  </div>
                )}
                
                {analysis.original && analysis.original !== analysis.lemma && (
                  <div className="flex flex-col">
                    <span className="text-xs text-violet-500 mb-1">Original</span>
                    <span className="font-arabic text-lg text-violet-700" dir="rtl">
                      {analysis.original}
                    </span>
                  </div>
                )}

                {analysis.vocalized && (
                  <div className="flex flex-col">
                    <span className="text-xs text-violet-500 mb-1">Harakatli</span>
                    <span className="font-arabic text-lg text-violet-700" dir="rtl">
                      {analysis.vocalized}
                    </span>
                  </div>
                )}
              </div>

              {(analysis.procletic || analysis.prefix || analysis.stem || analysis.suffix || analysis.encletic) && (
                <div className="mt-3 pt-3 border-t border-violet-100">
                  <span className="text-xs text-violet-500 mb-2 block">Morfologik tuzilish:</span>
                  <div className="flex flex-wrap gap-2" dir="rtl">
                    {analysis.procletic && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-arabic">
                        {analysis.procletic}
                        <span className="text-xs text-blue-500 mr-1">(procletic)</span>
                      </span>
                    )}
                    {analysis.prefix && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-arabic">
                        {analysis.prefix}
                        <span className="text-xs text-green-500 mr-1">(prefix)</span>
                      </span>
                    )}
                    {analysis.stem && (
                      <span className="px-2 py-1 bg-violet-200 text-violet-800 rounded text-sm font-arabic font-bold">
                        {analysis.stem}
                        <span className="text-xs text-violet-500 mr-1">(stem)</span>
                      </span>
                    )}
                    {analysis.suffix && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-arabic">
                        {analysis.suffix}
                        <span className="text-xs text-orange-500 mr-1">(suffix)</span>
                      </span>
                    )}
                    {analysis.encletic && (
                      <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-sm font-arabic">
                        {analysis.encletic}
                        <span className="text-xs text-pink-500 mr-1">(encletic)</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
