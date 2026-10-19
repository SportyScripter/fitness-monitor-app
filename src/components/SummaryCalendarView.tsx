import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Dumbbell,
  Zap,
  Activity,
  Award,
  HeartPulse,
  Sliders,
  Flame,
  Clock,
  TrendingUp,
  MapPin,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { WorkoutLogEntry, SessionActivityType, MuscleGroup } from '../types/hyrox';
import { AddFreeWorkoutModal } from './AddFreeWorkoutModal';

interface SummaryCalendarViewProps {
  workoutLogs: WorkoutLogEntry[];
  onAddWorkoutLogs: (entries: WorkoutLogEntry[]) => void;
  onDeleteWorkoutLogEntry?: (logId: string) => void;
  onDeleteWorkoutSession?: (sessionId: string, dateStr: string) => void;
}

interface GroupedSession {
  sessionId: string;
  sessionTitle: string;
  activityType: SessionActivityType;
  dateStr: string;
  timeStr?: string;
  durationMinutes?: number;
  distanceKm?: number;
  totalTonnageKg: number;
  totalSets: number;
  avgRpe: number;
  sessionNotes?: string;
  entries: WorkoutLogEntry[];
}

export const SummaryCalendarView: React.FC<SummaryCalendarViewProps> = ({
  workoutLogs = [],
  onAddWorkoutLogs,
  onDeleteWorkoutLogEntry,
  onDeleteWorkoutSession,
}) => {
  // Calendar View Month/Year State
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterActivity, setFilterActivity] = useState<SessionActivityType | 'ALL'>('ALL');
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDateStr(todayStr);
  };

  // Group workout logs into distinct sessions by date & sessionId / dayTitle
  const sessionsByDate = useMemo(() => {
    const map: Record<string, GroupedSession[]> = {};

    workoutLogs.forEach((log) => {
      const date = log.dateStr || (log.timestamp ? log.timestamp.split('T')[0] : '');
      if (!date) return;

      if (!map[date]) {
        map[date] = [];
      }

      // Determine sessionId (fallback to dayId + timestamp hour/dayTitle if not present)
      const effectiveSessionId =
        log.sessionId ||
        `${log.dayId || 'day'}-${(log.timestamp || '').slice(0, 13) || log.dayTitle || 'session'}`;

      let session = map[date].find(
        (s) =>
          s.sessionId === effectiveSessionId ||
          (log.sessionTitle && s.sessionTitle && s.sessionTitle === log.sessionTitle) ||
          (log.dayId && s.sessionId.includes(log.dayId))
      );

      if (!session) {
        // Detect activity type if not explicitly set
        let detectedType: SessionActivityType = log.activityType || 'STRENGTH';
        if (!log.activityType) {
          const titleLower = (log.dayTitle || '').toLowerCase();
          const exLower = (log.exerciseName || '').toLowerCase();
          if (titleLower.includes('bieg') || exLower.includes('bieg') || log.muscleGroup?.includes('Biegowy')) {
            detectedType = 'RUNNING';
          } else if (titleLower.includes('hyrox') || titleLower.includes('weekend')) {
            detectedType = 'HYROX';
          } else if (titleLower.includes('rower') || titleLower.includes('bike') || exLower.includes('rower')) {
            detectedType = 'CYCLING';
          } else if (titleLower.includes('regen') || titleLower.includes('mobility')) {
            detectedType = 'RECOVERY';
          }
        }

        let timeStr = '';
        if (log.timestamp && log.timestamp.includes('T')) {
          const parts = log.timestamp.split('T')[1]?.split(':');
          if (parts && parts.length >= 2) {
            timeStr = `${parts[0]}:${parts[1]}`;
          }
        }

        session = {
          sessionId: effectiveSessionId,
          sessionTitle: log.sessionTitle || log.dayTitle || 'Trening',
          activityType: detectedType,
          dateStr: date,
          timeStr,
          durationMinutes: log.durationMinutes || 60,
          distanceKm: log.distanceKm,
          totalTonnageKg: 0,
          totalSets: 0,
          avgRpe: 0,
          sessionNotes: log.sessionNotes,
          entries: [],
        };
        map[date].push(session);
      }

      session.entries.push(log);
      session.totalTonnageKg += Number(log.tonnageKg) || 0;
      session.totalSets += 1;
      if (log.durationMinutes && !session.durationMinutes) {
        session.durationMinutes = log.durationMinutes;
      }
      if (log.distanceKm && !session.distanceKm) {
        session.distanceKm = log.distanceKm;
      }
      if (log.sessionNotes && !session.sessionNotes) {
        session.sessionNotes = log.sessionNotes;
      }
    });

    // Calculate average RPE per session
    Object.values(map).forEach((sessions) => {
      sessions.forEach((s) => {
        if (s.entries.length > 0) {
          const sumRpe = s.entries.reduce((sum, e) => sum + (e.rpe || 8), 0);
          s.avgRpe = Number((sumRpe / s.entries.length).toFixed(1));
        }
      });
    });

    return map;
  }, [workoutLogs]);

  // Strava-style Monthly Stats Calculations
  const monthlyStats = useMemo(() => {
    let workoutsCount = 0;
    let totalTonnageKg = 0;
    let totalDistanceKm = 0;
    let totalMinutes = 0;
    const activeDaysSet = new Set<string>();

    const targetPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    Object.entries(sessionsByDate).forEach(([dateStr, sessions]) => {
      if (dateStr.startsWith(targetPrefix)) {
        sessions.forEach((s) => {
          workoutsCount += 1;
          totalTonnageKg += s.totalTonnageKg;
          totalDistanceKm += s.distanceKm || 0;
          totalMinutes += s.durationMinutes || 60;
          activeDaysSet.add(dateStr);
        });
      }
    });

    // Calculate current streak (consecutive active days backwards from today)
    let streakDays = 0;
    const checkDate = new Date();
    // If today had no workout, also check yesterday as start of streak
    const checkTodayStr = checkDate.toISOString().split('T')[0];
    let offset = sessionsByDate[checkTodayStr] && sessionsByDate[checkTodayStr].length > 0 ? 0 : 1;

    for (let i = offset; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      if (sessionsByDate[str] && sessionsByDate[str].length > 0) {
        streakDays += 1;
      } else {
        break;
      }
    }

    return {
      workoutsCount,
      totalTonnageKg,
      totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
      totalHours: Math.floor(totalMinutes / 60),
      totalRemainingMinutes: totalMinutes % 60,
      activeDaysCount: activeDaysSet.size,
      streakDays,
    };
  }, [sessionsByDate, currentYear, currentMonth]);

  // Calendar Grid Builder (Monday-based European calendar)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const numDaysInMonth = lastDayOfMonth.getDate();

    // In JS getDay(): Sunday = 0, Monday = 1, ..., Saturday = 6.
    // For Monday-based calendar: Monday = 0, ..., Sunday = 6.
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      sessions: GroupedSession[];
    }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const pMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const pYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const pDateStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
      days.push({
        dateStr: pDateStr,
        dayNum: pDay,
        isCurrentMonth: false,
        isToday: pDateStr === todayStr,
        sessions: sessionsByDate[pDateStr] || [],
      });
    }

    // Current month days
    for (let day = 1; day <= numDaysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        sessions: sessionsByDate[dateStr] || [],
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remainingCells = 7 - (days.length % 7);
    if (remainingCells < 7) {
      for (let day = 1; day <= remainingCells; day++) {
        const nMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const nDateStr = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        days.push({
          dateStr: nDateStr,
          dayNum: day,
          isCurrentMonth: false,
          isToday: nDateStr === todayStr,
          sessions: sessionsByDate[nDateStr] || [],
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, sessionsByDate, todayStr]);

  // Polish month names
  const monthNamesPolish = [
    'Styczeń',
    'Luty',
    'Marzec',
    'Kwiecień',
    'Maj',
    'Czerwiec',
    'Lipiec',
    'Sierpień',
    'Wrzesień',
    'Październik',
    'Listopad',
    'Grudzień',
  ];

  const polishWeekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  // Helper for discipline badges
  const getActivityBadge = (type: SessionActivityType) => {
    switch (type) {
      case 'RUNNING':
        return {
          icon: Zap,
          label: 'Bieg',
          bg: 'bg-red-500/15 border-red-500/30 text-red-400',
          dot: 'bg-red-500',
        };
      case 'STRENGTH':
        return {
          icon: Dumbbell,
          label: 'Siła',
          bg: 'bg-amber-400/15 border-amber-400/30 text-amber-300',
          dot: 'bg-amber-400',
        };
      case 'CYCLING':
        return {
          icon: Activity,
          label: 'Rower',
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          dot: 'bg-emerald-400',
        };
      case 'HYROX':
        return {
          icon: Award,
          label: 'Hyrox',
          bg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
          dot: 'bg-purple-400',
        };
      case 'RECOVERY':
        return {
          icon: HeartPulse,
          label: 'Regeneracja',
          bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
          dot: 'bg-cyan-400',
        };
      default:
        return {
          icon: Sliders,
          label: 'Trening',
          bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
          dot: 'bg-blue-400',
        };
    }
  };

  // Selected date sessions
  const selectedDaySessions = useMemo(() => {
    const rawSessions = sessionsByDate[selectedDateStr] || [];
    if (filterActivity === 'ALL') return rawSessions;
    return rawSessions.filter((s) => s.activityType === filterActivity);
  }, [sessionsByDate, selectedDateStr, filterActivity]);

  const toggleSessionExpand = (id: string) => {
    setExpandedSessionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Format nice Polish date for the details header
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateStr) return '';
    const parts = selectedDateStr.split('-');
    if (parts.length < 3) return selectedDateStr;
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayName = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'][dateObj.getDay()];
    return `${dayName}, ${Number(parts[2])} ${monthNamesPolish[Number(parts[1]) - 1]} ${parts[0]}`;
  }, [selectedDateStr]);

  return (
    <div className="space-y-6">
      {/* Strava-Style Top Metrics Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-neutral-950 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-400 text-black shadow-md shadow-amber-400/20">
                Podsumowanie Aktywności
              </span>
              <span className="text-sm font-bold text-white font-heading">
                Kalendarz w Stylu Stravy
              </span>
              {monthlyStats.streakDays > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Seria: {monthlyStats.streakDays} {monthlyStats.streakDays === 1 ? 'dzień' : 'dni'}!</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Przeglądaj wszystkie wykonane sesje, tonaż siłowy i kilometry biegowe. Możesz zapisać kilka treningów w jednym dniu (np. poranna siła i wieczorny bieg).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Dodaj Trening</span>
            </button>
          </div>
        </div>

        {/* 4 Strava Summary Cards for Active Month */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Treningi ({monthNamesPolish[currentMonth]})</span>
              <CalendarIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono-numbers">
              {monthlyStats.workoutsCount}
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {monthlyStats.activeDaysCount} aktywnych dni w miesiącu
            </p>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Tonaż Miesięczny</span>
              <Dumbbell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono-numbers">
              {monthlyStats.totalTonnageKg.toLocaleString()} <span className="text-xs font-normal text-neutral-400">kg</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Przeniesiony ciężar w serii roboczych
            </p>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Biegi & Dystans</span>
              <Zap className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono-numbers">
              {monthlyStats.totalDistanceKm} <span className="text-xs font-normal text-neutral-400">km</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Zarejestrowany kilometraż kardio
            </p>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Łączny Czas</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono-numbers">
              {monthlyStats.totalHours}h {monthlyStats.totalRemainingMinutes}m
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Czas spędzony na aktywności fizycznej
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side Strava Monthly Calendar, Right Side Selected Day Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Calendar View (8 Cols on Desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          {/* Calendar Month Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <h3 className="text-lg sm:text-xl font-black text-white font-heading">
                {monthNamesPolish[currentMonth]} {currentYear}
              </h3>
              <button
                onClick={handleGoToday}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 transition-colors cursor-pointer"
              >
                Dzisiaj
              </button>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Poprzedni miesiąc"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Następny miesiąc"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Discipline Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <button
              onClick={() => setFilterActivity('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterActivity === 'ALL'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              Wszystkie ({monthlyStats.workoutsCount})
            </button>
            <button
              onClick={() => setFilterActivity('STRENGTH')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterActivity === 'STRENGTH'
                  ? 'bg-amber-400 text-black'
                  : 'bg-neutral-950 text-neutral-400 hover:text-amber-300 border border-neutral-800'
              }`}
            >
              <Dumbbell className="w-3 h-3" />
              <span>Siła</span>
            </button>
            <button
              onClick={() => setFilterActivity('RUNNING')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterActivity === 'RUNNING'
                  ? 'bg-red-500 text-white'
                  : 'bg-neutral-950 text-neutral-400 hover:text-red-300 border border-neutral-800'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Biegi</span>
            </button>
            <button
              onClick={() => setFilterActivity('CYCLING')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterActivity === 'CYCLING'
                  ? 'bg-emerald-500 text-black'
                  : 'bg-neutral-950 text-neutral-400 hover:text-emerald-300 border border-neutral-800'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Rower</span>
            </button>
            <button
              onClick={() => setFilterActivity('HYROX')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterActivity === 'HYROX'
                  ? 'bg-purple-600 text-white'
                  : 'bg-neutral-950 text-neutral-400 hover:text-purple-300 border border-neutral-800'
              }`}
            >
              <Award className="w-3 h-3" />
              <span>Hyrox</span>
            </button>
          </div>

          {/* Calendar 7-Column Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Weekday Labels (Pn, Wt, Śr, Cz, Pt, So, Nd) */}
            {polishWeekdays.map((wd, i) => (
              <div
                key={wd}
                className={`text-center py-1.5 text-[11px] font-black uppercase tracking-wider ${
                  i >= 5 ? 'text-amber-400/80' : 'text-neutral-400'
                }`}
              >
                {wd}
              </div>
            ))}

            {/* Day Cells */}
            {calendarDays.map((cell) => {
              const isSelected = cell.dateStr === selectedDateStr;
              const hasWorkouts = cell.sessions.length > 0;
              const matchingSessions =
                filterActivity === 'ALL'
                  ? cell.sessions
                  : cell.sessions.filter((s) => s.activityType === filterActivity);

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[74px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-850 border-amber-400 ring-2 ring-amber-400/80 shadow-lg shadow-amber-400/10'
                      : cell.isCurrentMonth
                      ? 'bg-neutral-950/80 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-900'
                      : 'bg-neutral-950/30 border-neutral-900/60 opacity-40 hover:opacity-75'
                  }`}
                >
                  {/* Top Bar inside cell: Day Number + Today Indicator */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono-numbers font-black ${
                        cell.isToday
                          ? 'w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-md shadow-amber-400/30'
                          : isSelected
                          ? 'text-amber-400'
                          : cell.isCurrentMonth
                          ? 'text-neutral-200'
                          : 'text-neutral-500'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Small count indicator if multiple workouts */}
                    {matchingSessions.length > 1 && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        {matchingSessions.length}x
                      </span>
                    )}
                  </div>

                  {/* Discipline Badges inside the cell */}
                  <div className="space-y-1 mt-1 w-full overflow-hidden">
                    {matchingSessions.slice(0, 2).map((s, idx) => {
                      const badge = getActivityBadge(s.activityType);
                      const Icon = badge.icon;
                      return (
                        <div
                          key={s.sessionId || idx}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[9px] font-bold truncate ${badge.bg}`}
                          title={`${s.sessionTitle} (${badge.label}) - ${s.totalTonnageKg ? s.totalTonnageKg + 'kg' : ''}`}
                        >
                          <Icon className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">
                            {s.activityType === 'RUNNING' && s.distanceKm
                              ? `${s.distanceKm}km`
                              : s.activityType === 'STRENGTH' && s.totalTonnageKg > 0
                              ? `${Math.round(s.totalTonnageKg / 1000)}t`
                              : s.sessionTitle}
                          </span>
                        </div>
                      );
                    })}

                    {matchingSessions.length > 2 && (
                      <div className="text-[9px] text-neutral-400 font-bold pl-1">
                        +{matchingSessions.length - 2} więcej
                      </div>
                    )}
                  </div>

                  {/* Selected bar indicator */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Workouts Detail Panel (5 Cols on Desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          {/* Day Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold mb-0.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Szczegóły Dnia</span>
              </div>
              <h4 className="text-base font-black text-white font-heading">
                {formattedSelectedDate}
              </h4>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black transition-colors cursor-pointer shadow-md shadow-amber-400/20"
              title="Dodaj trening w tym dniu"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List of sessions on this date */}
          {selectedDaySessions.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-neutral-300">
                Brak zarejestrowanych treningów w tym dniu
              </div>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Możesz zarejestrować trening wykonany w tym dniu (siła, bieg, rower, hyrox).
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Dodaj Trening w Tym Dniu</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-bold">
                  Wykonane jednostki ({selectedDaySessions.length}):
                </span>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Kolejny trening</span>
                </button>
              </div>

              {selectedDaySessions.map((session, sIdx) => {
                const badge = getActivityBadge(session.activityType);
                const Icon = badge.icon;
                const isExpanded = !!expandedSessionIds[session.sessionId];

                return (
                  <div
                    key={session.sessionId || sIdx}
                    className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden"
                  >
                    {/* Top colored badge accent */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg border text-xs ${badge.bg}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-xs font-black text-white font-heading">
                            {session.sessionTitle}
                          </div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-2">
                            <span>{badge.label}</span>
                            {session.timeStr && <span>• {session.timeStr}</span>}
                            <span>• ~{session.durationMinutes} min</span>
                          </div>
                        </div>
                      </div>

                      {onDeleteWorkoutSession && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Czy na pewno chcesz usunąć tę jednostkę treningową: "${session.sessionTitle}"?`)) {
                              onDeleteWorkoutSession(session.sessionId, session.dateStr);
                            }
                          }}
                          className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Usuń ten trening"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Stats pill strip */}
                    {(() => {
                      const sessionWorkSec = session.entries.reduce((sum, e) => sum + (e.setDurationSec || 0), 0);
                      const sessionRestSec = session.entries.reduce((sum, e) => sum + (e.restDurationSec || 0), 0);

                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800/80 text-center">
                            {session.totalTonnageKg > 0 ? (
                              <div>
                                <div className="text-[10px] text-neutral-400 uppercase font-bold">Tonaż</div>
                                <div className="text-xs font-black text-amber-400 font-mono-numbers">
                                  {session.totalTonnageKg.toLocaleString()} kg
                                </div>
                              </div>
                            ) : session.distanceKm ? (
                              <div>
                                <div className="text-[10px] text-neutral-400 uppercase font-bold">Dystans</div>
                                <div className="text-xs font-black text-red-400 font-mono-numbers">
                                  {session.distanceKm} km
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-[10px] text-neutral-400 uppercase font-bold">Czas</div>
                                <div className="text-xs font-black text-white font-mono-numbers">
                                  {session.durationMinutes} min
                                </div>
                              </div>
                            )}

                            <div>
                              <div className="text-[10px] text-neutral-400 uppercase font-bold">Serie</div>
                              <div className="text-xs font-black text-white font-mono-numbers">
                                {session.totalSets}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] text-neutral-400 uppercase font-bold">Śr. RPE</div>
                              <div className="text-xs font-black text-white font-mono-numbers">
                                {session.avgRpe} / 10
                              </div>
                            </div>
                          </div>

                          {/* Garmin Timing Summary if recorded */}
                          {(sessionWorkSec > 0 || sessionRestSec > 0) && (
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] font-mono-numbers">
                              <span className="text-neutral-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-white" />
                                <span>Praca: <strong className="text-white">{Math.floor(sessionWorkSec / 60)}m {sessionWorkSec % 60}s</strong></span>
                              </span>
                              <span className="text-neutral-400 flex items-center gap-1">
                                <span className="text-amber-400">☕</span>
                                <span>Przerwy: <strong className="text-amber-400">{Math.floor(sessionRestSec / 60)}m {sessionRestSec % 60}s</strong></span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Notes if any */}
                    {session.sessionNotes && (
                      <div className="text-[11px] text-neutral-300 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800 italic">
                        "{session.sessionNotes}"
                      </div>
                    )}

                    {/* Exercises Accordion */}
                    {session.entries.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleSessionExpand(session.sessionId)}
                          className="w-full flex items-center justify-between text-[11px] font-bold text-neutral-400 hover:text-white pt-1 border-t border-neutral-850 cursor-pointer"
                        >
                          <span>Wykaz serii ({session.entries.length} pozycji)</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="space-y-1.5 mt-2 max-h-56 overflow-y-auto pr-1">
                            {session.entries.map((entry, eIdx) => {
                              const exUnit = entry.unit || 'kg';
                              return (
                                <div
                                  key={entry.id || eIdx}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-neutral-900 px-2.5 py-2 rounded-lg border border-neutral-800 text-[11px] gap-1"
                                >
                                  <div className="truncate pr-2">
                                    <span className="font-bold text-white">{entry.exerciseName}</span>{' '}
                                    <span className="text-neutral-400">
                                      • S{entry.setNumber}:{' '}
                                      {entry.weightKg > 0 ? (
                                        <strong className="text-white font-mono-numbers">{entry.weightKg} {exUnit} × {entry.reps}</strong>
                                      ) : entry.targetDistance ? (
                                        <strong className="text-white font-mono-numbers">{entry.targetDistance} {entry.distanceUnit || 'km'}</strong>
                                      ) : (
                                        <strong className="text-white font-mono-numbers">{entry.reps} powt.</strong>
                                      )}
                                    </span>

                                    {/* Pace & HR if recorded */}
                                    {entry.targetPace &&
                                    entry.targetPace.trim() !== '' &&
                                    entry.targetPace.trim() !== '0' && (
                                      <span className="ml-1.5 text-emerald-400 font-bold">
                                        • {entry.actualPace || entry.targetPace}
                                      </span>
                                    )}
                                    {entry.targetHR && Number(entry.targetHR) > 0 && (
                                      <span className="ml-1.5 text-rose-400 font-bold">
                                        • {entry.actualHR || entry.targetHR} bpm
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono-numbers text-[10px]">
                                    {entry.setDurationSec && (
                                      <span className="px-1.5 py-0.5 rounded bg-white text-black font-bold">
                                        ⏱️ {entry.setDurationSec}s
                                      </span>
                                    )}
                                    {entry.restDurationSec && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                                        ☕ {entry.restDurationSec}s
                                      </span>
                                    )}
                                    {entry.tonnageKg > 0 && (
                                      <span className="text-amber-400 font-bold">
                                        {entry.tonnageKg} kg
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Free Workout Modal */}
      {isAddModalOpen && (
        <AddFreeWorkoutModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          defaultDate={selectedDateStr}
          onSaveWorkout={(entries) => {
            onAddWorkoutLogs(entries);
          }}
        />
      )}
    </div>
  );
};
