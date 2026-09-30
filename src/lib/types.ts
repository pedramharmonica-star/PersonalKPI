export type Engine = 'spectrum' | 'step' | 'case' | 'rank';
export type Direction = 'up' | 'down';
export type BonusMode = 'none' | 'overflow' | 'fullFixed' | 'reachFixed' | 'step';
export type PeriodKind = 'month' | 'quarter' | 'half' | 'year' | 'custom';

export interface MeasureType { id: string; name: string; engine: Engine }
export interface Behavior { id: string; name: string; direction: Direction }
export interface Group { id: string; name: string; weight: number; color: string }
export interface Band { id: string; name: string; min: number; color: string }
export interface Tier { from: number; score: number }

export interface KPI {
  id: string;
  name: string;
  groupId: string;
  typeId: string;
  period: string;
  min: number;
  max: number;
  unit: string;
  weight: number;
  behaviorId: string;
  bonusMode: BonusMode;
  bonusPct: number | null;     // null = default from settings
  scoreCap: number | null;     // for step engine; null = weight
  tiers: Tier[];
  stepSize: number;            // step bonus: size of each extra step above max
  stepPoints: number;          // step bonus: points per extra step
  tiersSample?: boolean;       // tiers are auto-generated samples
  definition: string;
  mechanism: string;
  source: string;
}

export interface Template { id: string; name: string; description: string; kpis: KPI[] }

export interface Employee {
  id: string; name: string; title: string; templateId: string; team: string; active: boolean; note: string;
}

export interface Period {
  id: string; name: string; kind: PeriodKind; start: string; end: string; note: string; createdAt: number;
}

export interface Evaluation {
  id: string; periodId: string; employeeId: string; templateId: string;
  kpis: KPI[];                               // snapshot
  values: Record<string, number | null>;     // kpiId -> actual
  note: string; updatedAt: number;
}

export interface Settings {
  orgName: string;
  overCap: number;          // % cap for achievement, Excel = 120
  bonusPct: number;         // % of weight, Excel = 20
  groups: Group[];
  measureTypes: MeasureType[];
  behaviors: Behavior[];
  periodLabels: string[];
  units: string[];
  bands: Band[];
  excludeMissing: boolean;  // normalize over entered KPIs only
  rankBy: 'total' | 'score';
}

export interface DB {
  version: number;
  settings: Settings;
  templates: Template[];
  employees: Employee[];
  periods: Period[];
  evaluations: Evaluation[];
}

export interface KpiResult {
  kpi: KPI;
  value: number | null;
  missing: boolean;
  engine: Engine;
  achievement: number | null;   // %
  achievementLabel?: string;
  raw: number;
  score: number;
  bonus: number;
}

export interface GroupResult { group: Group; weight: number; score: number; bonus: number; pct: number; bonusPct: number }

export interface EvalResult {
  evaluation: Evaluation;
  kpis: KpiResult[];
  groups: GroupResult[];
  score: number;      // final 0..~
  bonus: number;
  total: number;      // score + bonus
  completion: number; // % entered
  band: Band | null;
  rank: number;
}
