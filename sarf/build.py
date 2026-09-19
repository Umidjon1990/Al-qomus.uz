"""Reproducible catalog + exact reverse index, generated at image build time."""
import csv,hashlib,json,sqlite3,time,itertools
from pathlib import Path
from engine import generate,plain,canonical
BASE=Path(__file__).resolve().parent
OUT=BASE/'generated'
OUT.mkdir(exist_ok=True)
dbfile=OUT/'forms.sqlite'
if dbfile.exists(): dbfile.unlink()
db=sqlite3.connect(dbfile)
db.execute('PRAGMA journal_mode=OFF')
db.execute('PRAGMA synchronous=OFF')
db.execute('CREATE TABLE forms (vocalized TEXT, plain TEXT, id INTEGER)')
catalog=[]; rejected=[];seen=set();start=time.time()
source=BASE.parent/'data/sarf/arramooz-verbs.tsv'
supplement=source.with_name('supplement.tsv')
with source.open() as f, supplement.open() as extra:
    for row in itertools.chain(csv.DictReader(f,delimiter='\t'),csv.DictReader(extra,delimiter='\t')):
        try:
            root=row['root']; transitive=row['transitive']=='1';tri=row['triliteral']=='1'
            result=generate(row['past'],row['futureType'],root,tri,transitive)
            # Refuse engine normalization that changes supplied short vowels or letters.
            if canonical(row['past'])!=canonical(result['past']): raise ValueError('past-roundtrip')
            key=(result['past'],result['present'],root,transitive)
            if key in seen:continue
            seen.add(key)
            id=int(row['id']);t=result.pop('tables')
            catalog.append(dict(id=-id,lexicon='Al-qomus' if id>=20000 else 'Arramooz',root=root,futureType=row['futureType'],triliteral=tri,transitive=transitive,**result))
            words=set(w for cols in [t['active'],t['passive'] or [],t['command'][:1],*list(t['emphasis'].values())] if cols for col in cols for w in col if w)
            db.executemany('INSERT INTO forms VALUES(?,?,?)',[(canonical(w),plain(w),-id) for w in words])
        except Exception as exc: rejected.append({'id':row['id'],'past':row['past'],'reason':str(exc)})
        if int(row['id'])%2000==0: print('Processed',row['id'],flush=True)
db.execute('CREATE INDEX vocalized_lookup ON forms(vocalized)')
db.execute('CREATE INDEX plain_lookup ON forms(plain)')
db.commit()
summary={'input':13942,'supplements':1,'duplicates':13943-len(catalog)-len(rejected),'accepted':len(catalog),'rejected':len(rejected),'forms':db.execute('select count(*) from forms').fetchone()[0],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'seconds':round(time.time()-start,2)}
(OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')))
(OUT/'audit.json').write_text(json.dumps(dict(summary=summary,rejected=rejected),ensure_ascii=False,indent=2))
print(json.dumps(summary,ensure_ascii=False))
