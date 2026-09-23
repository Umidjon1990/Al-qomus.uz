"""Compact RTL tables, text-only input, embedded fonts and Pango shaping."""
import base64,json,re,sys
from html import escape
from weasyprint import HTML

def safe(text):return escape(text).replace('\n','<br>')

def grouped(sections):
 """Share pronouns across adjacent tables; retain every form and its order."""
 blocks=[]
 for part in sections:
  if blocks and len(blocks[-1])==1:
   first=blocks[-1][0]
   if first['headers'][0]==part['headers'][0]=='Zamir' and [r[0] for r in first['rows']]==[r[0] for r in part['rows']] and len(first['headers'])+len(part['headers'])-1<=5:
    blocks[-1].append(part);continue
  blocks.append([part])
 return blocks

def render_block(parts):
 first=parts[0];n=1+sum(len(p['headers'])-1 for p in parts)
 heading='<th rowspan="2" class="person">'+safe(first['headers'][0])+'</th>'
 heading+=''.join('<th colspan="'+str(len(p['headers'])-1)+'">'+safe(p['title'])+'</th>' for p in parts)
 sub=''.join('<th>'+safe(h)+'</th>' for p in parts for h in p['headers'][1:])
 rows=[]
 for i,row in enumerate(first['rows']):
  cells=[row[0]]+[c for p in parts for c in p['rows'][i][1:]]
  rows.append('<tr>'+''.join('<td class="'+('ar' if re.search('[\u0600-\u06ff]',c) else 'latin')+'">'+safe(c)+'</td>' for c in cells)+'</tr>')
 cols='<col style="width:20%">'+('<col style="width:'+str(80/(n-1))+'%">')*(n-1)
 return '<section><table dir="rtl"><colgroup>'+cols+'</colgroup><thead><tr>'+heading+'</tr><tr>'+sub+'</tr></thead><tbody>'+''.join(rows)+'</tbody></table></section>'

def make_pdf(d):
 sections=d.get('sections') or [d]
 if not 1<=len(sections)<=20:raise ValueError('Invalid sections')
 for p in sections:
  if not 1<=len(p['rows'])<=20 or not 2<=len(p['headers'])<=4:raise ValueError('Invalid table')
 html='''<!doctype html><html lang="uz"><meta charset="utf-8"><title>Al-Qomus — Sarf</title><style>
 @page {font-family:"Times New Roman","Liberation Serif",serif;size:A4;margin:17mm 11mm 15mm;@top-left{content:"AL-QOMUS.UZ";color:#142d3d;font-size:10pt;font-weight:bold;}@top-right{content:"SARF / FE’L TUSLASH";color:#0f766e;font-size:8pt;}@bottom-left{content:"www.al-qomus.uz";font-size:8pt;color:#52656e;}@bottom-right{content:counter(page) " / " counter(pages);font-size:8pt;color:#52656e;}}
 body{font-family:"Times New Roman","Liberation Serif","Amiri",serif;color:#142d3d;font-size:9pt;line-height:1.2;margin:0;}
 .intro{border-top:2px solid #0f766e;padding-top:3pt;margin-bottom:6pt;}h1{font-family:"Noto Naskh Arabic","DejaVu Sans",sans-serif;font-size:20pt;line-height:normal;color:#0f766e;font-weight:normal;margin:0 0 3pt;text-align:right;}
 p{margin:0 0 3pt;overflow-wrap:anywhere;}.meta,.notes{font-size:8pt;color:#52656e;}.notes{margin-top:5pt;}
 section{margin:0 0 7pt;}table{border-collapse:collapse;width:100%;table-layout:fixed;}thead{display:table-header-group;}tr{break-inside:avoid;}th{text-align:center;background:#0f766e;color:white;font-size:9pt;line-height:1.2;font-weight:normal;padding:3pt 2pt;border:0.4pt solid #c5dcd5;direction:ltr;}thead tr+tr th{background:#eaf5f1;color:#142d3d;}
 td{vertical-align:middle;border:0.4pt solid #c5dcd5;text-align:center;padding:0.8pt 2pt;overflow-wrap:anywhere;}tbody tr:nth-child(even){background:#f1f7f4;}td.ar{font-family:"Noto Naskh Arabic","DejaVu Sans",sans-serif;font-size:14pt;line-height:normal;direction:rtl;}td.latin{font-size:9pt;direction:ltr;line-height:1.2;}
 </style><body>'''
 html+='<div class="intro"><h1 dir="rtl">'+safe(d['past']+' — '+d['present'])+'</h1><p>'+safe(d['meaning'] or 'Tarjima hali bog‘lanmagan.')+'</p><p class="meta">'+safe(d['classification'])+' · Manba: '+safe(d['source'])+'</p></div>'
 blocks=grouped(sections)
 html+=''.join(render_block(b) for b in blocks[:-1])
 notes=list(dict.fromkeys(p['note'] for p in sections if p['note']))
 html+='<div style="break-inside:avoid">'+render_block(blocks[-1])+'<div class="notes">'+''.join('<p>'+safe(n)+'</p>' for n in notes)+'</div></div></body></html>'
 def no_resources(url,*args,**kwargs):raise ValueError('External resources disabled')
 return HTML(string=html,url_fetcher=no_resources).write_pdf()
if __name__=='__main__':print(json.dumps({'pdf':base64.b64encode(make_pdf(json.load(sys.stdin))).decode('ascii')}))
