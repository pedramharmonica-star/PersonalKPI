import type { DB, Engine, Direction, EvalResult, Evaluation, GroupResult, KPI, KpiResult, Settings } from './types';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const EPS = 1e-9;

export function engineOf(s: Settings, typeId: string): Engine {
  return s.measureTypes.find(t => t.id === typeId)?.engine ?? 'spectrum';
}
export function directionOf(s: Settings, behaviorId: string): Direction {
  return s.behaviors.find(b => b.id === behaviorId)?.direction ?? 'up';
}

/**
 * Linear ratio — Excel: 1-((Max-Actual)/(Max-Min))  ==  (Actual-Min)/(Max-Min)
 * For «کاهشی» behaviour the best value is Min, so the ratio is mirrored.
 */
export function ratio(k: KPI, v: number, dir: Direction): number {
  const span = k.max - k.min;
  if (Math.abs(span) < EPS) return dir === 'up' ? (v >= k.max ? 1 : 0) : (v <= k.min ? 1 : 0);
  return dir === 'up' ? (v - k.min) / span : (k.max - v) / span;
}

/** Excel: MIN(cap, IF(I<Min, 0, VLOOKUP(I, tiers, 2, TRUE))) */
export function tierScore(k: KPI, v: number, dir: Direction): number {
  const tiers = [...k.tiers].filter(t => Number.isFinite(t.from)).sort((a, b) => a.from - b.from);
  const cap = k.scoreCap ?? k.weight;
  if (!tiers.length) return 0;
  if (dir === 'up') {
    if (v < k.min) return 0;
    let hit = null as null | { from: number; score: number };
    for (const t of tiers) if (t.from <= v + EPS) hit = t;
    return hit ? Math.min(cap, hit.score) : 0;
  }
  if (v > k.max) return 0;
  const hit = tiers.find(t => t.from >= v - EPS);
  return hit ? Math.min(cap, hit.score) : 0;
}

/** Excel: IF(I>Max, (INT(I-Max)/stepSize)*stepPoints, 0) */
export function stepBonus(k: KPI, v: number, dir: Direction): number {
  if (!(k.stepSize > 0)) return 0;
  if (dir === 'up') return v > k.max ? (Math.trunc(v - k.max) / k.stepSize) * k.stepPoints : 0;
  return v < k.min ? (Math.trunc(k.min - v) / k.stepSize) * k.stepPoints : 0;
}

export function computeKpi(s: Settings, k: KPI, value: number | null | undefined, peers: number[]): KpiResult {
  const engine = engineOf(s, k.typeId);
  const dir = directionOf(s, k.behaviorId);
  const W = Number(k.weight) || 0;
  const base: KpiResult = { kpi: k, value: value ?? null, missing: value == null || !Number.isFinite(value), engine, achievement: null, raw: 0, score: 0, bonus: 0 };
  if (base.missing) {
    if (engine === 'case') base.achievementLabel = 'شاخص مثبت/منفی';
    if (engine === 'rank') base.achievementLabel = 'بهترین عملکرد';
    return base;
  }
  const v = value as number;
  const capR = s.overCap / 100;
  const bp = (k.bonusPct ?? s.bonusPct) / 100;
  let raw = 0;
  let achievement: number | null = null;
  let label: string | undefined;

  switch (engine) {
    case 'spectrum': {
      const r = ratio(k, v, dir);
      achievement = clamp(r * 100, 0, s.overCap);
      raw = clamp(r, 0, capR) * W;
      break;
    }
    case 'step': {
      const r = ratio(k, v, dir);
      achievement = clamp(r * 100, 0, s.overCap);
      raw = tierScore(k, v, dir);
      break;
    }
    case 'case': {
      label = 'شاخص مثبت/منفی';
      raw = W * v; // Excel: H * I
      break;
    }
    case 'rank': {
      label = 'بهترین عملکرد';
      const pool = peers.filter(Number.isFinite);
      const best = pool.length ? (dir === 'up' ? Math.max(...pool) : Math.min(...pool)) : v;
      let r: number;
      if (dir === 'up') r = best > 0 ? v / best : (v >= best ? 1 : 0);
      else r = v > 0 ? best / v : 1;
      achievement = clamp(r * 100, 0, 100);
      raw = clamp(r, 0, 1) * W;
      break;
    }
  }

  let score = raw, bonus = 0;
  switch (k.bonusMode) {
    case 'overflow':   // Excel AOV row: score = MIN(W, raw) ; bonus = MAX(0, raw - W)
      score = Math.min(W, raw); bonus = Math.max(0, raw - W); break;
    case 'fullFixed':  // Excel default rows: bonus = 20% W when score equals W exactly
      bonus = Math.abs(raw - W) < 1e-6 && W > 0 ? bp * W : 0; break;
    case 'reachFixed': // variant: cap score at W, bonus = 20% W when target reached
      score = Math.min(W, raw); bonus = raw >= W - 1e-6 && W > 0 ? bp * W : 0; break;
    case 'step':
      bonus = stepBonus(k, v, dir); break;
    default: break;
  }
  return { ...base, achievement, achievementLabel: label, raw, score, bonus };
}

export function computeEvaluation(db: DB, ev: Evaluation, peerMap: Map<string, number[]>): Omit<EvalResult, 'rank'> {
  const s = db.settings;
  const kpis = ev.kpis.map(k => computeKpi(s, k, ev.values[k.id], peerMap.get(k.name.trim()) ?? []));
  const groups: GroupResult[] = [];
  for (const g of s.groups) {
    const items = kpis.filter(r => r.kpi.groupId === g.id && (!s.excludeMissing || !r.missing));
    const all = kpis.filter(r => r.kpi.groupId === g.id);
    if (!all.length) continue;
    const weight = items.reduce((a, r) => a + (Number(r.kpi.weight) || 0), 0);
    const score = items.reduce((a, r) => a + r.score, 0);
    const bonus = items.reduce((a, r) => a + r.bonus, 0);
    groups.push({ group: g, weight, score, bonus, pct: weight ? (score / weight) * 100 : 0, bonusPct: weight ? (bonus / weight) * 100 : 0 });
  }
  // KPIs whose group was deleted
  const orphan = kpis.filter(r => !s.groups.some(g => g.id === r.kpi.groupId));
  if (orphan.length) {
    const weight = orphan.reduce((a, r) => a + (Number(r.kpi.weight) || 0), 0);
    const score = orphan.reduce((a, r) => a + r.score, 0);
    const bonus = orphan.reduce((a, r) => a + r.bonus, 0);
    groups.push({ group: { id: '_', name: 'بدون گروه', weight: 0, color: '#8FA9B8' }, weight, score, bonus, pct: weight ? score / weight * 100 : 0, bonusPct: weight ? bonus / weight * 100 : 0 });
  }
  const gw = groups.reduce((a, g) => a + g.group.weight, 0);
  let score: number, bonus: number;
  if (gw > 0) {
    score = groups.reduce((a, g) => a + g.pct * g.group.weight, 0) / gw;
    bonus = groups.reduce((a, g) => a + g.bonusPct * g.group.weight, 0) / gw;
  } else {
    const w = groups.reduce((a, g) => a + g.weight, 0);
    score = w ? groups.reduce((a, g) => a + g.score, 0) / w * 100 : 0;
    bonus = w ? groups.reduce((a, g) => a + g.bonus, 0) / w * 100 : 0;
  }
  const entered = kpis.filter(r => !r.missing).length;
  const completion = kpis.length ? (entered / kpis.length) * 100 : 0;
  const total = score + bonus;
  const basis = s.rankBy === 'total' ? total : score;
  const band = [...s.bands].sort((a, b) => b.min - a.min).find(b => basis >= b.min) ?? null;
  return { evaluation: ev, kpis, groups, score, bonus, total, completion, band };
}

export function computePeriod(db: DB, periodId: string): EvalResult[] {
  const evs = db.evaluations.filter(e => e.periodId === periodId && db.employees.some(p => p.id === e.employeeId));
  const peerMap = new Map<string, number[]>();
  for (const e of evs) for (const k of e.kpis) {
    const v = e.values[k.id];
    if (v == null || !Number.isFinite(v)) continue;
    const key = k.name.trim();
    if (!peerMap.has(key)) peerMap.set(key, []);
    peerMap.get(key)!.push(v);
  }
  const res = evs.map(e => computeEvaluation(db, e, peerMap));
  const key = (r: typeof res[number]) => db.settings.rankBy === 'total' ? r.total : r.score;
  const sorted = [...res].sort((a, b) => key(b) - key(a));
  return sorted.map((r) => ({ ...r, rank: sorted.findIndex(x => Math.abs(key(x) - key(r)) < 1e-9) + 1 }));
}

/** Excel conditional format: 0 red → 50 white → 120 green */
export function achColor(p: number | null, overCap = 120): string {
  if (p == null) return 'transparent';
  const lerp = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
  const red = [214, 120, 100], white = [247, 247, 244], green = [74, 170, 150];
  const c = p <= 50 ? lerp(red, white, clamp(p / 50, 0, 1)) : lerp(white, green, clamp((p - 50) / (overCap - 50), 0, 1));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
