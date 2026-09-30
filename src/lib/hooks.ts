import { useMemo } from 'react';
import { useStore } from './store';
import { computePeople, computeUnitPeriod } from './engine';
import { toTime } from './jalali';
import type { EvalResult, PersonResult, Unit } from './types';

export function useUnit(): Unit | null {
  const db = useStore(s => s.db);
  const unitId = useStore(s => s.unitId);
  return db?.units.find(u => u.id === unitId) ?? db?.units[0] ?? null;
}

/** KPI results of the current unit (used by the admin pages) */
export function useResults(periodId: string | null | undefined): EvalResult[] {
  const db = useStore(s => s.db);
  const unit = useUnit();
  return useMemo(() => (db && unit && periodId ? computeUnitPeriod(db, unit, periodId) : []), [db, unit, periodId]);
}

export function usePeople(periodId: string | null | undefined, unitId?: string): PersonResult[] {
  const db = useStore(s => s.db);
  return useMemo(() => (db && periodId ? computePeople(db, periodId, unitId) : []), [db, periodId, unitId]);
}

export function useSortedPeriods() {
  const db = useStore(s => s.db);
  return useMemo(() => [...(db?.periods ?? [])].sort((a, b) => toTime(a.start) - toTime(b.start) || toTime(a.end) - toTime(b.end)), [db]);
}

export function useAllPeople(unitId?: string) {
  const db = useStore(s => s.db);
  const periods = useSortedPeriods();
  return useMemo(() => {
    const m = new Map<string, PersonResult[]>();
    if (db) for (const p of periods) m.set(p.id, computePeople(db, p.id, unitId));
    return m;
  }, [db, periods, unitId]);
}

export function useAllResults() {
  const db = useStore(s => s.db);
  const unit = useUnit();
  const periods = useSortedPeriods();
  return useMemo(() => {
    const m = new Map<string, EvalResult[]>();
    if (db && unit) for (const p of periods) m.set(p.id, computeUnitPeriod(db, unit, p.id));
    return m;
  }, [db, unit, periods]);
}
