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
import { Edit2, Plus, Save, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminPage() {
  const [entries, setEntries] = React.useState<DictionaryEntry[]>(SAMPLE_DATA);
  const [editingEntry, setEditingEntry] = React.useState<DictionaryEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Mock function to simulate saving to "database"
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    // Simulate API call
    setTimeout(() => {
      const updatedEntries = entries.map(entry => 
        entry.id === editingEntry.id ? editingEntry : entry
      );
      setEntries(updatedEntries);
      setIsDialogOpen(false);
      toast({
        title: "Muvaffaqiyatli saqlandi",
        description: "Ma'lumotlar bazaga yozildi (Simulyatsiya)",
        variant: "default",
      });
    }, 500);
  };

  // Mock function to simulate Excel Import
  const handleExcelImport = () => {
    toast({
      title: "Excel fayl yuklanmoqda...",
      description: "Tizim Excel faylni o'qib, bazaga yozmoqda (Simulyatsiya)",
    });
    
    setTimeout(() => {
       const newMockEntry: DictionaryEntry = {
          id: Math.random().toString(),
          arabic: "جديد",
          transliteration: "Jadid",
          uzbek: "Yangi (Exceldan qo'shildi)",
          type: "sifat",
          examples: [],
          root: "j-d-d"
       };
       setEntries(prev => [newMockEntry, ...prev]);
       toast({
        title: "Import yakunlandi",
        description: "154 ta yangi so'z qo'shildi",
        variant: "default",
      });
    }, 1500);
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
            <Button variant="outline" onClick={handleExcelImport} className="gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Excel Import
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
            }} className="gap-2">
              <Plus className="h-4 w-4" />
              Yangi so'z
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-arabic text-right">Arabcha</TableHead>
                <TableHead>Transliteratsiya</TableHead>
                <TableHead>O'zbekcha</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-arabic text-lg font-medium">{entry.arabic}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{entry.transliteration}</TableCell>
                  <TableCell className="font-medium">{entry.uzbek}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary-foreground border border-secondary/20">
                      {entry.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingEntry({...entry});
                      setIsDialogOpen(true);
                    }}>
                      <Edit2 className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>So'zni tahrirlash</DialogTitle>
              <DialogDescription>
                Arabcha so'z va uning o'zbekcha tarjimasini kiriting.
              </DialogDescription>
            </DialogHeader>
            {editingEntry && (
              <form onSubmit={handleSave} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="arabic" className="text-right col-span-1 text-sm font-medium">Arabcha</label>
                  <Input 
                    id="arabic" 
                    value={editingEntry.arabic}
                    onChange={(e) => setEditingEntry({...editingEntry, arabic: e.target.value})}
                    className="col-span-3 font-arabic text-right text-lg" 
                    dir="rtl"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="trans" className="text-right col-span-1 text-sm font-medium">Translit.</label>
                  <Input 
                    id="trans" 
                    value={editingEntry.transliteration || ""}
                    onChange={(e) => setEditingEntry({...editingEntry, transliteration: e.target.value})}
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="uzbek" className="text-right col-span-1 text-sm font-medium">O'zbekcha</label>
                  <Input 
                    id="uzbek" 
                    value={editingEntry.uzbek}
                    onChange={(e) => setEditingEntry({...editingEntry, uzbek: e.target.value})}
                    className="col-span-3" 
                  />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="type" className="text-right col-span-1 text-sm font-medium">So'z turkumi</label>
                  <Input 
                    id="type" 
                    value={editingEntry.type}
                    onChange={(e) => setEditingEntry({...editingEntry, type: e.target.value})}
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <label className="text-right col-span-1 text-sm font-medium pt-2">Misollar</label>
                  <div className="col-span-3 space-y-2">
                     <p className="text-xs text-muted-foreground">Misollar qo'shish hozircha o'chirilgan (Mockup)</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">
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
