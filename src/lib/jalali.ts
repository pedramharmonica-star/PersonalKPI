import { toJalaali, toGregorian, jalaaliMonthLength } from 'jalaali-js';
import type { PeriodKind } from './types';

export const MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
export const QUARTERS = ['بهار (سه‌ماهه اول)','تابستان (سه‌ماهه دوم)','پاییز (سه‌ماهه سوم)','زمستان (سه‌ماهه چهارم)'];
export const QUARTER_SHORT = ['بهار','تابستان','پاییز','زمستان'];
export const HALVES = ['نیمه اول','نیمه دوم'];
export const KIND_LABEL: Record<PeriodKind, string> = {
  month: 'ماهانه', quarter: 'سه‌ماهه', half: 'شش‌ماهه', year: 'سالانه', custom: 'تاریخ دلخواه',
};

const pad = (n: number) => String(n).padStart(2, '0');
export const fmt = (y: number, m: number, d: number) => `${y}/${pad(m)}/${pad(d)}`;

export function parseJ(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec((s || '').trim());
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > jalaaliMonthLength(y, mo)) return null;
  return { y, m: mo, d };
}

export function todayJ() {
  const t = new Date();
  const j = toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());
  return { y: j.jy, m: j.jm, d: j.jd };
}

export function toTime(s: string): number {
  const p = parseJ(s);
  if (!p) return 0;
  const g = toGregorian(p.y, p.m, p.d);
  return new Date(g.gy, g.gm - 1, g.gd).getTime();
}

export function monthLen(y: number, m: number) { return jalaaliMonthLength(y, m); }

export function rangeFor(kind: PeriodKind, y: number, idx: number): { start: string; end: string; name: string } {
  if (kind === 'month') {
    return { start: fmt(y, idx, 1), end: fmt(y, idx, monthLen(y, idx)), name: `${MONTHS[idx - 1]} ${y}` };
  }
  if (kind === 'quarter') {
    const m1 = (idx - 1) * 3 + 1, m3 = m1 + 2;
    return { start: fmt(y, m1, 1), end: fmt(y, m3, monthLen(y, m3)), name: `${QUARTER_SHORT[idx - 1]} ${y} (Q${idx})` };
  }
  if (kind === 'half') {
    const m1 = idx === 1 ? 1 : 7, m6 = m1 + 5;
    return { start: fmt(y, m1, 1), end: fmt(y, m6, monthLen(y, m6)), name: `${HALVES[idx - 1]} ${y}` };
  }
  return { start: fmt(y, 1, 1), end: fmt(y, 12, monthLen(y, 12)), name: `سال ${y}` };
}

export function daysBetween(a: string, b: string) {
  return Math.round((toTime(b) - toTime(a)) / 86400000) + 1;
}
