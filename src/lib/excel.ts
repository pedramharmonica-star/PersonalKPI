import * as XLSX from 'xlsx';
import type { DB, EvalResult, Period } from './types';

const r2 = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);

export function exportPeriodExcel(db: DB, period: Period, results: EvalResult[]) {
  const wb = XLSX.utils.book_new();
  const groups = db.settings.groups;
  const summary = [...results].sort((a, b) => a.rank - b.rank).map(r => {
    const emp = db.employees.find(e => e.id === r.evaluation.employeeId);
    const row: Record<string, any> = { 'رتبه': r.rank, 'نام': emp?.name, 'سمت': emp?.title, 'روش ارزیابی': db.templates.find(t => t.id === r.evaluation.templateId)?.name };
    for (const g of r.groups) row[`${g.group.name} (٪)`] = r2(g.pct);
    row['نمره'] = r2(r.score); row['Bonus'] = r2(r.bonus); row['نمره نهایی'] = r2(r.total);
    row['سطح'] = r.band?.name ?? ''; row['تکمیل داده (٪)'] = r2(r.completion);
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(summary);
  ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, ...groups.map(() => ({ wch: 12 })), { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'خلاصه و رتبه‌بندی');

  const used = new Set<string>();
  for (const r of results) {
    const emp = db.employees.find(e => e.id === r.evaluation.employeeId);
    const rows = r.kpis.map(k => ({
      'گروه': groups.find(g => g.id === k.kpi.groupId)?.name ?? '',
      'نام شاخص': k.kpi.name,
      'نوع سنجش': db.settings.measureTypes.find(t => t.id === k.kpi.typeId)?.name ?? '',
      'دوره سنجش': k.kpi.period,
      'Min': k.kpi.min, 'Max': k.kpi.max, 'واحد': k.kpi.unit, 'وزن نهایی': k.kpi.weight,
      'مقدار فعلی': k.value,
      'درصد تحقق شاخص': k.achievement == null ? (k.missing ? '' : k.achievementLabel ?? '') : r2(k.achievement),
      'نمره کسب شده': k.missing ? null : r2(k.score),
      'Bonus': r2(k.bonus),
      'نوع رفتار': db.settings.behaviors.find(b => b.id === k.kpi.behaviorId)?.name ?? '',
      'تعریف': k.kpi.definition, 'مکانیزم محاسبه': k.kpi.mechanism, 'منبع داده': k.kpi.source,
    }));
    rows.push({} as any);
    rows.push({ 'نام شاخص': 'نمره نهایی', 'نمره کسب شده': r2(r.score), 'Bonus': r2(r.bonus), 'درصد تحقق شاخص': `جمع با Bonus: ${r2(r.total)}` } as any);
    const s = XLSX.utils.json_to_sheet(rows);
    s['!cols'] = [{ wch: 10 }, { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 10 }, { wch: 11 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 40 }, { wch: 40 }, { wch: 22 }];
    let name = (emp?.name ?? 'نفر').replace(/[\\/?*[\]:]/g, '').slice(0, 28);
    while (used.has(name)) name += '_';
    used.add(name);
    XLSX.utils.book_append_sheet(wb, s, name);
  }
  (wb as any).Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, `ارزیابی-${period.name.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`);
}
