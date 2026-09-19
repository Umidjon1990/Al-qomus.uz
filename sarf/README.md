# Al-qomus Sarf

The Node application matches live dictionary senses to a pinned morphological
lexicon. Python runs Qutrub locally through a bounded JSON stdin/stdout protocol.
There are no requests to Qutrub's website and no language-model generation.

## Reproduce

```sh
python3 -m venv .sarf-venv
.sarf-venv/bin/pip install -r sarf/requirements.txt
.sarf-venv/bin/python sarf/build.py
.sarf-venv/bin/python sarf/test_engine.py
npm ci
npm run check
node --import tsx tests/sarf-expanded-audit.ts
node --import tsx tests/sarf-audit.ts
node --import tsx script/build.ts
PYTHON=.sarf-venv/bin/python npm start
```

Docker builds the SQLite reverse index and JSON catalog before building the app.
Generated outputs live under `sarf/generated/`, are deterministic except audit
elapsed time, and are not committed. No PostgreSQL migration is required.
The production container runs as the unprivileged Node user.

## Data and IDs

`data/sarf/arramooz-verbs.tsv` exports six fields from the `verbs` table of
[Arramooz-pysqlite](https://github.com/linuxscout/arramooz-pysqlite), revision
`77897b4061521ef513277b6a46c67c5a9b57ff12`:
`id, vocalized, root, future_type, triliteral, transitive`.
The original 13,942 records and their IDs are retained. Build-time duplicates
are identified by past, present, root and transitivity; conflicting variants
remain separate. Arramooz copyright Taha Zerrouki and contributors; GPL-3.0,
license retained at `data/sarf/LICENSE`.

`supplement.tsv` adds reviewed gaps without editing the upstream export:

- 20001: قَالَ / يَقِيلُ, root قيل, intransitive; Al-qomus Muasir entry 23758.
  This must not share the translation of قَالَ / يَقُولُ (Muasir 23624).

Negative API IDs identify lexicon variants. Positive IDs remain live dictionary
entry IDs and may return multiple candidates. A dictionary match requires a
compatible headword AND an imperfect in the grammatical header. Supplied vowels
cannot conflict. Definitions/examples are not scanned indiscriminately for verbs.
Unmatched lexical variants keep an empty translation. Existing sound Ghoniy entry
links retain their previously tested metadata as a fallback.

## Rules and limitations

Qutrub `libqutrub==1.2.4.1`, PyArabic `0.6.15`, six `1.17.0` are pinned.
Qutrub and PyArabic are by Taha Zerrouki and contributors and distributed under
GPL terms. This Sarf Python adapter and its modifications are provided under
GPL-2.0; see `sarf/LICENSE`. Upstream source:
https://github.com/linuxscout/qutrub and https://github.com/linuxscout/pyarabic.

Additions made for Al-qomus, September 2026:

- fixed hollow Form I imperative short vowels (خَفْ, نَمْ) using jussive stems;
- consistent shadda/combining-mark order and final nun/taa assimilation;
- light emphasis from heavy emphasis, unavailable for dual/feminine plural;
- conservative participle rules and explicit common lexical exceptions;
- JSON wrapper, reproducible catalog, and exact/partially vocalized reverse index.

The 14-person grid preserves the two masculine/feminine dual positions. Commands
use the six second-person positions. Passive is generated only for lexical
transitive variants, not inferred universally from any matching definition.

Nominals are a separate noun table (gender/number/case), not a pronoun paradigm.
Regular human sound plurals are productive forms, not claims about attested broken
plurals. Unhandled hamza inflection, lexical adjectives, and some combined weak
patterns are unavailable rather than fabricated. Form I fa'ula adjectives need
lexical data. Masdars are sourced from Ghoniy headers, not guessed.
Rare derived forms may have a generic form label. جامد verbs are excluded.
Formula mode requires vocalized past, root, imperfect vowel and transitivity, and
is explicitly conditional on user input; it does not establish lexical existence.

Reverse lookup includes all generated simple finite forms, including passive and
emphatic forms. Queries prefixed with لم / لن / لا are stripped before lookup.
Clitic-attached object pronouns and arbitrary sentence parsing are not implemented.

The UI prints the currently selected table using the browser's Print/Save as PDF
facility; it does not export a book containing every table. The full lexicon has
not undergone word-by-word scholarly review. Handwritten regressions supplement,
but do not substitute for, Arabic editorial review.

## Resource bounds

The reverse index uses SQLite prepared parameters and is opened read-only.
The Node adapter runs at most eight short Python processes simultaneously, uses
an eight-second timeout and caps each stdout response. Query/detail caches are
bounded. User input is JSON on stdin, never shell text or a command-line argument.
Original dictionary search remains available if supplementary lookup fails.

## Validation

`test_engine.py`: 30 manually specified paradigms covering six basic babs,
weak/hamzated/doubled/derived/quadriliteral examples, plus mood, nominal,
transitivity, invalid-input and reverse-lookup checks.
`tests/sarf-expanded-audit.ts`: full backup matching audit; separates the two
قَالَ senses, checks vocalization conflicts and nominal inflections.
`tests/sarf-audit.ts`: original 3,080 sound-entry regressions.
Build audit lists every excluded row and reason in `generated/audit.json`.

## Reviewed نَالَ supplement

Supplement 20002 adds نَالَ يَنَالُ (root نيل, transitive), with the
attainment/reaching sense and lexical masdars نَيْل and مَنَال. It is kept
separate from Arramooz's يَنُولُ and يَنِيلُ variants. The Uzbek gloss is
editorial; existing yanulu dictionary entry IDs are not reused.
Reference checked 2026-09-19: https://en.wiktionary.org/wiki/نال
Imperatives: نَلْ، نَالَا، نَالُوا، نَالِي، نَالَا، نَلْنَ.
