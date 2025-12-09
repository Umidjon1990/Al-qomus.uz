import React from "react";

interface DefinitionFormatterProps {
  definition: string;
  className?: string;
}

interface ParsedMeaning {
  number?: string;
  mainText: string;
  examples: string[];
  isGrammar?: boolean;
  grammarInfo?: string;
}

function parseArabicDefinition(definition: string): ParsedMeaning[] {
  if (!definition) return [];
  
  const meanings: ParsedMeaning[] = [];
  
  const cleanedDef = definition
    .replace(/\|/g, '\n')
    .replace(/•/g, '\n•');
  
  const parts = cleanedDef.split(/(?=\d+[-–—\s]*[-–—])|(?=•)/);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    const numberMatch = trimmed.match(/^(\d+)[-–—\s]*[-–—]?\s*/);
    const bulletMatch = trimmed.match(/^•\s*/);
    
    let mainPart = trimmed;
    let number: string | undefined;
    let isGrammar = false;
    let grammarInfo: string | undefined;
    
    if (numberMatch) {
      number = numberMatch[1];
      mainPart = trimmed.slice(numberMatch[0].length);
    } else if (bulletMatch) {
      mainPart = trimmed.slice(bulletMatch[0].length);
      isGrammar = true;
    }
    
    const grammarMatch = mainPart.match(/^\(([^)]+)\)\s*/);
    if (grammarMatch) {
      grammarInfo = grammarMatch[1];
      mainPart = mainPart.slice(grammarMatch[0].length);
    }
    
    const exampleSplit = mainPart.split(/:-|:\s*-/);
    const mainText = exampleSplit[0].trim();
    const examples: string[] = [];
    
    for (let i = 1; i < exampleSplit.length; i++) {
      const ex = exampleSplit[i].trim();
      if (ex) {
        const subExamples = ex.split(/[،,]/);
        for (const subEx of subExamples) {
          const cleaned = subEx.trim().replace(/[-،,]$/, '').trim();
          if (cleaned && cleaned.length > 1) {
            examples.push(cleaned);
          }
        }
      }
    }
    
    if (mainText) {
      meanings.push({
        number,
        mainText,
        examples: examples.slice(0, 5),
        isGrammar,
        grammarInfo,
      });
    }
  }
  
  if (meanings.length === 0 && definition.trim()) {
    const exampleSplit = definition.split(/:-|:\s*-/);
    const mainText = exampleSplit[0].trim();
    const examples: string[] = [];
    
    for (let i = 1; i < exampleSplit.length; i++) {
      const ex = exampleSplit[i].trim();
      if (ex) examples.push(ex);
    }
    
    meanings.push({
      mainText,
      examples: examples.slice(0, 5),
    });
  }
  
  return meanings;
}

const meaningColors = [
  { border: "border-blue-500", bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  { border: "border-purple-500", bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" },
  { border: "border-rose-500", bg: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { border: "border-orange-500", bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  { border: "border-teal-500", bg: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" },
  { border: "border-indigo-500", bg: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" },
];

export function DefinitionFormatter({ definition, className = "" }: DefinitionFormatterProps) {
  const meanings = parseArabicDefinition(definition);
  
  if (meanings.length === 0) {
    return (
      <p className={`font-arabic text-right text-lg leading-relaxed text-foreground/90 ${className}`} dir="rtl">
        {definition}
      </p>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      {meanings.map((meaning, idx) => {
        const colorScheme = meaningColors[idx % meaningColors.length];
        
        return (
          <div 
            key={idx} 
            className={`border-r-4 ${colorScheme.border} pr-4 py-2 bg-gradient-to-l from-white/50 to-transparent dark:from-gray-800/30 rounded-l-lg`}
          >
            <div className="flex items-start gap-3">
              {meaning.number && (
                <span className={`inline-flex items-center justify-center min-w-[28px] h-7 rounded-full ${colorScheme.bg} text-white text-sm font-bold shadow-md`}>
                  {meaning.number}
                </span>
              )}
              {meaning.isGrammar && !meaning.number && (
                <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-full bg-gray-500 text-white text-sm font-bold shadow-md">
                  ●
                </span>
              )}
              
              <div className="flex-1">
                {meaning.grammarInfo && (
                  <span className="inline-block px-2 py-0.5 mb-1 text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-full">
                    {meaning.grammarInfo}
                  </span>
                )}
                <p className={`font-arabic text-lg leading-relaxed ${colorScheme.text} font-semibold`}>
                  {meaning.mainText}
                </p>
              </div>
            </div>
            
            {meaning.examples.length > 0 && (
              <div className="mt-3 mr-10 space-y-2">
                {meaning.examples.map((example, exIdx) => (
                  <div 
                    key={exIdx} 
                    className="flex items-center gap-2 pr-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-r-2 border-emerald-500"
                  >
                    <span className="text-emerald-500 text-lg">◆</span>
                    <p className="font-arabic text-base text-emerald-700 dark:text-emerald-400 leading-relaxed">
                      {example}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
