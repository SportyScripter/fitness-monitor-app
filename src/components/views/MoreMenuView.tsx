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
  Scale
} from 'lucide-react';
import { User } from 'firebase/auth';
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
  activeCycle: TrainingCycleCatalog;
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
            activeCycle={activeCycle}
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
            allWeeksPlans={activeCycle.weeksPlansMap || {}}
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

        {/* User Account / Google Sheets Status Card */}
        <div className="mt-4 pt-4 border-t border-neutral-800/80 flex items-center justify-between gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-xs">
                <span className="font-bold text-white block">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {spreadsheetId ? 'Google Sheets połączony' : 'Konto Google aktywne'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-400">
              <span className="font-bold text-neutral-300 block">Konto Google</span>
              <span className="text-[10px]">Zaloguj się, aby zsynchronizować z Sheets</span>
            </div>
          )}

          {user ? (
            <button
              onClick={onGoogleSignOut}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-red-400 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Wyloguj</span>
            </button>
          ) : (
            <button
              onClick={onGoogleSignIn}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all cursor-pointer shadow-sm"
            >
              Zaloguj Google
            </button>
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
      </div>
    </div>
  );
};
