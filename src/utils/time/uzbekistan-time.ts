/**
 * Uzbekistan timezone utility functions
 * Uzbekistan is UTC+5 (no DST)
 */

/**
 * Get current time in Uzbekistan timezone
 * @returns Date object representing current time in Uzbekistan
 */
export function getUzbekistanTime(): Date {
  // Return current time normalized to Uzbekistan (UTC+5) without double shifting
  return convertToUzbekistan(new Date());
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
  // NOTE: DBga saqlangan vaqtlar allaqachon Uzbekistan lokalida (shift qilingan),
  // shuning uchun qo'shimcha +5 soat siljitmaymiz, faqat formatlaymiz.
  const d = date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Only HH:MM (Uzbekistan time)
export function formatUzbekistanHourMinute(date: Date): string {
  const d = date; // saqlangan lokal vaqt
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Raw hour:minute (no timezone adjustment) for values intentionally stored "as entered"
export function formatRawHourMinute(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Check if a given time is after 12:00 PM in Uzbekistan timezone
 * @param date Optional date to check, defaults to current time
 * @returns true if the time is after 12:00 PM Uzbekistan time
 */
export function isAfterNoonInUzbekistan(date?: Date): boolean {
  const uz = convertToUzbekistan(date || new Date());
  return uz.getHours() >= 12;
}

/**
 * Convert any Date to Uzbekistan local time representation (UTC+5) without double shifting
 * If the runtime is already in UTC+5 (getTimezoneOffset === -300) we return the date as-is.
 * Otherwise we shift from its real UTC value to UTC+5.
 */
export function convertToUzbekistan(date: Date): Date {
  const targetOffsetMinutes = -300; // UTC+5
  const currentOffsetMinutes = date.getTimezoneOffset();
  if (currentOffsetMinutes === targetOffsetMinutes) {
    return date;
  }
  const utc = date.getTime() + currentOffsetMinutes * 60000; // normalize to UTC ms
  return new Date(utc - targetOffsetMinutes * 60000); // apply target offset
}
