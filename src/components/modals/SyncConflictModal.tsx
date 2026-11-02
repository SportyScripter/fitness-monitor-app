import React from 'react';
import { Cloud, HardDrive, UploadCloud, DownloadCloud, AlertTriangle, X } from 'lucide-react';

interface SyncConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  localStats: {
    cyclesCount: number;
    logsCount: number;
  };
  cloudStats: {
    cyclesCount: number;
    logsCount: number;
  };
  onKeepLocalAndUpload: () => void;
  onDownloadCloudAndOverwrite: () => void;
  isLoading?: boolean;
}

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  isOpen,
  onClose,
  localStats,
  cloudStats,
  onKeepLocalAndUpload,
  onDownloadCloudAndOverwrite,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 sm:p-7 relative overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="p-3 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
              Synchronizacja konta
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              Wykryto lokalne treningi. Co chcesz z nimi zrobić?
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-6">
          W pamięci tego urządzenia znajdują się zapisane cykle i serie treningowe. Zalogowano się na konto z dostępem do chmury Cloud Firestore. Wybierz sposób synchronizacji:
        </p>

        {/* Stats Comparison Card */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-400 font-bold uppercase text-[10px]">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>To urządzenie</span>
            </div>
            <p className="text-white font-mono-numbers font-semibold">
              Cykle: <span className="text-amber-400">{localStats.cyclesCount}</span>
            </p>
            <p className="text-white font-mono-numbers font-semibold">
              Serie: <span className="text-amber-400">{localStats.logsCount}</span>
            </p>
          </div>

          <div className="space-y-1 border-l border-neutral-800 pl-3">
            <div className="flex items-center gap-1.5 text-neutral-400 font-bold uppercase text-[10px]">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>Konto w chmurze</span>
            </div>
            <p className="text-white font-mono-numbers font-semibold">
              Cykle: <span className="text-blue-400">{cloudStats.cyclesCount}</span>
            </p>
            <p className="text-white font-mono-numbers font-semibold">
              Serie: <span className="text-blue-400">{cloudStats.logsCount}</span>
            </p>
          </div>
        </div>

        {/* Decision Actions */}
        <div className="space-y-3">
          {/* Option 1: Keep local and upload */}
          <button
            type="button"
            onClick={onKeepLocalAndUpload}
            disabled={isLoading}
            className="w-full p-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-between gap-3 shadow-lg shadow-amber-400/10 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 rounded-xl bg-black/10 shrink-0">
                <UploadCloud className="w-5 h-5 text-neutral-950" />
              </div>
              <div>
                <span className="block font-black text-neutral-950">
                  Zachowaj i wyślij do chmury
                </span>
                <span className="block text-[11px] font-medium text-neutral-800">
                  Nadpisuje dane w Firebase stanem z tego telefonu
                </span>
              </div>
            </div>
          </button>

          {/* Option 2: Download from cloud and overwrite local */}
          <button
            type="button"
            onClick={onDownloadCloudAndOverwrite}
            disabled={isLoading}
            className="w-full p-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 hover:border-neutral-600 border border-neutral-700/80 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-black text-white">
                  Pobierz stan z chmury
                </span>
                <span className="block text-[11px] font-medium text-neutral-400">
                  Zastępuje dane lokalne historią z Twojego konta Firebase
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer cancel / skip note */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer py-1"
          >
            Zdecyduj później (kontynuuj bez nadpisywania)
          </button>
        </div>
      </div>
    </div>
  );
};
