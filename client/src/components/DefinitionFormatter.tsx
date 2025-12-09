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
    
    if (numberMatch) {
      number = numberMatch[1];
      mainPart = trimmed.slice(numberMatch[0].length);
    } else if (bulletMatch) {
      mainPart = trimmed.slice(bulletMatch[0].length);
      isGrammar = true;
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
    <div className={`space-y-3 ${className}`} dir="rtl">
      {meanings.map((meaning, idx) => (
        <div key={idx} className="border-r-4 border-primary/40 pr-3 py-1">
          <div className="flex items-start gap-2">
            {meaning.number && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                {meaning.number}
              </span>
            )}
            {meaning.isGrammar && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex-shrink-0">
                •
              </span>
            )}
            <p className="font-arabic text-lg leading-relaxed text-foreground font-medium flex-1">
              {meaning.mainText}
            </p>
          </div>
          
          {meaning.examples.length > 0 && (
            <div className="mt-2 mr-8 space-y-1">
              {meaning.examples.map((example, exIdx) => (
                <p 
                  key={exIdx} 
                  className="font-arabic text-base text-emerald-700 dark:text-emerald-400 leading-relaxed pr-2 border-r-2 border-emerald-400/50"
                >
                  {example}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SimpleDefinitionFormatter({ definition, className = "" }: DefinitionFormatterProps) {
  if (!definition) return null;
  
  const parts = definition.split(/\d+[-–—]\s*/);
  const numberedParts: { num: number; text: string }[] = [];
  
  const matches = definition.match(/\d+[-–—]\s*[^0-9]+/g);
  if (matches && matches.length > 1) {
    matches.forEach((match, idx) => {
      const numMatch = match.match(/^(\d+)/);
      const text = match.replace(/^\d+[-–—]\s*/, '').trim();
      if (text) {
        numberedParts.push({ num: numMatch ? parseInt(numMatch[1]) : idx + 1, text });
      }
    });
    
    return (
      <div className={`space-y-2 ${className}`} dir="rtl">
        {numberedParts.map((part, idx) => (
          <div key={idx} className="flex items-start gap-2 border-r-3 border-amber-500/50 pr-2 py-1">
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-amber-500 text-white text-sm font-bold">
              {part.num}
            </span>
            <p className="font-arabic text-lg leading-relaxed text-foreground/90">
              {part.text}
            </p>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <p className={`font-arabic text-right text-lg leading-relaxed text-foreground/90 ${className}`} dir="rtl">
      {definition}
    </p>
  );
}
