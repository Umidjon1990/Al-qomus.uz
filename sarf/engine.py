"""JSON-only adapter around the pinned Qutrub engine. No network or shell commands."""
import json
import re
import sys
import unicodedata
from libqutrub.conjugator import conjugate
from libqutrub.classverb import VerbClass
from libqutrub import verb_const as C

PERSONS = ['هو','هما','هم','هي','هما مؤ','هن','أنت','أنتما','أنتم','أنتِ','أنتما مؤ','أنتن','أنا','نحن']
MARKS = {'فتحة':'َ','ضمة':'ُ','كسرة':'ِ'}
JAMID = {'لَيْسَ','نِعْمَ','بِئْسَ','عَسَى'}

def plain(word):
    return re.sub('[\u064b-\u065f\u0670ـ]', '', unicodedata.normalize('NFC', word))

def canonical(word):
    return re.sub('([ً-ِْ])ّ', r'ّ\1', unicodedata.normalize('NFC', word)).replace('تْت','تّ').replace('نْن','نّ')

def classify(past, root, triliteral):
    p = plain(past)
    if triliteral:
        form = 'I'
    elif len(root) == 4:
        form = 'Q-II' if p.startswith('ت') else 'Q-I' if len(p) == 4 else 'Q-derived'
    elif p.startswith('است'):
        form = 'X'
    elif p.startswith('ان'):
        form = 'VII'
    elif p.startswith('ت') and 'ّ' in past:
        form = 'V'
    elif p.startswith('ت') and len(p) > 2 and p[2] == 'ا':
        form = 'VI'
    elif p.startswith('آ'):
        form = 'derived'  # Madda may hide different augmented templates.
    elif p.startswith('أ'):
        form = 'IV'
    elif p.startswith('ا') and len(p) > 2 and (p[2] == 'ت' or 'ّ' in past[:-2]):
        form = 'VIII'
    elif p.startswith('ا') and 'ّ' in past:
        form = 'IX'
    elif len(p) == 4 and p[1] == 'ا':
        form = 'III'
    elif 'ّ' in past and len(p) == 3:
        form = 'II'
    else:
        form = 'derived'
    types = []
    r = root.replace('أ','ء').replace('إ','ء').replace('ؤ','ء').replace('ئ','ء')
    if 'ء' in r: types.append('Mahmuz')
    if len(r) == 3:
        weak = [i for i, x in enumerate(r) if x in 'وي']
        if len(weak) >= 2:
            types.append('Lafif mafruq' if weak == [0,2] else 'Lafif maqrun')
        elif weak == [0]: types.append('Misol voviy' if r[0] == 'و' else 'Misol yoyiy')
        elif weak == [1]: types.append('Ajvaf voviy' if r[1] == 'و' else 'Ajvaf yoyiy')
        elif weak == [2]: types.append('Noqis voviy' if r[2] == 'و' else 'Noqis yoyiy')
        if r[1] == r[2]: types.append('Mudaaf')
    elif len(r) == 4 and r[:2] == r[2:]: types.append('Mudaaf ruboiy')
    return form, ' · '.join(types) or 'Solim'

def light(words):
    # Light nun does not attach to duals or the feminine plural.
    return [re.sub('نَّ$', 'نْ', word) if i not in (1,4,5,7,10,11) and word.endswith('نَّ') else '' for i,word in enumerate(words)]

def nouns(past, root, form, tables, transitive):
    """Conservative nominal rules. Unhandled hamza/weak combinations stay unavailable."""
    subj = obj = None
    if form != 'I' and form not in ('derived','Q-derived'):
        def derive(word, active):
            gs = re.findall('[ء-ي][ً-ْ]*',word)
            if not gs: return None
            gs[0] = 'مُ'
            if active and form in ('V','VI'):
                if len(gs)<2: return None
                gs[-2] = re.sub('[َُ]', 'ِ', gs[-2])
            result = ''.join(gs)
            if result.endswith('ِي'): return result[:-2]+'ٍ'
            if result.endswith('َى') or result.endswith('َا'): return result[:-2]+'ًى'
            if result.endswith('ُ'): return result[:-1]+'ٌ'
            return None
        subj = derive(tables['active'][1][0], True)
        if transitive and tables['passive']:
            obj = derive(tables['passive'][1][0], False)
    elif form == 'I' and len(root)==3:
        a,b,c = root
        p = plain(past)
        if not any(x in root for x in 'ءأإؤئ'):
            if len(p)==3 and p[1]=='ا':
                subj = a+'َائِ'+c+'ٌ'
                if b in 'وي': obj = 'مَ'+a+('ُو' if b=='و' else 'ِي')+c+'ٌ'
            elif c in 'وي' and p[-1] in 'اىي':
                subj = a+'َا'+b+'ٍ'
                obj = 'مَ'+a+'ْ'+b+('ُوٌّ' if c=='و' and p[-1]!='ي' else 'ِيٌّ')
            else:
                subj = a+'َا'+b+'ِ'+c+'ٌ'
                if b==c: subj=a+'َا'+b+'ٌّ'
                obj='مَ'+a+'ْ'+b+'ُو'+c+'ٌ'
    # Lexical exceptions and hamza spellings, kept explicit and regression-tested.
    known = {
      'أَخَذَ':('آخِذٌ','مَأْخُوذٌ'), 'أَكَلَ':('آكِلٌ','مَأْكُولٌ'),
      'قَرَأَ':('قَارِئٌ','مَقْرُوءٌ'), 'سَأَلَ':('سَائِلٌ','مَسْؤُولٌ'),
      'رَأَى':('رَاءٍ','مَرْئِيٌّ'), 'وَقَى':('وَاقٍ','مَوْقِيٌّ'),
      'طَوَى':('طَاوٍ','مَطْوِيٌّ'), 'حَيِيَ':('حَيٌّ',None),
      'كَرُمَ':('كَرِيمٌ',None), 'حَسُنَ':('حَسَنٌ',None),
    }
    if canonical(past) in {canonical(k) for k in known}:
        subj,obj=next(v for k,v in known.items() if canonical(k)==canonical(past))
    # Fa'ula normally requires a lexical adjective; do not label a fabricated fa'il.
    gs = re.findall('[ء-ي][ً-ْ]*',past)
    adjective = form=='I' and len(gs)==3 and 'ُ' in gs[1]
    if adjective and past not in known: subj = None
    return {'subject':subj, 'object':obj if transitive else None,
            'subjectLabel':'Sifati mushabbaha' if adjective or past=='حَيِيَ' else 'Ismi foil',
            'note':'Shakllar birlik, muzakkar, noaniq raf’ holatida. Lug‘aviy sifatlar va ayrim istisnolar uchun alohida ma’lumot kerak.'}

def generate(past, future_type, root='', triliteral=False, transitive=False):
    if canonical(past) in {canonical(w) for w in JAMID}: raise ValueError('Jomid fe’l uchun alohida jadval kerak')
    if not re.fullmatch('[ء-يً-ْ]{3,30}',past): raise ValueError('Fe’l yozilishi noto‘g‘ri')
    if future_type not in MARKS: raise ValueError('Muzori’ harakati kerak')
    if (VerbClass(past,transitive,MARKS[future_type]).vlength==3)!=triliteral: raise ValueError('Sulosiy mujarrad belgisi vaznga mos emas')
    raw=conjugate(past,future_type,transitive=transitive,display_format='DICT')
    if not isinstance(raw,dict): raise ValueError('Bu vazn qo‘llanmaydi')
    def col(key): return [canonical(raw.get(key,{}).get(p,'')) for p in PERSONS]
    active=[col(k) for k in [C.TensePast,C.TenseFuture,C.TenseSubjunctiveFuture,C.TenseJussiveFuture]]
    passive=[col(k) for k in [C.TensePassivePast,C.TensePassiveFuture,C.TensePassiveSubjunctiveFuture,C.TensePassiveJussiveFuture]] if transitive else None
    if any(not w for column in active for w in column): raise ValueError('To‘liq jadval olinmadi')
    heavy=col(C.TenseConfirmedFuture)
    command=col(C.TenseImperative)
    heavy_command=col(C.TenseConfirmedImperative)
    # Qutrub 1.2.4.1 incorrectly carries the past short vowel into خاف/نام
    # imperatives. A hollow Form I command is its jussive without the prefix.
    p=plain(past)
    if triliteral and len(p)==3 and p[1]=='ا':
        for i in range(6,12):
            command[i]=re.sub('^ت[َُِ]', '', active[3][i])
            heavy_command[i]=re.sub('^ت[َُِ]', '', heavy[i])
    tables={'active':active,'passive':passive,'command':[command,['لَا '+w if 6<=i<=11 else '' for i,w in enumerate(active[3])]],
      'emphasis':{'active':[heavy,light(heavy)],'passive':[col(C.TensePassiveConfirmedFuture),light(col(C.TensePassiveConfirmedFuture))] if transitive else None,'command':[heavy_command,light(heavy_command)]}}
    form,kind=classify(active[0][0],root,triliteral)
    tables['nominals']=nouns(active[0][0],root,form,tables,transitive)
    return {'past':active[0][0],'present':active[1][0],'form':form,'kind':kind,'tables':tables}

if __name__=='__main__':
    try:
        request=json.load(sys.stdin)
        result=generate(request['past'],request['futureType'],request.get('root',''),request.get('triliteral',False),request.get('transitive',False))
        print(json.dumps(result,ensure_ascii=False))
    except (ValueError,KeyError,TypeError) as exc:
        print(json.dumps({'error':str(exc)},ensure_ascii=False));sys.exit(1)
