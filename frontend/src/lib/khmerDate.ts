import { formatDate } from "./utils";

export const KH_MONTHS = [
  "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
  "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ",
];

export const pad = (n: number) => String(n).padStart(2, "0");

/** "ថ្ងៃទី 07 ខែតុលា ឆ្នាំ 2026" */
export const khDate = (d: Date) =>
  `ថ្ងៃទី ${pad(d.getDate())} ខែ${KH_MONTHS[d.getMonth()]} ឆ្នាំ ${d.getFullYear()}`;

/** "YYYY-MM-DD" → local Date (no UTC shift) */
export const parseYmd = (value: string) => {
  const [y, m, d] = formatDate(value).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** DD/MM/YYYY — the order people in Cambodia read dates in */
export const dmy = (value: string) => {
  const [y, m, d] = formatDate(value).split("-");
  return d ? `${d}/${m}/${y}` : value;
};
