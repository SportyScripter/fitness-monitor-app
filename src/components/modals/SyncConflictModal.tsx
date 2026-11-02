import React from 'react';
import { Cloud, HardDrive, UploadCloud, DownloadCloud, AlertTriangle, Loader2 } from 'lucide-react';

interface SyncConflictModalProps {
  isOpen: boolean;
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

/**
 * SyncConflictModal:
 * Blocks the entire UI when both local storage and Cloud Firestore contain data
 * for an unmigrated account.
 * Cannot be dismissed without making an explicit choice.
 */
export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  isOpen,
  localStats,
  cloudStats,
  onKeepLocalAndUpload,
  onDownloadCloudAndOverwrite,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-neutral-900 border-2 border-amber-500/40 shadow-2xl p-6 sm:p-7 relative overflow-hidden">
        {/* Header Badge */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="p-3 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/30 shrink-0">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black bg-amber-400/20 text-amber-400 border border-amber-400/30 tracking-wider">
              Konflikt Danych — Wymagana Decyzja
            </span>
            <h3 id="conflict-dialog-title" className="text-lg sm:text-xl font-bold text-white mt-1">
              Wykryto lokalne treningi. Co chcesz z nimi zrobić?
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-5">
          Na tym telefonie znajdują się zapisane cykle i serie treningowe, a Twoje konto Google w chmurze posiada już zapisaną wcześniejszą historię.
          Wybierz, które dane mają stać się jedynym źródłem prawdy:
        </p>

        {/* Stats Comparison Card */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-neutral-400 font-bold uppercase text-[10px]">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>To urządzenie</span>
            </div>
            <p className="text-white font-mono-numbers font-semibold text-sm">
              Cykle: <span className="text-amber-400 font-bold">{localStats.cyclesCount}</span>
            </p>
            <p className="text-white font-mono-numbers font-semibold text-sm">
              Wykonane serie: <span className="text-amber-400 font-bold">{localStats.logsCount}</span>
            </p>
          </div>

          <div className="space-y-1.5 border-l border-neutral-800 pl-3">
            <div className="flex items-center gap-1.5 text-neutral-400 font-bold uppercase text-[10px]">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span>Konto w chmurze</span>
            </div>
            <p className="text-white font-mono-numbers font-semibold text-sm">
              Cykle: <span className="text-blue-400 font-bold">{cloudStats.cyclesCount}</span>
            </p>
            <p className="text-white font-mono-numbers font-semibold text-sm">
              Wykonane serie: <span className="text-blue-400 font-bold">{cloudStats.logsCount}</span>
            </p>
          </div>
        </div>

        {/* Decision Actions - Physically blocking choices */}
        <div className="space-y-3">
          {/* Option 1: Keep local phone data and upload to cloud */}
          <button
            type="button"
            onClick={onKeepLocalAndUpload}
            disabled={isLoading}
            className="w-full p-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-between gap-3 shadow-lg shadow-amber-400/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="p-2.5 rounded-xl bg-black/10 shrink-0">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-neutral-950 animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5 text-neutral-950" />
                )}
              </div>
              <div>
                <span className="block font-black text-neutral-950 text-sm sm:text-base">
                  Wyślij dane z telefonu do chmury
                </span>
                <span className="block text-[11px] font-medium text-neutral-800 mt-0.5">
                  Zachowuje treningi z tego urządzenia i nadpisuje stan w Firebase
                </span>
              </div>
            </div>
          </button>

          {/* Option 2: Download from cloud and overwrite local */}
          <button
            type="button"
            onClick={onDownloadCloudAndOverwrite}
            disabled={isLoading}
            className="w-full p-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 hover:border-neutral-600 border border-neutral-700/80 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : (
                  <DownloadCloud className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className="block font-black text-white text-sm sm:text-base">
                  Pobierz stan z chmury
                </span>
                <span className="block text-[11px] font-medium text-neutral-400 mt-0.5">
                  Zastępuje dane lokalne historią z Twojego konta Firebase
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Lock Notice */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 text-center">
          <p className="text-[11px] text-neutral-400">
            Aplikacja nie zmodyfikuje żadnych danych, dopóki nie wybierzesz jednej z powyższych opcji.
          </p>
        </div>
      </div>
    </div>
  );
};
