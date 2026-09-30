import { useMemo } from 'react';
import { useStore } from './store';
import { computePeriod } from './engine';
import { toTime } from './jalali';
import type { EvalResult } from './types';

export function useResults(periodId: string | null | undefined): EvalResult[] {
  const db = useStore(s => s.db);
  return useMemo(() => (db && periodId ? computePeriod(db, periodId) : []), [db, periodId]);
}

export function useSortedPeriods() {
  const db = useStore(s => s.db);
  return useMemo(() => [...(db?.periods ?? [])].sort((a, b) => toTime(a.start) - toTime(b.start) || toTime(a.end) - toTime(b.end)), [db]);
}

export function useAllResults() {
  const db = useStore(s => s.db);
  const periods = useSortedPeriods();
  return useMemo(() => {
    const m = new Map<string, EvalResult[]>();
    if (db) for (const p of periods) m.set(p.id, computePeriod(db, p.id));
    return m;
  }, [db, periods]);
}
