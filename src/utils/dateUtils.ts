/**
 * Utilities for local date string formatting, comparison, and deduplication
 * Prevents UTC off-by-one errors (e.g. 10-17 instead of 10-18 in European timezones)
 */

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const extractLogDate = (log: { dateStr?: string; timestamp?: string }): string => {
  if (log.dateStr && /^\d{4}-\d{2}-\d{2}$/.test(log.dateStr)) {
    return log.dateStr;
  }
  if (log.timestamp) {
    try {
      const d = new Date(log.timestamp);
      if (!isNaN(d.getTime())) {
        return getLocalDateString(d);
      }
    } catch {
      // fallback
    }
    const tSplit = log.timestamp.split('T')[0];
    if (tSplit && /^\d{4}-\d{2}-\d{2}$/.test(tSplit)) {
      return tSplit;
    }
  }
  return getLocalDateString();
};

export const compareLogsDescending = (
  a: { dateStr?: string; timestamp?: string; setNumber?: number },
  b: { dateStr?: string; timestamp?: string; setNumber?: number }
): number => {
  const dateA = a.dateStr || (a.timestamp ? a.timestamp.split('T')[0] : '');
  const dateB = b.dateStr || (b.timestamp ? b.timestamp.split('T')[0] : '');

  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }

  const timeA = a.timestamp || '';
  const timeB = b.timestamp || '';
  if (timeA && timeB && timeA !== timeB) {
    return timeB.localeCompare(timeA);
  }

  return (a.setNumber || 1) - (b.setNumber || 1);
};

export function sanitizeAndDeduplicateLogs<T extends { timestamp?: string; dateStr?: string; exerciseName?: string; setNumber?: number }>(
  logs: T[]
): T[] {
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const sorted = [...logs].sort((a, b) => {
    const tA = a.timestamp || a.dateStr || '';
    const tB = b.timestamp || b.dateStr || '';
    return tA.localeCompare(tB);
  });

  const map = new Map<string, T>();

  sorted.forEach((log) => {
    const date = extractLogDate(log);
    const exNorm = (log.exerciseName || '').trim().toLowerCase();
    const setNum = log.setNumber || 1;

    const key = `${date}___${exNorm}___set${setNum}`;
    map.set(key, { ...log, dateStr: date });
  });

  return Array.from(map.values());
}
