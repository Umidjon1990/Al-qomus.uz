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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { SAMPLE_DATA, DictionaryEntry } from "@/lib/mockData";
import { Edit2, Plus, Save, Trash2, FileSpreadsheet, Upload, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const [entries, setEntries] = React.useState<DictionaryEntry[]>(SAMPLE_DATA);
  const [editingEntry, setEditingEntry] = React.useState<DictionaryEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Mock function to simulate saving to "database"
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    // Simulate API call
    setTimeout(() => {
      const updatedEntries = entries.map(entry => 
        entry.id === editingEntry.id ? editingEntry : entry
      );
      
      // If it's a new entry (id not found in current list), add it
      if (!entries.find(e => e.id === editingEntry.id)) {
        setEntries([editingEntry, ...entries]);
      } else {
        setEntries(updatedEntries);
      }
      
      setIsDialogOpen(false);
      toast({
        title: "Muvaffaqiyatli saqlandi",
        description: "Ma'lumotlar bazaga yozildi (Simulyatsiya)",
        variant: "default",
      });
    }, 500);
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
        // We look for 'word' and 'meaning' based on user's file
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
          arabic_definition: row.meaning || "", // Import meaning as Arabic Definition
          uzbek: "", // Leave Uzbek empty for translation
          transliteration: "", 
          type: "aniqlanmagan",
          examples: [],
          root: ""
        }));

        setEntries(prev => [...newEntries, ...prev]);
        
        toast({
          title: "Import muvaffaqiyatli",
          description: `${newEntries.length} ta yangi so'z qo'shildi. Endi ularni tarjima qilishingiz mumkin.`,
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

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-primary">Tahrirlovchi Paneli</h1>
            <p className="text-muted-foreground">Lug'at bazasini boshqarish va yangi so'zlar qo'shish</p>
          </div>
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <Button variant="outline" onClick={triggerFileUpload} className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
              <Upload className="h-4 w-4" />
              Excel Yuklash
            </Button>
            <Button onClick={() => {
              setEditingEntry({
                id: Math.random().toString(),
                arabic: "",
                uzbek: "",
                type: "ot",
                examples: [],
                transliteration: ""
              });
              setIsDialogOpen(true);
            }} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Yangi so'z
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">QOMUS Excel Formati:</p>
            <p>Tizim Excel fayldagi <b>word</b> ustunini arabcha so'z sifatida, <b>meaning</b> ustunini esa arabcha izoh sifatida qabul qiladi.</p>
            <p className="mt-1">Siz importdan so'ng <b>O'zbekcha</b> tarjimani kiritishingiz kerak bo'ladi.</p>
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-arabic text-right w-[15%]">Arabcha</TableHead>
                <TableHead className="w-[35%]">Arabcha Izohi</TableHead>
                <TableHead className="w-[30%]">O'zbekcha Tarjimasi</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-arabic text-lg font-medium text-right" dir="rtl">{entry.arabic}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="line-clamp-2 font-arabic text-right" dir="rtl" title={entry.arabic_definition}>
                      {entry.arabic_definition || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                     <div className="line-clamp-2" title={entry.uzbek}>
                       {entry.uzbek || <span className="text-amber-500 italic text-xs">Tarjima qilinmagan</span>}
                     </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary-foreground border border-secondary/20">
                      {entry.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingEntry({...entry});
                        setIsDialogOpen(true);
                      }}>
                        <Edit2 className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEntries(entries.filter(e => e.id !== entry.id));
                        toast({description: "So'z o'chirildi"});
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Ma'lumotlar yo'q
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>So'zni tahrirlash</DialogTitle>
              <DialogDescription>
                Arabcha so'z va uning o'zbekcha tarjimasini kiriting.
              </DialogDescription>
            </DialogHeader>
            {editingEntry && (
              <form onSubmit={handleSave} className="grid gap-6 py-4">
                
                {/* Word & Type Row */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label htmlFor="arabic" className="text-sm font-medium">Arabcha so'z</label>
                      <Input 
                        id="arabic" 
                        value={editingEntry.arabic}
                        onChange={(e) => setEditingEntry({...editingEntry, arabic: e.target.value})}
                        className="font-arabic text-right text-lg" 
                        dir="rtl"
                      />
                   </div>
                   <div className="space-y-2">
                      <label htmlFor="type" className="text-sm font-medium">So'z turkumi</label>
                      <Input 
                        id="type" 
                        value={editingEntry.type}
                        onChange={(e) => setEditingEntry({...editingEntry, type: e.target.value})}
                      />
                   </div>
                </div>

                {/* Arabic Definition (Reference) */}
                <div className="space-y-2">
                   <label htmlFor="arabic_def" className="text-sm font-medium flex justify-between">
                     <span>Arabcha Izohi (Manba)</span>
                     <span className="text-muted-foreground text-xs font-normal">O'zgartirish tavsiya etilmaydi</span>
                   </label>
                   <Textarea 
                      id="arabic_def" 
                      value={editingEntry.arabic_definition || ""}
                      onChange={(e) => setEditingEntry({...editingEntry, arabic_definition: e.target.value})}
                      className="font-arabic text-right min-h-[80px] bg-muted/20" 
                      dir="rtl"
                    />
                </div>

                {/* Uzbek Translation (Target) */}
                <div className="space-y-2">
                   <label htmlFor="uzbek" className="text-sm font-medium text-primary">O'zbekcha Tarjimasi</label>
                   <Textarea 
                      id="uzbek" 
                      value={editingEntry.uzbek}
                      onChange={(e) => setEditingEntry({...editingEntry, uzbek: e.target.value})}
                      className="min-h-[100px] border-primary/30 focus-visible:ring-primary" 
                      placeholder="Arabcha izohga asoslanib tarjima kiriting..."
                    />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="trans" className="text-sm font-medium">Transliteratsiya</label>
                  <Input 
                    id="trans" 
                    value={editingEntry.transliteration || ""}
                    onChange={(e) => setEditingEntry({...editingEntry, transliteration: e.target.value})}
                    placeholder="Masalan: Kitab"
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full sm:w-auto">
                    <Save className="mr-2 h-4 w-4" />
                    Saqlash
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
