import React from 'react';
import { User } from 'firebase/auth';
import {
  Flame,
  FileSpreadsheet,
  Calendar,
  Layers,
  Activity,
  Award,
  Zap,
  LogOut,
  ChevronDown,
  Timer,
  Folder,
  Plus,
  Target,
  Sparkles
} from 'lucide-react';
import { MesocyclePhase, TrainingCycleCatalog } from '../types/hyrox';

interface HeaderProps {
  activeCycle: TrainingCycleCatalog;
  cyclesList: TrainingCycleCatalog[];
  onSelectCycle: (cycleId: string) => void;
  currentWeek: number;
  totalWeeksCount: number;
  weeksList: MesocyclePhase[];
  onWeekChange: (week: number) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User | null;
  spreadsheetId: string | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onOpenSheetsModal: () => void;
  onToggleTimer: () => void;
  isTimerOpen: boolean;
  onOpenCatalog: () => void;
  onOpenAddWeekModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeCycle,
  cyclesList,
  onSelectCycle,
  currentWeek,
  totalWeeksCount,
  weeksList,
  onWeekChange,
  activeTab,
  onTabChange,
  user,
  spreadsheetId,
  onGoogleSignIn,
  onGoogleSignOut,
  onOpenSheetsModal,
  onToggleTimer,
  isTimerOpen,
  onOpenCatalog,
  onOpenAddWeekModal,
}) => {
  const currentPhase = weeksList.find((w) => w.week === currentWeek) || weeksList[0];

  const navItems = [
    { id: 'plan', label: 'Plan Treningowy', icon: Calendar },
    { id: 'summary', label: 'Podsumowanie (Strava)', icon: Flame },
    { id: 'volume', label: 'Rozkład Partii & Tonaż', icon: Layers },
    { id: 'hyrox-sim', label: 'Symulator Hyrox & Stoper', icon: Award },
    { id: 'progression', label: 'Progresja & Wykresy', icon: Zap },
    { id: 'recovery', label: 'Regeneracja & Gotowość', icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
      {/* Top Banner with Brand, Cycle selector, Week Selector, and Sync Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Logo & Cycle Quick Selector */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Catalog Drawer Trigger */}
            <button
              onClick={onOpenCatalog}
              className="p-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 hover:border-amber-400/50 transition-all flex items-center gap-2 cursor-pointer shadow-md group"
              title="Otwórz boczny katalog cykli treningowych (Hyrox, Masa, Redukcja itp.)"
            >
              <Folder className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase text-white font-heading">
                Katalog Cykli
              </span>
            </button>

            {/* Active Cycle Switcher Pill */}
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-amber-400/50 rounded-2xl p-1 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-2 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-neutral-400 pl-1 hidden sm:inline">
                Cel:
              </span>
              <div className="relative">
                <select
                  value={activeCycle.id}
                  onChange={(e) => onSelectCycle(e.target.value)}
                  className="appearance-none bg-transparent text-amber-400 text-xs font-black uppercase tracking-wider pl-1 pr-6 py-1 focus:outline-none cursor-pointer"
                >
                  {cyclesList.map((c) => (
                    <option key={c.id} value={c.id} className="bg-neutral-900 text-white normal-case font-bold">
                      {c.name} ({c.goal})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="hidden xl:block text-xs text-neutral-400 border-l border-neutral-800 pl-3">
              {activeCycle.description.slice(0, 50)}...
            </div>
          </div>

          {/* Controls: Week Selector + Add Week + Rest Timer + Google Sheets */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Week Selector + Add Week Button */}
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-xl p-1">
              <div className="relative">
                <select
                  value={currentWeek}
                  onChange={(e) => onWeekChange(Number(e.target.value))}
                  className="appearance-none bg-transparent text-neutral-200 text-xs font-bold pl-2.5 pr-7 py-1 focus:outline-none cursor-pointer"
                >
                  {weeksList.map((w) => (
                    <option key={w.week} value={w.week} className="bg-neutral-900 text-white">
                      Tydzień {w.week}: {w.name.split(':')[1]?.trim() || w.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={onOpenAddWeekModal}
                className="px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                title="Dodaj kolejny tydzień do tego cyklu"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tydzień</span>
              </button>
            </div>

            {/* Rest Timer Button */}
            <button
              onClick={onToggleTimer}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isTimerOpen
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-600'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Stoper</span>
            </button>

            {/* Google Sheets Integration Card/Button */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSheetsModal}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                  title="Zarządzaj Google Sheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="font-semibold hidden sm:inline">
                    {spreadsheetId ? 'Google Sheets' : 'Eksportuj Sheets'}
                  </span>
                </button>

                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="max-w-[100px] truncate font-medium">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={onGoogleSignOut}
                    className="p-1 text-neutral-400 hover:text-red-400 transition-colors ml-1"
                    title="Wyloguj"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="btn-google-signin flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 border border-neutral-700 text-neutral-200 hover:border-neutral-600 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google Sheets</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
