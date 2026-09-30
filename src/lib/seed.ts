import type { DB, KPI, Settings, Template, Tier, BonusMode, DimConfig, Unit, Employee, Evaluation } from './types';
import csData from './seed-cs.json';
import { rangeFor } from './jalali';

let c = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${(c++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const defaultSettings = (): Settings => ({
  orgName: 'واحد فروش',
  overCap: 120,
  bonusPct: 20,
  groups: [
    { id: 'g_task', name: 'وظیفه‌ای', weight: 50, color: '#EEC56A' },
    { id: 'g_team', name: 'تیمی', weight: 50, color: '#7FA3C0' },
  ],
  measureTypes: [
    { id: 't_spec', name: 'طیف', engine: 'spectrum' },
    { id: 't_step', name: 'پله', engine: 'step' },
    { id: 't_case', name: 'موردی', engine: 'case' },
    { id: 't_rank', name: 'رتبه', engine: 'rank' },
  ],
  behaviors: [
    { id: 'b_up', name: 'افزایشی', direction: 'up' },
    { id: 'b_down', name: 'کاهشی', direction: 'down' },
  ],
  periodLabels: ['ماهانه', 'فصلی', 'شش‌ماهه', 'سالانه'],
  units: ['درصد', 'مبلغ (میلیون تومان)', 'مبلغ (میلیارد تومان)', 'روز', 'دقیقه', 'تعداد'],
  bands: [
    { id: 'bd1', name: 'ممتاز', min: 90, color: '#1DB5A8' },
    { id: 'bd2', name: 'خوب', min: 75, color: '#7FA3C0' },
    { id: 'bd3', name: 'قابل قبول', min: 60, color: '#EEC56A' },
    { id: 'bd4', name: 'نیازمند بهبود', min: 0, color: '#E35D5D' },
  ],
  excludeMissing: false,
  rankBy: 'total',
});

/** Sample tiers (the «پله های فروش» sheet in the Excel is empty): 5 steps from Min to Max, 60%→100% of weight */
export function sampleTiers(min: number, max: number, weight: number): Tier[] {
  const out: Tier[] = [];
  for (let i = 0; i < 5; i++) {
    const from = +(min + ((max - min) * i) / 4).toFixed(2);
    out.push({ from, score: +(weight * (0.6 + 0.1 * i)).toFixed(2) });
  }
  return out;
}

type Row = [name: string, group: 'g_task' | 'g_team', type: 't_spec' | 't_step', period: string, min: number, max: number, unit: string, weight: number, behavior: 'b_up' | 'b_down', bonus: BonusMode, def: string, mech: string, src: string];

function mk(r: Row, key: string): KPI {
  const [name, groupId, typeId, period, min, max, unit, weight, behaviorId, bonusMode, definition, mechanism, source] = r;
  const step = typeId === 't_step';
  return {
    id: key, name, groupId, typeId, period, min, max, unit, weight, behaviorId, bonusMode,
    bonusPct: null, scoreCap: null,
    tiers: step ? sampleTiers(min, max, weight) : [],
    stepSize: step ? +((max - min) / 4).toFixed(2) : 0,
    stepPoints: step ? +(weight * 0.05).toFixed(2) : 0,
    tiersSample: step || undefined,
    definition, mechanism, source,
  };
}

const D_CONV = 'این شاخص از زمانی که کارشناس با MQL ارتباط می گیرد تا زمانی که برای او فاکتور ثبت کند، محاسبه می گردد';
const M_CONV = 'تعداد سرنخ های تایید شده (MQL) / تعداد فرصت موفق';
const QC: Row = ['امتیاز کیفی QC', 'g_task', 't_spec', 'ماهانه', 80, 100, 'درصد', 25, 'b_up', 'fullFixed', 'میزان کیفیت عملکرد کارشناس بر اساس ارزیابی QC', '؟؟؟', 'QC / CRM'];
const CSAT: Row = ['CSAT', 'g_team', 't_spec', 'ماهانه', 80, 100, 'درصد', 30, 'b_up', 'fullFixed', 'میزان رضایت مشتریان از تعامل با کارشناس', '(تعداد پاسخ ها با امتیاز 4 یا 5 / تعداد کل پاسخ های ثبت شده) * 100', 'CRM / VoIP'];

// ---- «کارشناس ارشد فروش» sheet ----
const seniorRows = (meetMin: number, meetMax: number, meetBeh: 'b_up' | 'b_down'): Row[] => [
  ['نرخ تبدیل فرصت به مشتری', 'g_task', 't_spec', 'ماهانه', 12, 20, 'درصد', 25, 'b_up', 'fullFixed', D_CONV, M_CONV, 'داشبورد (درختواره فروش)'],
  ['میانگین رقم نرم‌افزار فروخته‌شده (AOV)', 'g_task', 't_spec', 'ماهانه', 180, 225, 'مبلغ (میلیون تومان)', 25, 'b_up', 'overflow', 'میانگین مبلغ هر فاکتور فروش', 'حجم فروش / تعداد فاکتور ثبت شده', 'داشبورد RepSales'],
  QC,
  ['میانگین زمان جلسه به مشتری', 'g_task', 't_spec', 'ماهانه', meetMin, meetMax, 'روز', 25, meetBeh, 'none', 'حجم فروش فرد', 'مجموع مبالغ حاصل از  فروش نرم افزار', 'داشبورد پورسانت'],
  CSAT,
  ['فروش کل', 'g_team', 't_step', 'فصلی', 2160, 4320, 'مبلغ (میلیون تومان)', 50, 'b_up', 'step', '', '', ''],
  ['OKR', 'g_team', 't_spec', 'ماهانه', 60, 100, 'درصد', 20, 'b_up', 'none', 'درصد تحقق Objective های واحد در کوارتر مربوطه', '؟؟؟', 'TFS'],
];

// ---- «کارشناس فروش» sheet ----
const expertRows: Row[] = [
  ['نرخ تبدیل MQL به مشتری', 'g_task', 't_spec', 'ماهانه', 3, 10, 'درصد', 25, 'b_up', 'fullFixed', D_CONV, M_CONV, 'داشبورد (درختواره فروش)'],
  ['میانگین مدت زمان مکالمه', 'g_task', 't_spec', 'ماهانه', 60, 150, 'دقیقه', 25, 'b_up', 'fullFixed', 'میانگین مدت زمان مکالمات کارشناسان', 'مجموع زمان تمام مکالمات با مشتری / تعداد کل مکالمات', ''],
  QC,
  ['حجم فروش استاندارد', 'g_task', 't_step', 'ماهانه', 900, 3000, 'مبلغ (میلیون تومان)', 25, 'b_up', 'step', 'حجم فروش فرد', 'مجموع مبالغ حاصل از  فروش نرم افزار — پله‌ای شبیه پورسانت؛ زیر حداقل صفر', 'داشبورد پورسانت'],
  CSAT,
  ['فروش کل', 'g_team', 't_step', 'فصلی', 21, 43, 'مبلغ (میلیارد تومان)', 50, 'b_up', 'step', '', '', ''],
  ['OKR', 'g_team', 't_spec', 'فصلی', 60, 100, 'درصد', 20, 'b_up', 'none', 'درصد تحقق Objective های واحد در کوارتر مربوطه', '؟؟؟', 'TFS'],
];

function buildSalesUnit(): { unit: Unit; employees: Employee[]; evaluations: Evaluation[]; period: any } {
  const settings = defaultSettings();
  // Excel senior template: meeting-time Min=14, Max=1 (lower is better) → stored as «کاهشی» 1..14 (identical result)
  const tSenior: Template = { id: 'tpl_senior', name: 'کارشناس ارشد فروش', description: 'برگرفته از شیت «کارشناس ارشد فروش»', kpis: seniorRows(1, 14, 'b_down').map((r, i) => mk(r, `ks${i + 1}`)) };
  const tExpert: Template = { id: 'tpl_expert', name: 'کارشناس فروش', description: 'برگرفته از شیت «کارشناس فروش»', kpis: expertRows.map((r, i) => mk(r, `ke${i + 1}`)) };

  const r = rangeFor('month', 1404, 8);
  const period = { id: 'p_1404_08', name: r.name, kind: 'month' as const, start: r.start, end: r.end, note: 'مقادیر فعلی از فایل Sales_KPI.xlsx (آخرین آپدیت ۱۴۰۴/۰۸/۱۰)', createdAt: Date.now() };

  const people: { id: string; name: string; tpl: 'tpl_senior' | 'tpl_expert'; title: string; vals: (number | null)[] }[] = [
    { id: 'e_pourhosein', name: 'پورحسین', tpl: 'tpl_senior', title: 'کارشناس ارشد فروش', vals: [19, 194, null, 23, null, 29, null] },
    { id: 'e_shams', name: 'شمس', tpl: 'tpl_senior', title: 'کارشناس ارشد فروش', vals: [17, 173, null, 24, null, 29, null] },
    { id: 'e_nazirzadeh', name: 'نظیرزاده', tpl: 'tpl_expert', title: 'کارشناس فروش', vals: [3, 207, null, 916, null, 29, null] },
    { id: 'e_hosseini', name: 'عاطفه حسینی', tpl: 'tpl_expert', title: 'کارشناس فروش', vals: [4, 70, null, 1183, null, 29, null] },
    { id: 'e_shapourian', name: 'شکیلا شاپوریان', tpl: 'tpl_expert', title: 'کارشناس فروش', vals: [4, 105, null, 1270, null, 29, null] },
  ];

  const evaluations = people.map(p => {
    // personal senior sheets keep meeting-time as Min=14, Max=34 «افزایشی» and OKR «ماهانه» — reproduced as-is
    const kpis: KPI[] = p.tpl === 'tpl_senior'
      ? seniorRows(14, 34, 'b_up').map((r, i) => mk(r, `ks${i + 1}`))
      : tExpert.kpis.map(k => structuredClone(k));
    const values: Record<string, number | null> = {};
    kpis.forEach((k, i) => (values[k.id] = p.vals[i]));
    return { id: `ev_${p.id}_${period.id}`, periodId: period.id, employeeId: p.id, templateId: p.tpl, kpis, values, exams: [], competency: null, org: {}, note: '', updatedAt: Date.now() };
  });

  const unit: Unit = { id: 'u_sales', name: 'فروش', color: '#F26122', description: 'برگرفته از فایل Sales_KPI.xlsx', settings, templates: [tExpert, tSenior], dims: defaultDims(), createdAt: 1 };
  return {
    unit, period, evaluations,
    employees: people.map(p => ({ id: p.id, unitId: 'u_sales', name: p.name, title: p.title, templateId: p.tpl, team: 'فروش', active: true, note: '' })),
  };
}

export const defaultDims = (): DimConfig => ({
  weights: { kpi: 70, individual: 15, org: 15 },
  examTopics: ['دانش محصول پیام‌گستر', 'فرآیندها و روال‌های واحد', 'مهارت‌های تخصصی شغل'],
  passPct: 70,
  individualMix: { exam: 70, competency: 30 },
  orgItems: [{ id: 'o_ocb', name: 'پرسشنامه رفتار شهروندی سازمانی (OCB)' }],
  missing: 'exclude',
});

function buildCsUnit(): Unit {
  const settings = defaultSettings();
  settings.units = [...settings.units, 'مبلغ (تومان)', 'امتیاز', 'ساعت', 'عدد'];
  let n = 0;
  const templates: Template[] = (csData as any[]).map((t, ti) => ({
    id: `tpl_cs${ti + 1}`, name: t.name, description: 'برگرفته از فایل «شاخص های عملکردی واحد موفقیت مشتری»',
    kpis: t.rows.map((r: any): KPI => {
      const step = r.type === 't_step';
      const real = Array.isArray(r.tiers);
      const bonusMode: BonusMode = r.type === 't_spec' ? (r.name === 'OKR' ? 'none' : 'fullFixed') : 'none';
      return {
        id: `kc${++n}`, name: r.name, groupId: r.group, typeId: r.type, period: r.period, min: r.min, max: r.max, unit: r.unit,
        weight: r.weight, behaviorId: r.behavior, bonusMode, bonusPct: null, scoreCap: null,
        tiers: step ? (real ? r.tiers.map((x: number[]) => ({ from: x[0], score: x[1] })) : sampleTiers(r.min, r.max, r.weight)) : [],
        stepSize: 0, stepPoints: 0, tiersSample: step && !real ? true : undefined,
        definition: r.definition, mechanism: [r.mechanism, r.note].filter(Boolean).join(' — '), source: r.source,
      };
    }),
  }));
  return { id: 'u_cs', name: 'موفقیت مشتری', color: '#1DB5A8', description: 'برگرفته از فایل «شاخص های عملکردی واحد موفقیت مشتری»', settings, templates, dims: defaultDims(), createdAt: 2 };
}

export function buildSeed(): DB {
  const s = buildSalesUnit();
  return {
    version: 2,
    units: [s.unit, buildCsUnit()],
    employees: s.employees,
    periods: [s.period],
    evaluations: s.evaluations,
    security: { user: 'admin', passHash: '' },
  };
}
