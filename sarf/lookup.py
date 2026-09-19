import json,sqlite3,sys,re
from pathlib import Path
from engine import canonical,plain
q=json.load(sys.stdin)['query']
con=sqlite3.connect('file:'+str(Path(__file__).resolve().parent/'generated/forms.sqlite')+'?mode=ro',uri=True)
exact=[r[0] for r in con.execute('SELECT DISTINCT id FROM forms WHERE vocalized=? LIMIT 201',(canonical(q),))]
def compatible(a,b):
    x=re.findall('[ء-ي][ً-ْ]*',canonical(a));y=re.findall('[ء-ي][ً-ْ]*',canonical(b))
    return len(x)==len(y) and all(p[0]==t[0] and all(mark in t for mark in p[1:]) for p,t in zip(x,y))
ids=exact or list(dict.fromkeys(r[1] for r in con.execute('SELECT vocalized,id FROM forms WHERE plain=?',(plain(q),)) if compatible(q,r[0])))[:201]
print(json.dumps({'ids':ids,'exact':bool(exact)}))
