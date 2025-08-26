/**
 * Uzbekistan timezone utility functions
 * Uzbekistan is UTC+5 (no DST)
 */

/**
 * Get current time in Uzbekistan timezone
 * @returns Date object representing current time in Uzbekistan
 */
export function getUzbekistanTime(): Date {
  // Create a new Date in Uzbekistan timezone
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const uzbekistanTime = new Date(utc + (5 * 3600000)); // UTC+5
  return uzbekistanTime;
}

/**
 * Get current hour in Uzbekistan timezone (0-23)
 * @returns Current hour number in Uzbekistan
 */
export function getCurrentHourInUzbekistan(): number {
  return getUzbekistanTime().getHours();
}

/**
 * Format a date to Uzbekistan time string
 * @param date Date to format
 * @returns Formatted string in DD.MM.YYYY HH:MM format
 */
export function formatUzbekistanTime(date: Date): string {
  // Convert the given date to Uzbekistan timezone
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const uzbekTime = new Date(utc + (5 * 3600000)); // UTC+5

  const day = String(uzbekTime.getDate()).padStart(2, '0');
  const month = String(uzbekTime.getMonth() + 1).padStart(2, '0');
  const year = uzbekTime.getFullYear();
  const hours = String(uzbekTime.getHours()).padStart(2, '0');
  const minutes = String(uzbekTime.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Check if a given time is after 12:00 PM in Uzbekistan timezone
 * @param date Optional date to check, defaults to current time
 * @returns true if the time is after 12:00 PM Uzbekistan time
 */
export function isAfterNoonInUzbekistan(date?: Date): boolean {
  const checkDate = date || new Date();
  const utc = checkDate.getTime() + (checkDate.getTimezoneOffset() * 60000);
  const uzbekTime = new Date(utc + (5 * 3600000)); // UTC+5
  return uzbekTime.getHours() >= 12;
}