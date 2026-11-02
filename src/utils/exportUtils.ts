import { WorkoutLogEntry } from '../types/hyrox';
import { extractLogDate } from './dateUtils';

/**
 * Formats workout logs into a flat CSV format fully compatible with Microsoft Excel.
 * Includes UTF-8 BOM (\uFEFF) and semicolon (;) delimiters for Polish/European locale support.
 */
export function generateWorkoutCSV(logs: WorkoutLogEntry[]): string {
  const headers = [
    'Data treningu',
    'Dzień / Nazwa jednostki',
    'Ćwiczenie',
    'Kategoria',
    'Partia mięśniowa',
    'Numer serii',
    'Ciężar [kg]',
    'Powtórzenia',
    'Tonaż serii [kg]',
    'RIR (Zapasy)',
    'RPE (Wysiłek)',
    'Dystans [km/m]',
    'Tempo / Czas',
    'Tętno [bpm]',
    'Przerwa [s]',
    'Notatka',
  ];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    if (str.includes(';') || str.includes('\n') || str.includes('"') || str.includes(',')) {
      return `"${str}"`;
    }
    return str;
  };

  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = extractLogDate(a);
    const dateB = extractLogDate(b);
    if (dateA !== dateB) return dateB.localeCompare(dateA); // newest first
    const exComp = (a.exerciseName || '').localeCompare(b.exerciseName || '');
    if (exComp !== 0) return exComp;
    return (a.setNumber || 1) - (b.setNumber || 1);
  });

  const rows = sortedLogs.map((log) => {
    const weight = typeof log.weightKg === 'number' ? log.weightKg : 0;
    const reps = typeof log.reps === 'number' ? log.reps : 0;
    const volume = Number((weight * reps).toFixed(1));

    const category = (log as any).category || log.activityType || 'siła';
    const distance = log.distanceKm
      ? `${log.distanceKm} km`
      : (log as any).distanceMeters
      ? `${(log as any).distanceMeters} m`
      : '';
    const pace = log.actualPace || log.targetPace || (log as any).pace || '';
    const hr = log.actualHR || log.targetHR || (log as any).heartRateBpm || '';
    const rest = log.restDurationSec || (log as any).restSeconds || '';

    return [
      escapeCSV(extractLogDate(log)),
      escapeCSV(log.dayTitle || log.dayId || ''),
      escapeCSV(log.exerciseName || ''),
      escapeCSV(category),
      escapeCSV(log.muscleGroup || ''),
      escapeCSV(log.setNumber || 1),
      escapeCSV(weight > 0 ? weight : 'Masa ciała'),
      escapeCSV(reps > 0 ? reps : ''),
      escapeCSV(volume > 0 ? volume : ''),
      escapeCSV(log.rir !== undefined ? log.rir : ''),
      escapeCSV(log.rpe !== undefined ? log.rpe : ''),
      escapeCSV(distance),
      escapeCSV(pace),
      escapeCSV(hr),
      escapeCSV(rest),
      escapeCSV(log.notes || log.sessionNotes || ''),
    ].join(';');
  });

  // \uFEFF is UTF-8 Byte Order Mark for Excel
  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

/**
 * Triggers a browser download of the CSV file using Blob and Object URL.
 */
export function downloadWorkoutDataCSV(logs: WorkoutLogEntry[], filename?: string): void {
  const csvContent = generateWorkoutCSV(logs);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `treningi_hyrox_eksport_${today}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
