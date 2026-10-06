import { getPhnomPenhDateTime } from './timezone.js';

export const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] ${getPhnomPenhDateTime()} - ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${getPhnomPenhDateTime()} - ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${getPhnomPenhDateTime()} - ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${getPhnomPenhDateTime()} - ${msg}`, ...args);
    }
  },
};
