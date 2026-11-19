/**
 * Shared conversion helpers for running pace (m:ss / mm:ss) and speed (km/h).
 */

/**
 * Parses a strict, complete pace input string ("m:ss" or "mm:ss", seconds 00-59)
 * into total seconds. Returns null if the string is incomplete or invalid
 * (e.g. "3:", "3:5", "3:75", ""), preventing cursor jumps or NaN while typing.
 */
export const parseStrictPaceToSeconds = (paceStr?: string): number | null => {
  if (!paceStr) return null;
  const trimmed = paceStr.trim();
  const match = trimmed.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  const totalSec = mins * 60 + secs;
  return totalSec > 0 ? totalSec : null;
};

/**
 * Flexible pace parser for historical records (e.g. "4:15", "4:15 min/km", "4.25").
 * Returns total seconds, or 0 if invalid.
 */
export const parseFlexiblePaceToSeconds = (paceStr?: string): number => {
  if (!paceStr) return 0;
  const match = paceStr.match(/(\d+):(\d{2})/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    if (secs < 60) {
      return mins * 60 + secs;
    }
  }
  const num = parseFloat(paceStr.replace(',', '.'));
  if (!isNaN(num) && num > 0) {
    const mins = Math.floor(num);
    const secs = Math.round((num - mins) * 60);
    return mins * 60 + secs;
  }
  return 0;
};

/**
 * Formats total seconds into m:ss pace string (e.g. 212 -> "3:32").
 */
export const formatSecondsToPaceString = (totalSeconds: number): string => {
  if (!totalSeconds || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return '';
  const rounded = Math.round(totalSeconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Converts speed in km/h (e.g. 17 or "17.5") into pace string ("3:32").
 * Formula: minutes = 60 / speed.
 * Returns null if speed input is incomplete or invalid.
 */
export const speedToPace = (speedInput: number | string | undefined | null): string | null => {
  if (speedInput === undefined || speedInput === null) return null;
  const str = String(speedInput).trim().replace(',', '.');
  if (!str || !/^\d+(\.\d+)?$/.test(str)) return null;
  const speed = parseFloat(str);
  if (!Number.isFinite(speed) || speed <= 0) return null;

  const totalSeconds = (60 / speed) * 60;
  return formatSecondsToPaceString(totalSeconds);
};

/**
 * Converts a complete pace string ("m:ss" or "mm:ss") into speed in km/h
 * rounded to 1 decimal place.
 * Formula: speed = 60 / (minutes + seconds / 60).
 * Returns null if pace is incomplete/invalid.
 */
export const paceToSpeed = (paceStr?: string, flexible = false): number | null => {
  const totalSec = flexible
    ? parseFlexiblePaceToSeconds(paceStr)
    : parseStrictPaceToSeconds(paceStr);
  if (!totalSec || totalSec <= 0) return null;
  const totalMinutes = totalSec / 60;
  const speed = 60 / totalMinutes;
  if (!Number.isFinite(speed) || speed <= 0) return null;
  return Math.round(speed * 10) / 10;
};

/**
 * Formats a speed number for display in an input field (e.g. 17.0 -> "17", 17.5 -> "17.5").
 */
export const formatSpeedForInput = (speed: number | string | undefined | null, fallbackPace?: string): string => {
  if (speed !== undefined && speed !== null && String(speed).trim() !== '') {
    const parsed = parseFloat(String(speed).replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      return String(Math.round(parsed * 10) / 10);
    }
  }
  if (fallbackPace) {
    const derived = paceToSpeed(fallbackPace, true);
    if (derived !== null) return String(derived);
  }
  return '';
};
