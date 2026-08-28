import React from "react";

interface DefinitionFormatterProps {
  definition: string;
  className?: string;
}

interface ParsedMeaning {
  number?: string;
  mainText: string;
  examples: string[];
  grammarInfo?: string;
}

function parseArabicDefinition(definition: string): ParsedMeaning[] {
  if (!definition.trim()) return [];

  const cleaned = definition.replace(/\|/g, "\n").replace(/•/g, "\n•");
  const parts = cleaned.split(/(?=\d+\s*[-–—.])|(?=•)/);
  const meanings: ParsedMeaning[] = [];

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    const numberMatch = part.match(/^(\d+)\s*[-–—.]?\s*/);
    const bulletMatch = part.match(/^•\s*/);
    let text = part;
    let number: string | undefined;

    if (numberMatch) {
      number = numberMatch[1];
      text = part.slice(numberMatch[0].length);
    } else if (bulletMatch) {
      text = part.slice(bulletMatch[0].length);
    }

    const grammarMatch = text.match(/^\(([^)]+)\)\s*/);
    const grammarInfo = grammarMatch?.[1];
    if (grammarMatch) text = text.slice(grammarMatch[0].length);

    const [mainText, ...exampleParts] = text.split(/:-|:\s*-/);
    const examples = exampleParts
      .flatMap((example) => example.split(/[،,]/))
      .map((example) => example.trim().replace(/[-،,]$/, "").trim())
      .filter((example) => example.length > 1)
      .slice(0, 5);

    if (mainText.trim()) {
      meanings.push({
        number,
        mainText: mainText.trim(),
        examples,
        grammarInfo,
      });
    }
  }

  if (meanings.length === 0) {
    meanings.push({ mainText: definition.trim(), examples: [] });
  }

  return meanings;
}

export function DefinitionFormatter({ definition, className = "" }: DefinitionFormatterProps) {
  const meanings = parseArabicDefinition(definition);

  return (
    <div className={`space-y-3 ${className}`} dir="rtl" lang="ar">
      {meanings.map((meaning, index) => (
        <div
          key={`${meaning.number ?? "meaning"}-${index}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3.5"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-primary/10 px-1 text-xs font-bold text-primary">
              {meaning.number ?? index + 1}
            </span>
            <div className="min-w-0 flex-1">
              {meaning.grammarInfo && (
                <span className="mb-1.5 inline-flex rounded-md bg-slate-100 px-2 py-1 font-sans text-[11px] font-semibold text-slate-500">
                  {meaning.grammarInfo}
                </span>
              )}
              <p className="font-arabic text-[18px] leading-[2] text-slate-800">
                {meaning.mainText}
              </p>
            </div>
          </div>

          {meaning.examples.length > 0 && (
            <div className="mr-10 mt-3 space-y-2 border-r-2 border-primary/20 pr-3">
              {meaning.examples.map((example, exampleIndex) => (
                <p key={exampleIndex} className="font-arabic text-base leading-8 text-slate-600">
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
