"""Text-only PDF export with Pango Arabic shaping and embedded fonts."""
import base64,json,re,sys
from html import escape
from weasyprint import HTML

def safe(text):
 return escape(text).replace('\n','<br>')

def make_pdf(d):
 sections=d.get('sections') or [d]
 if not 1<=len(sections)<=20:raise ValueError('Invalid sections')
 for part in sections:
  if not 1<=len(part['rows'])<=20 or not 2<=len(part['headers'])<=4:raise ValueError('Invalid table')
 html='''<!doctype html><html lang="uz"><meta charset="utf-8"><title>Al-Qomus — Sarf</title><style>
 @page {font-family:"DejaVu Sans",sans-serif;size:A4;margin:27mm 14mm 18mm;@top-left{content:"AL-QOMUS.UZ";color:#142d3d;font-size:15pt;font-weight:bold;}@top-right{content:"SARF / FE’L TUSLASH";color:#0f766e;font-size:8pt;}@bottom-left{content:"www.al-qomus.uz";font-size:8pt;color:#52656e;}@bottom-right{content:counter(page) " / " counter(pages);font-size:8pt;color:#52656e;}}
 section+section{break-before:page;}section{border-top:3px solid #0f766e;padding-top:9pt;}body{font-family:"DejaVu Sans",sans-serif;color:#142d3d;font-size:10pt;line-height:1.5;margin:0;}
 h1{font-size:25pt;line-height:1.7;color:#0f766e;font-weight:normal;margin:0 0 5pt;text-align:right;}
 p{margin:0 0 6pt;overflow-wrap:anywhere;} .meta{font-size:9pt;color:#52656e;}h2{font-size:14pt;color:#0f766e;margin:10pt 0 9pt;font-weight:normal;}
 table{border-collapse:collapse;width:100%;table-layout:fixed;}thead{display:table-header-group;}tr{break-inside:avoid;}th{text-align:center;background:#0f766e;color:white;font-size:9pt;font-weight:normal;padding:6pt;}td{border:0.5pt solid #d5e4de;text-align:center;padding:3pt 6pt;overflow-wrap:anywhere;}tr:nth-child(even){background:#eaf5f1;}td.ar{font-size:17pt;line-height:1.5;} .note{margin-top:10pt;font-size:8pt;color:#52656e;}
 </style><body>'''
 for index,part in enumerate(sections):
  headers=''.join('<th>'+safe(h)+'</th>' for h in part['headers'])
  rows=''.join('<tr>'+''.join('<td'+(' class="ar" dir="rtl"' if re.search('[\u0600-\u06ff]',c) else '')+'>'+safe(c)+'</td>' for c in row)+'</tr>' for row in part['rows'])
  html+='<section><h1 dir="rtl">'+safe(d['past']+' — '+d['present'])+'</h1>'
  if index==0:html+='<p>'+safe(d['meaning'] or 'Tarjima hali bog‘lanmagan.')+'</p><p class="meta">'+safe(d['classification'])+'</p>'
  html+='<h2>'+str(index+1)+'. '+safe(part['title'])+'</h2><table><thead><tr>'+headers+'</tr></thead><tbody>'+rows+'</tbody></table><p class="note">'+safe(part['note'])+'</p><p class="meta">Manba: '+safe(d['source'])+'</p></section>'
 html+='</body></html>'
 # All content is escaped text; reject every resource URL as a second boundary.
 def no_resources(url,*args,**kwargs):raise ValueError('External resources disabled')
 return HTML(string=html,url_fetcher=no_resources).write_pdf()
if __name__=='__main__':
 print(json.dumps({'pdf':base64.b64encode(make_pdf(json.load(sys.stdin))).decode('ascii')}))
