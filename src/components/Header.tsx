import React from 'react';
import { User } from 'firebase/auth';
import {
  Folder,
  ChevronDown,
  Timer,
  FileSpreadsheet,
  Moon,
  Sun,
} from 'lucide-react';
import { MesocyclePhase, TrainingCycleCatalog } from '../types/hyrox';
import { useScrollDirection } from '../hooks/useScrollDirection';

interface HeaderProps {
  activeCycle: TrainingCycleCatalog;
  cyclesList: TrainingCycleCatalog[];
  onSelectCycle: (cycleId: string) => void;
  currentWeek: number;
  totalWeeksCount: number;
  weeksList: MesocyclePhase[];
  onWeekChange: (week: number) => void;
  user: User | null;
  spreadsheetId: string | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onOpenSheetsModal: () => void;
  onToggleTimer: () => void;
  isTimerOpen: boolean;
  onOpenCatalog: () => void;
  onOpenAddWeekModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeCycle,
  cyclesList,
  onSelectCycle,
  user,
  spreadsheetId,
  onGoogleSignIn,
  onGoogleSignOut,
  onOpenSheetsModal,
  onToggleTimer,
  isTimerOpen,
  onOpenCatalog,
  theme,
  onToggleTheme,
}) => {
  const scrollDirection = useScrollDirection({ threshold: 10 });
  const isHidden = scrollDirection === 'down';

  return (
    <header
      className={`sticky top-0 z-50 transform transition-transform duration-300 backdrop-blur-md border-b shadow-lg ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      } ${
        theme === 'dark'
          ? 'bg-neutral-950/95 border-neutral-800'
          : 'bg-[#f8f5f0]/95 border-[#e7dfd2] shadow-[0_10px_30px_rgba(87,66,31,0.08)]'
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto px-3.5 py-2.5 space-y-2">
        {/* Row 1: Top Bar with Primary "Zarządzaj cyklami" Button + Quick Utilities */}
        <div className="flex items-center justify-between gap-2">
          {/* Main "Zarządzaj cyklami" Button (Large, prominent, mobile-first) */}
          <button
            onClick={onOpenCatalog}
            className="flex-1 py-2.5 px-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-400/20 active:scale-[0.98] touch-manipulation min-h-[44px]"
            title="Otwórz katalog do tworzenia nowego pustego cyklu lub edycji zapisanych"
            aria-label="Zarządzaj cyklami"
          >
            <Folder className="w-4 h-4 fill-black/20" />
            <span className="truncate">Zarządzaj cyklami</span>
          </button>

          {/* Quick Rest Timer Trigger */}
          <button
            onClick={onToggleTimer}
            className={`px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[44px] ${
              isTimerOpen
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-sm'
                : theme === 'dark'
                  ? 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  : 'bg-[#fffaf2] text-neutral-700 border-[#eadfc7] hover:border-[#d6c2a0]'
            }`}
            title="Stoper przerw treningowych"
          >
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Stoper</span>
          </button>

          {/* Google Sheets / Auth Quick Button */}
          <button
            onClick={onToggleTheme}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer touch-manipulation min-h-[44px] ${
              theme === 'dark'
                ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                : 'bg-[#fffaf2] border-[#eadfc7] text-neutral-700 hover:text-neutral-900'
            }`}
            title={theme === 'dark' ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
            aria-label="Przełącz motyw"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-600" />}
          </button>

          {user ? (
            <button
              onClick={onOpenSheetsModal}
              className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer touch-manipulation min-h-[44px]"
              title="Google Sheets synchronizacja"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer touch-manipulation min-h-[44px]"
              title="Zaloguj do Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Row 2: Quick Dropdown for Active Training Cycle Selection */}
        <div className={`relative rounded-2xl px-3 py-1.5 shadow-sm transition-colors border ${
          theme === 'dark'
            ? 'bg-neutral-900 border-amber-400/40 hover:border-amber-400'
            : 'bg-[#fffaf2] border-[#e6d8ba] hover:border-[#d9b977]'
        }`}>
          <div className="flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 truncate pr-6">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider leading-none">
                  Aktywny cykl:
                </span>
                <span className="text-xs font-black text-amber-400 font-heading uppercase tracking-wide truncate block mt-0.5">
                  {activeCycle.name}
                  <span className="text-neutral-400 text-[10px] font-normal lowercase pl-1.5 hidden sm:inline">
                    ({activeCycle.goal})
                  </span>
                </span>
              </div>
            </div>

            <ChevronDown className="w-4 h-4 text-amber-400 shrink-0 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Native Select Overlay with Large Touch Area */}
          <select
            value={activeCycle.id}
            onChange={(e) => onSelectCycle(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer touch-manipulation"
            aria-label="Wybierz aktywny cykl treningowy z katalogu"
          >
            {cyclesList.map((c) => (
              <option key={c.id} value={c.id} className="bg-neutral-900 text-white font-bold">
                {c.name} ({c.goal})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
