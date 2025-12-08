import React from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SAMPLE_DATA, DictionaryEntry } from "@/lib/mockData";
import { Edit2, Plus, Save, Trash2, Upload, AlertCircle, Wand2, Loader2, Database, CheckCircle2, Clock, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const [entries, setEntries] = React.useState<DictionaryEntry[]>(SAMPLE_DATA);
  const [editingEntry, setEditingEntry] = React.useState<DictionaryEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Stats
  const totalWords = entries.length;
  const translatedWords = entries.filter(e => e.uzbek && e.uzbek.length > 0).length;
  const pendingWords = totalWords - translatedWords;
  const progressPercentage = Math.round((translatedWords / totalWords) * 100) || 0;

  // Mock function to simulate saving
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const updatedEntries = entries.map(entry => 
      entry.id === editingEntry.id ? editingEntry : entry
    );
    
    if (!entries.find(e => e.id === editingEntry.id)) {
      setEntries([editingEntry, ...entries]);
    } else {
      setEntries(updatedEntries);
    }
    
    setIsDialogOpen(false);
    toast({
      title: "Saqlandi",
      description: "O'zgarishlar muvaffaqiyatli saqlandi",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Analyze format
        const hasWord = data.some((row: any) => 'word' in row);
        
        if (!hasWord) {
          toast({
            variant: "destructive",
            title: "Format noto'g'ri",
            description: "Excel faylda 'word' ustuni bo'lishi shart.",
          });
          return;
        }

        const newEntries: DictionaryEntry[] = data.map((row: any, index: number) => ({
          id: `import-${Date.now()}-${index}`,
          arabic: row.word || "",
          arabic_definition: row.meaning || "", 
          uzbek: "", 
          transliteration: "", 
          type: "aniqlanmagan",
          examples: [],
          root: ""
        }));

        setEntries(prev => [...newEntries, ...prev]);
        
        toast({
          title: "Baza yuklandi",
          description: `${newEntries.length} ta yangi so'z tizimga kiritildi.`,
          variant: "default",
        });

      } catch (error) {
        console.error("Error reading file:", error);
        toast({
          variant: "destructive",
          title: "Xatolik",
          description: "Faylni o'qishda xatolik yuz berdi",
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleBatchTranslate = () => {
    if (pendingWords === 0) {
      toast({ description: "Tarjima qilinmagan so'zlar yo'q." });
      return;
    }

    setIsTranslating(true);
    toast({
      title: "Global Tarjima Jarayoni",
      description: "AI barcha so'zlarni tahlil qilmoqda...",
    });

    setTimeout(() => {
      const updatedEntries = entries.map(entry => {
        if (!entry.uzbek) {
          let mockTranslation = "";
          // Simple mock logic
          if (entry.arabic.includes("استمارة")) mockTranslation = "Anketa; ma'lumotnoma varaqasi";
          else if (entry.arabic.includes("استوديو")) mockTranslation = "Studiya; tasvirga olish xonasi";
          else if (entry.arabic.includes("الآن")) mockTranslation = "Hozir; ayni paytda";
          else if (entry.arabic.includes("الله")) mockTranslation = "Alloh (Xudo)";
          else if (entry.arabic.includes("كِتَاب")) mockTranslation = "Kitob";
          else mockTranslation = "AI: " + (entry.arabic_definition ? entry.arabic_definition.substring(0, 30) + "..." : "...");
          
          return { ...entry, uzbek: mockTranslation, type: "aniqlandi (AI)" };
        }
        return entry;
      });

      setEntries(updatedEntries);
      setIsTranslating(false);
      toast({
        title: "Jarayon yakunlandi",
        description: "Barcha so'zlar tarjima qilindi va bazaga tayyorlandi.",
        variant: "default",
      });
    }, 3000);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-serif text-primary">Boshqaruv Paneli</h1>
          <p className="text-muted-foreground">Loyiha holati va ma'lumotlar bazasi statistikasi</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription>Jami So'zlar</CardDescription>
              <CardTitle className="text-4xl text-primary">{totalWords}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Database className="h-4 w-4" />
                Bazadagi umumiy hajm
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardDescription>Tarjima Qilingan</CardDescription>
              <CardTitle className="text-4xl text-green-700 dark:text-green-500">{translatedWords}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-green-700/80 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Nashrga tayyor
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardDescription>Kutilmoqda</CardDescription>
              <CardTitle className="text-4xl text-amber-700 dark:text-amber-500">{pendingWords}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-amber-700/80 dark:text-amber-400 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Tarjima qilinishi kerak
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-center p-6 border-dashed border-2">
             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
            <Button className="w-full h-full text-lg gap-2" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-5 w-5" />
              Excel Yuklash
            </Button>
          </Card>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
               <Wand2 className="h-5 w-5 text-primary" />
             </div>
             <div>
               <h3 className="font-semibold">Avtomatik Tarjima (AI)</h3>
               <p className="text-sm text-muted-foreground">Barcha kutilayotgan so'zlarni bir vaqtda tarjima qilish</p>
             </div>
          </div>
          <Button 
            size="lg" 
            onClick={handleBatchTranslate}
            disabled={isTranslating || pendingWords === 0}
            className="bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-700 text-white shadow-md transition-all"
          >
            {isTranslating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Jarayon ketmoqda...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Tarjimani Boshlash
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {totalWords > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Bajarilish darajasi</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-out" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              So'zlar Ro'yxati
            </h3>
            <Button size="sm" variant="outline" onClick={() => {
               setEditingEntry({
                id: Math.random().toString(),
                arabic: "",
                uzbek: "",
                type: "ot",
                examples: [],
                transliteration: ""
              });
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-1" />
              Yangi qo'shish
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-arabic text-right w-[15%]">Arabcha</TableHead>
                <TableHead className="w-[35%]">Manba (Arabcha Izoh)</TableHead>
                <TableHead className="w-[30%]">Tarjima (O'zbekcha)</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.slice(0, 50).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-arabic text-lg font-medium text-right" dir="rtl">{entry.arabic}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="line-clamp-2 font-arabic text-right" dir="rtl" title={entry.arabic_definition}>
                      {entry.arabic_definition || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                     {entry.uzbek ? (
                       <span className="text-foreground">{entry.uzbek}</span>
                     ) : (
                       <span className="text-amber-500 italic text-xs flex items-center gap-1">
                         <Clock className="h-3 w-3" /> Tarjima kutilmoqda
                       </span>
                     )}
                  </TableCell>
                  <TableCell>
                    {entry.uzbek ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Tayyor
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Kutilmoqda
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingEntry({...entry});
                        setIsDialogOpen(true);
                      }}>
                        <Edit2 className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Baza bo'sh. Excel fayl yuklang.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {entries.length > 50 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              va yana {entries.length - 50} ta so'z...
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Tahrirlash</DialogTitle>
            </DialogHeader>
            {editingEntry && (
              <form onSubmit={handleSave} className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Arabcha</label>
                      <Input 
                        value={editingEntry.arabic}
                        onChange={(e) => setEditingEntry({...editingEntry, arabic: e.target.value})}
                        className="font-arabic text-right text-lg" 
                        dir="rtl"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium">Transliteratsiya</label>
                      <Input 
                        value={editingEntry.transliteration || ""}
                        onChange={(e) => setEditingEntry({...editingEntry, transliteration: e.target.value})}
                      />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium">Manba (Arabcha)</label>
                   <Textarea 
                      value={editingEntry.arabic_definition || ""}
                      onChange={(e) => setEditingEntry({...editingEntry, arabic_definition: e.target.value})}
                      className="font-arabic text-right min-h-[80px] bg-muted/20" 
                      dir="rtl"
                    />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium text-primary">O'zbekcha Tarjima</label>
                   <Textarea 
                      value={editingEntry.uzbek}
                      onChange={(e) => setEditingEntry({...editingEntry, uzbek: e.target.value})}
                      className="min-h-[100px] border-primary/30 focus-visible:ring-primary" 
                    />
                </div>
                <DialogFooter>
                  <Button type="submit">Saqlash</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
