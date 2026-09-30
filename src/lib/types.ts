export type Engine = 'spectrum' | 'step' | 'case' | 'rank';
export type Direction = 'up' | 'down';
export type BonusMode = 'none' | 'overflow' | 'fullFixed' | 'reachFixed' | 'step';
export type PeriodKind = 'month' | 'quarter' | 'half' | 'year' | 'custom';
export type DimKey = 'kpi' | 'individual' | 'org';

export interface MeasureType { id: string; name: string; engine: Engine }
export interface Behavior { id: string; name: string; direction: Direction }
export interface Group { id: string; name: string; weight: number; color: string }
export interface Band { id: string; name: string; min: number; color: string }
export interface Tier { from: number; score: number }

export interface KPI {
  id: string; name: string; groupId: string; typeId: string; period: string;
  min: number; max: number; unit: string; weight: number; behaviorId: string;
  bonusMode: BonusMode; bonusPct: number | null; scoreCap: number | null;
  tiers: Tier[]; stepSize: number; stepPoints: number; tiersSample?: boolean;
  definition: string; mechanism: string; source: string;
}

export interface Template { id: string; name: string; description: string; kpis: KPI[] }

/** KPI-engine settings (per unit) — identical to v1 settings */
export interface Settings {
  orgName: string;
  overCap: number;
  bonusPct: number;
  groups: Group[];
  measureTypes: MeasureType[];
  behaviors: Behavior[];
  periodLabels: string[];
  units: string[];
  bands: Band[];
  excludeMissing: boolean;
  rankBy: 'total' | 'score';
}

/** The other two evaluation dimensions of the performance model (PDF دی ۱۴۰۴) */
export interface DimConfig {
  weights: Record<DimKey, number>;                // share of each dimension in overall score
  examTopics: string[];                           // سرفصل‌های آزمون پیام‌گستر
  passPct: number;                                // pass threshold (% of max)
  individualMix: { exam: number; competency: number };
  orgItems: { id: string; name: string }[];       // OCB questionnaire items
  missing: 'exclude' | 'zero';                    // not-entered dimension handling
}

export interface Unit {
  id: string; name: string; color: string; description: string;
  settings: Settings; templates: Template[]; dims: DimConfig; createdAt: number;
}

export interface Employee {
  id: string; unitId: string; name: string; title: string; templateId: string;
  team: string; active: boolean; note: string; photo?: string;
}

export interface Period { id: string; name: string; kind: PeriodKind; start: string; end: string; note: string; createdAt: number }

export interface ExamRecord { id: string; topic: string; score: number | null; max: number; date: string; note: string }

export interface Evaluation {
  id: string; periodId: string; employeeId: string; templateId: string;
  kpis: KPI[]; values: Record<string, number | null>;
  exams: ExamRecord[]; competency: number | null; org: Record<string, number | null>;
  note: string; updatedAt: number;
}

export interface Security { user: string; passHash: string }

export interface DB {
  version: number;
  units: Unit[];
  employees: Employee[];
  periods: Period[];
  evaluations: Evaluation[];
  security: Security;
  publishedAt?: number;
}

export interface KpiResult {
  kpi: KPI; value: number | null; missing: boolean; engine: Engine;
  achievement: number | null; achievementLabel?: string; raw: number; score: number; bonus: number;
}
export interface GroupResult { group: Group; weight: number; score: number; bonus: number; pct: number; bonusPct: number }
export interface EvalResult {
  evaluation: Evaluation; kpis: KpiResult[]; groups: GroupResult[];
  score: number; bonus: number; total: number; completion: number; band: Band | null; rank: number;
}

export interface PersonResult {
  emp: Employee; unit: Unit; ev: Evaluation; kpi: EvalResult;
  kpiPct: number;                               // KPI dimension value (per unit rankBy)
  individual: { pct: number | null; examAvg: number | null; passed: number; examCount: number; competency: number | null };
  org: { pct: number | null; items: { name: string; value: number | null }[] };
  overall: number; dimsEntered: number; band: Band | null;
  unitRank: number; orgRank: number;
}
