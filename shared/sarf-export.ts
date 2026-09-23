import { z } from 'zod';
export const sarfExportSchema=z.object({
 past:z.string().min(1).max(40),present:z.string().min(1).max(40),
 meaning:z.string().max(5000),classification:z.string().max(160),
 title:z.string().min(1).max(160),source:z.string().max(240),
 headers:z.array(z.string().max(80)).min(2).max(4),
 rows:z.array(z.array(z.string().max(160)).min(2).max(4)).min(1).max(20),
 note:z.string().max(800),
}).refine(d=>d.rows.every(row=>row.length===d.headers.length),'Jadval ustunlari mos emas');
export type SarfExport=z.infer<typeof sarfExportSchema>;
export function exportText(d:SarfExport){return [d.past+' — '+d.present,d.meaning,d.classification,d.title,d.headers.join('\t'),...d.rows.map(r=>r.join('\t')),d.note,'Manba: '+d.source,'https://www.al-qomus.uz'].filter(Boolean).join('\n');}
