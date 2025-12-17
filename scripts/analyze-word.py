#!/usr/bin/env python3
import sys
import json
from qalsadi.analex import Analex

def analyze_word(word):
    analyzer = Analex()
    results = analyzer.check_word(word)
    
    if not results:
        return []
    
    analyses = []
    seen = set()
    
    for r in results:
        lemma = r.get('lemma', '')
        root = r.get('root', '')
        original = r.get('original', '')
        
        key = f"{lemma}|{root}"
        if key in seen:
            continue
        seen.add(key)
        
        analysis = {
            'lemma': lemma,
            'root': root,
            'original': original,
            'vocalized': r.get('vocalized', ''),
            'procletic': r.get('procletic', ''),
            'prefix': r.get('prefix', ''),
            'stem': r.get('stem', ''),
            'suffix': r.get('suffix', ''),
            'encletic': r.get('encletic', ''),
            'type': r.get('type', ''),
            'action': r.get('action', ''),
        }
        analyses.append(analysis)
    
    return analyses[:10]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No word provided"}))
        sys.exit(1)
    
    word = sys.argv[1]
    result = analyze_word(word)
    print(json.dumps(result, ensure_ascii=False))
