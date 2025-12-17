import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { 
  getDictionaryEntries,
  updateDictionaryEntry,
  createDictionaryEntry,
  deleteDictionaryEntry as deleteEntry,
  importEntries,
  batchTranslate,
  getStats,
  getRecentlyTranslated,
  getSynonyms,
  addSynonym,
  removeSynonym,
  DictionaryEntry,
  DICTIONARY_SOURCES
} from "@/lib/api";
import { Edit2, Plus, Save, Trash2, Upload, AlertCircle, Wand2, Loader2, Database, CheckCircle2, Clock, FileText, History, ArrowRightLeft, X, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

type FilterType = 'all' | 'translated' | 'pending' | 'recent';

export default function AdminPage() {
  const [editingEntry, setEditingEntry] = React.useState<DictionaryEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [importSource, setImportSource] = React.useState<string>("Roid");
  const [pendingImportData, setPendingImportData] = React.useState<any[] | null>(null);
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [visibleCount, setVisibleCount] = React.useState(100);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // Sinonimlar boshqaruvi uchun
  const [currentSynonyms, setCurrentSynonyms] = React.useState<DictionaryEntry[]>([]);
  const [synonymSearch, setSynonymSearch] = React.useState("");
  const [synonymSearchResults, setSynonymSearchResults] = React.useState<DictionaryEntry[]>([]);
  const [isLoadingSynonyms, setIsLoadingSynonyms] = React.useState(false);

  // Reset visible count when filter changes
  React.useEffect(() => {
    setVisibleCount(100);
  }, [filter]);

  // Sinonimlarni yuklash - dialog ochilganda
  React.useEffect(() => {
    if (editingEntry?.id && isDialogOpen) {
      setIsLoadingSynonyms(true);
      getSynonyms(editingEntry.id)
        .then(setCurrentSynonyms)
        .catch(console.error)
        .finally(() => setIsLoadingSynonyms(false));
    } else {
      setCurrentSynonyms([]);
      setSynonymSearch("");
      setSynonymSearchResults([]);
    }
  }, [editingEntry?.id, isDialogOpen]);

  // Fetch data
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dictionary'],
    queryFn: () => getDictionaryEntries(),
  });

  // Sinonim qidirish
  React.useEffect(() => {
    if (synonymSearch.length >= 2) {
      const filtered = entries.filter(e => 
        e.id !== editingEntry?.id && 
        !currentSynonyms.some(s => s.id === e.id) &&
        (e.arabic.includes(synonymSearch) || e.uzbek?.includes(synonymSearch))
      ).slice(0, 10);
      setSynonymSearchResults(filtered);
    } else {
      setSynonymSearchResults([]);
    }
  }, [synonymSearch, entries, editingEntry?.id, currentSynonyms]);

  const handleAddSynonym = async (synonymEntry: DictionaryEntry) => {
    if (!editingEntry) return;
    try {
      await addSynonym(editingEntry.id, synonymEntry.id);
      setCurrentSynonyms(prev => [...prev, synonymEntry]);
      setSynonymSearch("");
      toast({ title: "Sinonim qo'shildi" });
    } catch (error) {
      toast({ title: "Xatolik", description: "Sinonim qo'shib bo'lmadi", variant: "destructive" });
    }
  };

  const handleRemoveSynonym = async (synonymId: number) => {
    if (!editingEntry) return;
    try {
      await removeSynonym(editingEntry.id, synonymId);
      setCurrentSynonyms(prev => prev.filter(s => s.id !== synonymId));
      toast({ title: "Sinonim o'chirildi" });
    } catch (error) {
      toast({ title: "Xatolik", description: "Sinonimni o'chirib bo'lmadi", variant: "destructive" });
    }
  };

  const { data: recentEntries = [], isLoading: isLoadingRecent } = useQuery({
    queryKey: ['dictionary-recent'],
    queryFn: () => getRecentlyTranslated(200),
    refetchInterval: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 5000,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DictionaryEntry> }) => 
      updateDictionaryEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsDialogOpen(false);
      toast({ title: "Saqlandi" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<DictionaryEntry>) => createDictionaryEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsDialogOpen(false);
      toast({ title: "Yaratildi" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast({ description: "So'z o'chirildi" });
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ entries, source }: { entries: any[]; source: string }) => importEntries(entries, source),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dictionary'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dictionary-sources'] });
      setIsImportDialogOpen(false);
      setPendingImportData(null);
      toast({
        title: "Import muvaffaqiyatli",
        description: `${data.count} ta so'z "${data.dictionarySource}" lug'atiga qo'shildi`,
      });
    },
  });

  const translateMutation = useMutation({
    mutationFn: () => batchTranslate(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dictionary'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast({
        title: "Tarjima yakunlandi",
        description: `${data.count} ta so'z tarjima qilindi`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Tarjimada xatolik yuz berdi",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    if (editingEntry.id) {
      updateMutation.mutate({ 
        id: editingEntry.id, 
        data: {
          arabic: editingEntry.arabic,
          arabicDefinition: editingEntry.arabicDefinition,
          uzbek: editingEntry.uzbek,
          transliteration: editingEntry.transliteration,
          type: editingEntry.type,
          root: editingEntry.root,
        }
      });
    } else {
      createMutation.mutate(editingEntry);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Try to detect format: headers or just 2 columns
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (rawData.length === 0) {
          toast({
            variant: "destructive", 
            title: "Bo'sh fayl",
            description: "Excel faylda ma'lumot yo'q",
          });
          return;
        }

        // Check if first row looks like headers (has 'word' or similar)
        const firstRow = rawData[0];
        const hasHeaders = firstRow.some((cell: any) => 
          typeof cell === 'string' && 
          ['word', 'meaning', 'root', 'complement'].includes(cell.toLowerCase())
        );

        let entriesToImport: any[];

        if (hasHeaders) {
          // Use standard JSON parsing with headers
          const data = XLSX.utils.sheet_to_json(ws);
          entriesToImport = data.map((row: any) => ({
            word: row.word || row.Word || "",
            complement: row.complement || row.Complement || "",
            root: row.root || row.Root || "",
            meaning: row.meaning || row.Meaning || "",
          }));
        } else {
          // Auto-detect 2 or 3 column format
          // 3-column: A = Arabic word, B = complement/type, C = definition
          // 2-column: A = Arabic word, B = definition
          const sampleRow = rawData.find((row: any[]) => row[0] && String(row[0]).trim());
          const columnCount = sampleRow ? sampleRow.filter((c: any) => c !== undefined && c !== null && String(c).trim()).length : 0;
          
          entriesToImport = rawData
            .filter((row: any[]) => row[0] && String(row[0]).trim()) // Filter empty rows
            .map((row: any[]) => {
              if (columnCount >= 3) {
                // 3-column format: word, complement/type, definition
                return {
                  word: String(row[0] || "").trim(),
                  complement: String(row[1] || "").trim(),
                  meaning: String(row[2] || "").trim(),
                  root: "",
                };
              } else {
                // 2-column format: word, definition
                return {
                  word: String(row[0] || "").trim(),
                  meaning: String(row[1] || "").trim(),
                  complement: "",
                  root: "",
                };
              }
            });
        }

        if (entriesToImport.length === 0) {
          toast({
            variant: "destructive",
            title: "Ma'lumot topilmadi",
            description: "Excel faylda so'zlar topilmadi",
          });
          return;
        }

        // Show dialog to select dictionary source
        setPendingImportData(entriesToImport);
        setIsImportDialogOpen(true);

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

  const handleConfirmImport = () => {
    if (pendingImportData) {
      importMutation.mutate({ entries: pendingImportData, source: importSource });
    }
  };

  const totalWords = stats?.total || 0;
  const translatedWords = stats?.translated || 0;
  const pendingWords = stats?.pending || 0;
  const progressPercentage = totalWords > 0 ? Math.round((translatedWords / totalWords) * 100) : 0;

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
            <Button 
              className="w-full h-full text-lg gap-2" 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Yuklanmoqda...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Excel Yuklash
                </>
              )}
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
               <h3 className="font-semibold">AI Tarjima (Haqiqiy)</h3>
               <p className="text-sm text-muted-foreground">Barcha kutilayotgan so'zlarni bir vaqtda tarjima qilish</p>
             </div>
          </div>
          <Button 
            size="lg" 
            onClick={() => translateMutation.mutate()}
            disabled={translateMutation.isPending || pendingWords === 0}
            className="bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-700 text-white shadow-md transition-all"
          >
            {translateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI ishlayapti...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                {pendingWords} ta so'zni tarjima qilish
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
          <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              So'zlar Ro'yxati
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-md border overflow-hidden">
                <Button 
                  size="sm" 
                  variant={filter === 'recent' ? 'default' : 'ghost'}
                  className="rounded-none"
                  onClick={() => setFilter('recent')}
                >
                  <History className="h-3 w-3 mr-1" />
                  So'nggi ({recentEntries.length})
                </Button>
                <Button 
                  size="sm" 
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  className="rounded-none border-l"
                  onClick={() => setFilter('all')}
                >
                  Barchasi ({totalWords})
                </Button>
                <Button 
                  size="sm" 
                  variant={filter === 'translated' ? 'default' : 'ghost'}
                  className="rounded-none border-l"
                  onClick={() => setFilter('translated')}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Tarjima qilingan ({translatedWords})
                </Button>
                <Button 
                  size="sm" 
                  variant={filter === 'pending' ? 'default' : 'ghost'}
                  className="rounded-none border-l"
                  onClick={() => setFilter('pending')}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Kutilmoqda ({pendingWords})
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={() => {
               setEditingEntry({
                id: 0,
                arabic: "",
                uzbek: "",
                type: "ot",
                transliteration: "",
                root: "",
                arabicDefinition: "",
                examplesJson: "",
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any);
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-1" />
              Yangi qo'shish
            </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : (
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
                {(filter === 'recent' ? recentEntries : entries)
                  .filter(entry => {
                    if (filter === 'translated') return entry.uzbek && entry.uzbek.length > 0;
                    if (filter === 'pending') return !entry.uzbek || entry.uzbek.length === 0;
                    return true;
                  })
                  .slice(0, visibleCount)
                  .map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-arabic text-lg font-medium text-right" dir="rtl">{entry.arabic}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="line-clamp-2 font-arabic text-right" dir="rtl" title={entry.arabicDefinition || ""}>
                        {entry.arabicDefinition || "-"}
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
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(entry.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(filter === 'recent' ? recentEntries : entries).filter(entry => {
                    if (filter === 'translated') return entry.uzbek && entry.uzbek.length > 0;
                    if (filter === 'pending') return !entry.uzbek || entry.uzbek.length === 0;
                    return true;
                  }).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{filter === 'recent' ? "So'nggi tarjimalar yo'q." : filter === 'all' ? "Baza bo'sh. Excel fayl yuklang." : filter === 'translated' ? "Tarjima qilingan so'z yo'q." : "Kutilayotgan so'z yo'q."}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {(() => {
            const dataSource = filter === 'recent' ? recentEntries : entries;
            const filteredEntries = dataSource.filter(entry => {
              if (filter === 'translated') return entry.uzbek && entry.uzbek.length > 0;
              if (filter === 'pending') return !entry.uzbek || entry.uzbek.length === 0;
              return true;
            });
            const remaining = filteredEntries.length - visibleCount;
            if (remaining > 0) {
              return (
                <div className="p-4 text-center border-t space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Ko'rsatilgan: {Math.min(visibleCount, filteredEntries.length)} / {filteredEntries.length}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setVisibleCount(prev => prev + 100)}
                    data-testid="button-load-more"
                  >
                    Yana 100 ta yuklash ({remaining} ta qoldi)
                  </Button>
                </div>
              );
            }
            return null;
          })()}
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
                      value={editingEntry.arabicDefinition || ""}
                      onChange={(e) => setEditingEntry({...editingEntry, arabicDefinition: e.target.value})}
                      className="font-arabic text-right min-h-[80px] bg-muted/20" 
                      dir="rtl"
                    />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium text-primary">O'zbekcha Tarjima</label>
                   <Textarea 
                      value={editingEntry.uzbek || ""}
                      onChange={(e) => setEditingEntry({...editingEntry, uzbek: e.target.value})}
                      className="min-h-[100px] border-primary/30 focus-visible:ring-primary" 
                    />
                </div>
                
                {/* Sinonimlar boshqaruvi */}
                {editingEntry.id && (
                  <div className="space-y-3 p-4 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-800">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-violet-600" />
                      <label className="text-sm font-medium text-violet-700 dark:text-violet-400">Sinonimlar (مرادفات)</label>
                    </div>
                    
                    {isLoadingSynonyms ? (
                      <div className="text-sm text-muted-foreground">Yuklanmoqda...</div>
                    ) : (
                      <>
                        {currentSynonyms.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {currentSynonyms.map(syn => (
                              <div key={syn.id} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full border border-violet-300 dark:border-violet-700">
                                <span className="font-arabic text-violet-700 dark:text-violet-300" dir="rtl">{syn.arabic}</span>
                                <span className="text-xs text-muted-foreground">({syn.uzbek || "—"})</span>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveSynonym(syn.id)}
                                  className="ml-1 text-red-500 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Sinonim qidirish..."
                            value={synonymSearch}
                            onChange={(e) => setSynonymSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        
                        {synonymSearchResults.length > 0 && (
                          <div className="max-h-32 overflow-y-auto border rounded-md bg-white dark:bg-gray-800">
                            {synonymSearchResults.map(result => (
                              <button
                                key={result.id}
                                type="button"
                                onClick={() => handleAddSynonym(result)}
                                className="w-full text-left px-3 py-2 hover:bg-violet-100 dark:hover:bg-violet-900/30 flex items-center justify-between"
                              >
                                <span className="font-arabic" dir="rtl">{result.arabic}</span>
                                <span className="text-xs text-muted-foreground">{result.uzbek || "—"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                <DialogFooter>
                  <Button type="submit" disabled={updateMutation.isPending || createMutation.isPending}>
                    {(updateMutation.isPending || createMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saqlanmoqda...
                      </>
                    ) : (
                      "Saqlash"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Import Dialog - Select Dictionary Source */}
        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) setPendingImportData(null);
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Lug'at Tanlang
              </DialogTitle>
              <DialogDescription>
                {pendingImportData?.length} ta so'z qaysi lug'atga qo'shilsin?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid gap-3">
                {DICTIONARY_SOURCES.map((source) => (
                  <button
                    key={source.id}
                    data-testid={`import-source-${source.id}`}
                    onClick={() => setImportSource(source.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                      importSource === source.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      importSource === source.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {importSource === source.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{source.name}</p>
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              {pendingImportData && pendingImportData.length > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="font-medium mb-2">Namunaviy ma'lumot:</p>
                  <div className="font-arabic text-right text-lg" dir="rtl">
                    {pendingImportData[0].word}
                  </div>
                  {pendingImportData[0].complement && (
                    <p className="text-muted-foreground text-xs">Turi: {pendingImportData[0].complement}</p>
                  )}
                  {pendingImportData[0].root && (
                    <p className="text-muted-foreground text-xs">Ildiz: {pendingImportData[0].root}</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsImportDialogOpen(false);
                setPendingImportData(null);
              }}>
                Bekor qilish
              </Button>
              <Button 
                onClick={handleConfirmImport} 
                disabled={importMutation.isPending}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {pendingImportData?.length} ta so'zni yuklash
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
