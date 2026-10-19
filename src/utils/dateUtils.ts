/**
 * Utilities for local date string formatting and comparison
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
