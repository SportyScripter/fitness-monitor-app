import React, { useState } from 'react';
import {
  Flame,
  Layers,
  Award,
  Zap,
  Activity,
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet,
  Timer,
  ExternalLink,
  Sparkles,
  BarChart3,
  Calendar,
  LogOut,
  Dumbbell,
  Scale,
  Download,
  Check,
  Cloud
} from 'lucide-react';
import { User } from 'firebase/auth';
import { downloadWorkoutDataCSV } from '../../utils/exportUtils';
import {
  WorkoutLogEntry,
  DailyRecoveryData,
  HyroxRaceTrial,
  TrainingCycleCatalog,
  WorkoutDay,
  MesocyclePhase
} from '../../types/hyrox';
import { VolumeMatrixView } from './VolumeMatrixView';
import { HyroxRaceSimulator } from '../features/HyroxRaceSimulator';
import { Progression1RMView } from './Progression1RMView';
import { RecoveryTrackerView } from './RecoveryTrackerView';
import { SummaryCalendarView } from './SummaryCalendarView';
import { MeasurementsView } from '../measurements/MeasurementsView';

export type MoreSubView = 'strava' | 'volume' | 'hyrox' | 'progression' | 'recovery' | 'measurements' | null;

interface MoreMenuViewProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
  workoutLogs: WorkoutLogEntry[];
  recoveryHistory: DailyRecoveryData[];
  onSaveRecovery: (data: DailyRecoveryData) => void;
  onSaveHyroxTrial: (trial: HyroxRaceTrial) => void;
  activeCycle: TrainingCycleCatalog | null;
  currentWeekDays: WorkoutDay[];
  weeksList: MesocyclePhase[];
  spreadsheetId: string | null;
  onOpenSheetsModal: () => void;
  onToggleTimer: () => void;
  isTimerOpen: boolean;
  user: User | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onAddWorkoutLogs: (entries: WorkoutLogEntry[]) => void;
  onDeleteWorkoutLogEntry: (id: string) => void;
  onDeleteWorkoutSession: (sessionId: string, dateStr: string) => void;
  subView: MoreSubView;
  onSubViewChange: (view: MoreSubView) => void;
}

export const MoreMenuView: React.FC<MoreMenuViewProps> = ({
  currentWeek,
  onWeekChange,
  workoutLogs,
  recoveryHistory,
  onSaveRecovery,
  onSaveHyroxTrial,
  activeCycle,
  currentWeekDays,
  weeksList,
  spreadsheetId,
  onOpenSheetsModal,
  onToggleTimer,
  isTimerOpen,
  user,
  onGoogleSignIn,
  onGoogleSignOut,
  onAddWorkoutLogs,
  onDeleteWorkoutLogEntry,
  onDeleteWorkoutSession,
  subView,
  onSubViewChange,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportData = () => {
    try {
      setIsExporting(true);
      downloadWorkoutDataCSV(workoutLogs);
      setExportNotice('✓ Pomyślnie wygenerowano plik CSV!');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Błąd eksportu danych:', err);
      setExportNotice('Nie udało się wyeksportować danych.');
    } finally {
      setIsExporting(false);
    }
  };

  // Navigation menu items
  const menuItems = [
    {
      id: 'measurements' as MoreSubView,
      title: 'Pomiary i Sylwetka',
      subtitle: 'Waga, obwody ciała, fałdomierz Jackson-Pollock, BF%, kalkulator BMR/TDEE',
      icon: Scale,
      color: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
      badge: 'BF% & Dieta',
    },
    {
      id: 'strava' as MoreSubView,
      title: 'Podsumowanie Strava',
      subtitle: 'Kalendarz aktywności, dystanse biegowe, łączny tonaż i czas',
      icon: Flame,
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
      badge: 'Biegi & Dystans',
    },
    {
      id: 'volume' as MoreSubView,
      title: 'Rozkład partii i tonaż',
      subtitle: 'Matryca objętości (MEV/MAV), serie robocze na partie mięśniowe',
      icon: Layers,
      color: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
      badge: 'MEV vs MAV',
    },
    {
      id: 'hyrox' as MoreSubView,
      title: 'Symulator Hyrox',
      subtitle: '16 oficjalnych splitów czasowych, stacje siłowe i progi czasowe',
      icon: Award,
      color: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      badge: 'Split Timer',
    },
    {
      id: 'progression' as MoreSubView,
      title: 'Progresja i wykres',
      subtitle: 'Kalkulator 1RM, periodyzacja falowa i porównanie obciążeń',
      icon: Zap,
      color: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      badge: '1RM & Wykres',
    },
    {
      id: 'recovery' as MoreSubView,
      title: 'Regeneracja i gotowość',
      subtitle: 'Analiza snu, bolesności DOMS, stresu i gotowości do wysiłku',
      icon: Activity,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      badge: 'Gotowość 0-100',
    },
  ];

  // If subView is measurements, render the dedicated module with its own sticky header
  if (subView === 'measurements') {
    return <MeasurementsView onBackToMenu={() => onSubViewChange(null)} />;
  }

  // If subView is active, render the dedicated module view with top back bar
  if (subView) {
    let title = '';
    let content = null;

    switch (subView) {
      case 'strava':
        title = 'Podsumowanie Strava';
        content = (
          <SummaryCalendarView
            workoutLogs={workoutLogs}
            onAddWorkoutLogs={onAddWorkoutLogs}
            onDeleteWorkoutLogEntry={onDeleteWorkoutLogEntry}
            onDeleteWorkoutSession={onDeleteWorkoutSession}
          />
        );
        break;
      case 'volume':
        title = 'Rozkład partii i tonaż';
        content = (
          <VolumeMatrixView
            currentWeek={currentWeek}
            workoutLogs={workoutLogs}
            weekPlan={currentWeekDays}
            weeksList={weeksList}
            activeCycle={activeCycle || undefined}
            onOpenSheetsModal={onOpenSheetsModal}
            onWeekChange={onWeekChange}
          />
        );
        break;
      case 'hyrox':
        title = 'Symulator Hyrox';
        content = (
          <HyroxRaceSimulator
            onSaveTrial={onSaveHyroxTrial}
            isSheetsConnected={!!spreadsheetId}
            onOpenSheetsModal={onOpenSheetsModal}
          />
        );
        break;
      case 'progression':
        title = 'Progresja i wykres';
        content = (
          <Progression1RMView
            currentWeek={currentWeek}
            onSelectWeek={onWeekChange}
            workoutLogs={workoutLogs}
            totalWeeksCount={weeksList.length}
            weeksList={weeksList}
            allWeeksPlans={activeCycle?.weeksPlansMap || {}}
          />
        );
        break;
      case 'recovery':
        title = 'Regeneracja i gotowość';
        content = (
          <RecoveryTrackerView
            workoutLogs={workoutLogs}
            recoveryHistory={recoveryHistory}
            onSaveRecovery={onSaveRecovery}
          />
        );
        break;
    }

    return (
      <div className="space-y-4 pb-24 w-full max-w-xl mx-auto lg:max-w-none lg:mx-0">
        {/* Sticky Back Navigation Bar */}
        <div className="sticky top-16 z-20 bg-neutral-950/95 backdrop-blur-md py-2 flex items-center justify-between border-b border-neutral-800">
          <button
            onClick={() => onSubViewChange(null)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs cursor-pointer border border-neutral-800 transition-colors touch-manipulation min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Wróć do menu Więcej</span>
          </button>

          <span className="text-xs font-black text-white uppercase font-heading truncate max-w-[180px]">
            {title}
          </span>
        </div>

        {/* Sub-view Content */}
        <div className="pt-2">{content}</div>
      </div>
    );
  }

  // Main "Więcej" Grid Menu
  return (
    <div className="space-y-4 pb-24 w-full max-w-xl mx-auto lg:max-w-none lg:mx-0">
      {/* Menu Header Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl">
        <h1 className="text-lg font-black text-white font-heading uppercase tracking-wide">
          Moduły Analityczne & Narzędzia
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Wybierz moduł, aby sprawdzić tonaż, symulację wyścigu, periodyzację lub gotowość do treningu.
        </p>

        {/* User Account & Cloud Sync Status Card */}
        <div className="mt-4 pt-4 border-t border-neutral-800/80">
          {user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-9 h-9 rounded-xl border border-neutral-700 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-neutral-950 font-black flex items-center justify-center text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      Chmura Firestore aktywna
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onGoogleSignOut}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-red-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Wyloguj się"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Wyloguj</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0 mt-0.5">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Tryb lokalny (Pamięć tego urządzenia)
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                    Twoje treningi są zapisane lokalnie. Zaloguj się, aby zsynchronizować je z chmurą i innymi urządzeniami.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onGoogleSignIn}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 shrink-0 active:scale-[0.98]"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Zaloguj się przez Google</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5 Analytical Modules List */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-black uppercase text-neutral-400 tracking-wider px-1 font-heading">
          Analiza & Symulatory
        </span>

        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSubViewChange(item.id)}
              className="w-full p-4 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-amber-400/50 hover:bg-neutral-900/80 transition-all text-left flex items-center justify-between gap-3 cursor-pointer group shadow-sm touch-manipulation min-h-[68px] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`p-3 rounded-2xl border transition-transform group-hover:scale-105 shrink-0 ${item.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors font-heading">
                      {item.title}
                    </h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-neutral-950 text-neutral-400 font-bold border border-neutral-800 hidden sm:inline">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Utilities Section: Google Sheets & Stoper */}
      <div className="space-y-2.5 pt-2">
        <span className="text-[11px] font-black uppercase text-neutral-400 tracking-wider px-1 font-heading">
          Narzędzia & Eksport
        </span>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={onOpenSheetsModal}
            className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-all text-left cursor-pointer group touch-manipulation min-h-[70px]"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit mb-2 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
              Google Sheets
            </h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {spreadsheetId ? 'Synchronizuj próby' : 'Połącz arkusz'}
            </p>
          </button>

          <button
            onClick={onToggleTimer}
            className={`p-4 rounded-3xl border transition-all text-left cursor-pointer group touch-manipulation min-h-[70px] ${
              isTimerOpen
                ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 hover:border-amber-400/40 text-white'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl border w-fit mb-2 group-hover:scale-105 transition-transform ${
                isTimerOpen
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-neutral-950 text-amber-400 border-neutral-800'
              }`}
            >
              <Timer className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold group-hover:text-amber-400 transition-colors">
              Stoper Przerw
            </h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {isTimerOpen ? 'Aktywny na ekranie' : 'Otwórz timer'}
            </p>
          </button>
        </div>

        {/* Excel / CSV Export Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full p-4 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-amber-400/50 hover:bg-neutral-900/90 transition-all text-left flex items-center justify-between gap-3 cursor-pointer group shadow-sm touch-manipulation active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl border transition-transform group-hover:scale-105 shrink-0 bg-amber-400/10 text-amber-400 border-amber-400/20">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                    Pobierz moje dane (Excel)
                  </h4>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-neutral-950 text-neutral-400 font-bold border border-neutral-800">
                    CSV / Excel
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {exportNotice
                    ? exportNotice
                    : `Eksportuj pełną historię ${workoutLogs.length} serii i ćwiczeń do arkusza`}
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-neutral-800 group-hover:bg-amber-400 group-hover:text-black text-neutral-300 text-xs font-bold transition-all shrink-0">
              Pobierz .csv
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
