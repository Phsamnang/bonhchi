import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount || 0;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatKhr(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseInt(amount, 10) : amount || 0;
  return `${Math.round(num).toLocaleString("en-US")} ៛`;
}

/** YYYY-MM-DD in the viewer's local time (DB dates arrive as UTC timestamps) */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s.slice(0, 10) : d.toLocaleDateString("en-CA");
}
