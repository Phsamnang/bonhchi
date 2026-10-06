export const TIMEZONE = 'Asia/Phnom_Penh';

/**
 * Returns current date in Phnom Penh timezone as 'YYYY-MM-DD'
 */
export function getPhnomPenhDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns current time in Phnom Penh timezone as 'HH:mm:ss'
 */
export function getPhnomPenhTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Returns localized date string in Khmer (e.g. "អង្គារ 6 តុលា 2026")
 */
export function getPhnomPenhDateKhmer(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('km-KH', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Returns formatted date and time in Phnom Penh timezone ('YYYY-MM-DD HH:mm:ss')
 */
export function getPhnomPenhDateTime(date: Date = new Date()): string {
  return `${getPhnomPenhDate(date)} ${getPhnomPenhTime(date)}`;
}
