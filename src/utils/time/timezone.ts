// Timezone utilities
// Default timezone Asia/Tashkent (UTC+5, no DST)
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Tashkent';

// Returns a Date object representing current time in target timezone
export function nowInTz(): Date {
  // toLocaleString with timeZone then new Date parses in local runtime tz
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: APP_TIMEZONE })
  );
}

// Returns YYYY-MM-DD string in target timezone
export function currentDateString(): string {
  const d = nowInTz();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Format time HH:MM for user display in target timezone
export function formatTimeHM(date: Date): string {
  const d = new Date(
    date.toLocaleString('en-US', { timeZone: APP_TIMEZONE })
  );
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
