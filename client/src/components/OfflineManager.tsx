import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, Trash2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  openDatabase,
  saveEntries,
  getOfflineEntryCount,
  clearOfflineData,
  setMeta,
  getMeta,
  isOfflineReady
} from '@/lib/offlineDb';
import { toast } from '@/hooks/use-toast';

interface ExportResponse {
  entries: any[];
  nextLastId: number | null;
  hasMore: boolean;
  totalCount: number;
}

export function OfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalExpected, setTotalExpected] = useState(30000);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkOfflineStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkOfflineStatus = async () => {
    try {
      const count = await getOfflineEntryCount();
      setOfflineCount(count);
    } catch (error) {
      console.error('Error checking offline status:', error);
    }
  };

  const downloadDictionary = async () => {
    if (!isOnline) {
      toast({
        title: "Internet yo'q",
        description: "Lug'atni yuklash uchun internet kerak",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    setProgress(0);

    try {
      await openDatabase();
      let lastId = 0;
      let totalDownloaded = 0;
      let total = totalExpected;

      while (true) {
        const response = await fetch(`/api/dictionary/export?source=Ghoniy&lastId=${lastId}`);
        const data: ExportResponse = await response.json();

        if (data.totalCount) {
          total = data.totalCount;
          setTotalExpected(data.totalCount);
        }

        if (data.entries && data.entries.length > 0) {
          await saveEntries(data.entries);
          totalDownloaded += data.entries.length;
          setProgress(Math.min((totalDownloaded / total) * 100, 99));
        }

        if (!data.hasMore || data.nextLastId === null) {
          break;
        }

        lastId = data.nextLastId;
      }

      await setMeta('lastSync', new Date().toISOString());
      await setMeta('version', '1');
      
      setProgress(100);
      await checkOfflineStatus();

      toast({
        title: "Muvaffaqiyatli yuklandi!",
        description: `${totalDownloaded.toLocaleString()} ta so'z offline rejim uchun saqlandi`,
      });
    } catch (error) {
      console.error('Error downloading dictionary:', error);
      toast({
        title: "Xatolik",
        description: "Lug'atni yuklashda xatolik yuz berdi",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const clearOffline = async () => {
    try {
      await clearOfflineData();
      setOfflineCount(0);
      toast({
        title: "Tozalandi",
        description: "Offline ma'lumotlar o'chirildi",
      });
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        {offlineCount > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
            <Check className="h-3 w-3" />
            {offlineCount.toLocaleString()} so'z saqlangan
          </span>
        )}
      </div>

      {isDownloading ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Yuklanmoqda... {Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      ) : offlineCount > 0 ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadDictionary}
            className="flex-1"
            data-testid="btn-update-offline"
          >
            <Download className="h-4 w-4 mr-2" />
            Yangilash
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearOffline}
            className="text-red-500 hover:text-red-600"
            data-testid="btn-clear-offline"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          onClick={downloadDictionary}
          size="sm"
          className="w-full"
          disabled={!isOnline}
          data-testid="btn-download-offline"
        >
          <Download className="h-4 w-4 mr-2" />
          Offline rejim uchun yuklash (~15 MB)
        </Button>
      )}

      {!isOnline && offlineCount === 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Offline rejim uchun avval internetda lug'atni yuklab oling
        </p>
      )}
    </div>
  );
}
